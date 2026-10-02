/*
 * WeLIVE 端對端測試（Playwright）
 * 用 5 個獨立瀏覽器模擬房主、成員與觀眾，連到真正的伺服器跑完所有流程。
 *
 * 執行方式：
 *   1. npm install --save-dev playwright && npx playwright install chromium
 *   2. 另開終端機啟動伺服器：npm start
 *   3. node tests/e2e.test.js            （預設連 http://localhost:8080/）
 *      BASE_URL=http://localhost:3000/ node tests/e2e.test.js
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8080/';
const log = (...a) => console.log(...a);
let failures = 0;
const check = (cond, label) => { log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) failures++; };

async function user(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => log(`[${name}] PAGEERR`, e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|lyrics/.test(m.text())) log(`[${name}] console.error`, m.text()); });
  await p.goto(BASE);
  await p.fill('#displayNameInput', name);
  await p.click('#profileForm button');
  await p.waitForSelector('#roomsSection:not(.hidden)');
  return p;
}
const notif = (p) => p.textContent('#notification');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });

  // ================= CALL MODE + PASSWORD + CHAT + MODERATION + QUEUE =================
  const A = await user(browser, 'Ray');
  await A.fill('#newRoomName', '期末報告房');
  await A.fill('#newRoomPassword', '1234');
  await A.click('#createRoomForm button[type=submit]');
  await A.waitForSelector('#conferenceSection:not(.hidden)');
  check(/通話.*🔒/.test(await A.textContent('#roomModeBadge')), 'call room badge shows lock');

  const B = await user(browser, 'Amy');
  await B.click('#roomsList .room-item button');
  await B.waitForSelector('#passwordModal:not(.hidden)');
  check(true, 'password modal appears for private room');
  await B.fill('#joinPasswordInput', 'wrong');
  await B.click('#confirmPasswordBtn');
  await B.waitForSelector('#passwordError:not(.hidden)');
  check((await B.textContent('#passwordError')).includes('密碼錯誤'), 'wrong password rejected');
  await B.fill('#joinPasswordInput', '1234');
  await B.click('#confirmPasswordBtn');
  await B.waitForSelector('#conferenceSection:not(.hidden)');
  check(true, 'correct password joins');

  // WebRTC video both ways
  await A.waitForFunction(() => { const v = document.querySelector('.video-card:not([data-user="self"]) video'); return v && v.videoWidth > 0; }, null, { timeout: 15000 });
  await B.waitForFunction(() => { const v = document.querySelector('.video-card:not([data-user="self"]) video'); return v && v.videoWidth > 0; }, null, { timeout: 15000 });
  check(true, 'call mode: video flows both ways');

  // network badge
  await A.waitForFunction(() => { const b = document.querySelector('.video-card:not([data-user="self"]) .net-badge'); return b && /ms/.test(b.textContent); }, null, { timeout: 10000 });
  const badge = await A.$eval('.video-card:not([data-user="self"]) .net-badge', b => b.className + ' | ' + b.textContent + ' | ' + b.title);
  check(/q-good/.test(badge), 'network badge: ' + badge);

  // @mention autocomplete
  await B.click('#messageInput');
  await B.type('#messageInput', 'hi @R');
  await B.waitForSelector('#mentionSuggest:not(.hidden)');
  check((await B.textContent('#mentionSuggest')).includes('@Ray'), 'mention suggestion shows @Ray');
  await B.keyboard.press('Enter'); // select suggestion, must not send
  check((await B.inputValue('#messageInput')) === 'hi @Ray ', 'Enter picks suggestion: "' + await B.inputValue('#messageInput') + '"');
  await B.type('#messageInput', '輪到你報告了');
  await B.keyboard.press('Enter');
  await A.waitForSelector('.message.mentioned');
  check(await A.$eval('.message.mentioned .mention-me', e => e.textContent) === '@Ray', 'A sees highlighted @mention');
  check((await A.$$('#danmakuLayer .danmaku-item')).length > 0, 'danmaku item flies on A stage');
  check(/\d\d:\d\d/.test(await A.$eval('.message.mentioned .meta', e => e.textContent)), 'message has timestamp');

  // danmaku toggle off
  await A.click('#danmakuToggle');
  await B.fill('#messageInput', 'second'); await B.keyboard.press('Enter');
  await sleep(400);
  check((await A.$$('#danmakuLayer .danmaku-item')).length === 0, 'danmaku off: nothing on stage');
  await A.click('#danmakuToggle');

  // mute
  await A.click('#participantsList li:has-text("Amy") button:has-text("禁言")');
  await B.waitForFunction(() => document.getElementById('messageInput').disabled);
  check(true, 'muted user input disabled');
  await A.waitForFunction(() => document.querySelector('#participantsList').textContent.includes('🔇'), null, { timeout: 5000 }).catch(() => {});
  check((await A.textContent('#participantsList')).includes('🔇'), 'muted icon in list: ' + (await A.textContent('#participantsList')).replace(/\s+/g,' '));
  // muted user bypassing UI is still blocked by server
  await B.evaluate(() => window.app.room.sendSignal('chat', { text: 'sneaky' }));
  await sleep(400);
  check(!(await A.textContent('#messages')).includes('sneaky'), 'server blocks chat from muted user');
  await A.click('#participantsList li:has-text("Amy") button:has-text("解除禁言")');
  await B.waitForFunction(() => !document.getElementById('messageInput').disabled);
  check(true, 'unmute re-enables input');

  // KTV queue
  await B.click('.tab-btn[data-tab=queue]');
  await B.fill('#queueSongInput', '小幸運');
  await B.fill('#queueArtistInput', '田馥甄');
  await B.click('#queueAddForm button');
  await B.fill('#queueSongInput', '告白氣球');
  await B.click('#queueAddForm button');
  await A.waitForFunction(() => document.querySelector('#nowPlaying .np-title').textContent.includes('小幸運'));
  check(true, 'A sees now playing 小幸運');
  check((await A.textContent('#queueCount')) === '2', 'queue badge count 2 on A');
  await A.waitForFunction(() => document.querySelector('#prompter').textContent.length > 0, null, { timeout: 15000 });
  log('   prompter:', (await A.textContent('#prompter')).slice(0, 80).replace(/\s+/g, ' '));
  await A.click('.tab-btn[data-tab=queue]');
  await A.click('#queueNextBtn'); // host can skip
  await B.waitForFunction(() => document.querySelector('#nowPlaying .np-title').textContent.includes('告白氣球'));
  check(true, 'host skip -> 告白氣球 now playing on B');

  // transfer host then back, check it works
  await A.click('#participantsList li:has-text("Amy") button:has-text("設為房主")');
  await B.waitForFunction(() => document.querySelector('#participantsList').textContent.includes('Amy (自己) 👑'));
  check(true, 'host transferred to Amy');
  await B.click('#participantsList li:has-text("Ray") button:has-text("設為房主")');
  await A.waitForFunction(() => document.querySelector('#participantsList').textContent.includes('Ray (自己) 👑'));

  // kick (two clicks)
  await A.click('#participantsList li:has-text("Amy") .danger-btn');
  await A.click('#participantsList li:has-text("Amy") .danger-btn');
  await B.waitForSelector('#roomsSection:not(.hidden)');
  check((await notif(B)).includes('移出'), 'kicked user returned to lobby: ' + await notif(B));
  await A.waitForFunction(() => !document.querySelector('#participantsList').textContent.includes('Amy'));
  check(true, 'kicked user gone from host list');
  await B.click('#roomsList .room-item button');
  await B.fill('#joinPasswordInput', '1234');
  await B.click('#confirmPasswordBtn');
  await B.waitForFunction(() => document.getElementById('notification').textContent.includes('移出'));
  check(true, 'kicked user cannot rejoin: ' + await notif(B));

  // ================= LIVE MODE =================
  const H = await user(browser, 'DJ Ray');
  await H.click('.mode-toggle label:has-text("直播")');
  await H.fill('#newRoomName', '週五 DJ 直播');
  await H.click('#createRoomForm button[type=submit]');
  await H.waitForSelector('#conferenceSection:not(.hidden)');
  check((await H.textContent('#localContainer .label')).includes('LIVE'), 'host sees LIVE label');

  const V1 = await user(browser, 'Viewer1');
  await V1.evaluate(() => { window.__gum = 0; const o = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); navigator.mediaDevices.getUserMedia = (c) => { window.__gum++; return o(c); }; });
  await V1.waitForSelector('#roomsList .room-item:has-text("週五")');
  const rooms = await V1.textContent('#roomsList');
  check(/LIVE/.test(rooms) && /0\/30|1\/30/.test(rooms), 'lobby shows LIVE badge + capacity: ' + rooms.replace(/\s+/g, ' ').slice(0, 120));
  await V1.click('#roomsList .room-item:has-text("週五") button');
  await V1.waitForSelector('#conferenceSection:not(.hidden)');
  const V2 = await user(browser, 'Viewer2');
  await V2.click('#roomsList .room-item:has-text("週五") button');
  await V2.waitForSelector('#conferenceSection:not(.hidden)');

  for (const [p, n] of [[V1, 'V1'], [V2, 'V2']]) {
    await p.waitForFunction(() => { const v = document.querySelector('.video-card.host-video video'); return v && v.videoWidth > 0; }, null, { timeout: 15000 });
    check(true, `${n} receives host stream`);
    check(await p.$eval('#localContainer', e => e.classList.contains('hidden')), `${n} own camera tile hidden`);
    check(await p.$eval('#toggleCamera', e => e.classList.contains('hidden')), `${n} camera button hidden`);
  }
  check((await V1.evaluate(() => window.__gum)) === 0, 'viewer never asked for camera');
  check((await V1.evaluate(() => document.querySelectorAll('.video-card:not([data-user="self"])').length)) === 1, 'viewer sees only host (no viewer-to-viewer)');
  check(await H.evaluate(() => window.app.room.peers.size) === 2, 'host has 2 peer connections');
  check(await V1.evaluate(() => window.app.room.peers.size) === 1, 'viewer has 1 peer connection');
  check((await H.textContent('#viewerCount')).includes('2 位觀眾'), 'viewer count: ' + await H.textContent('#viewerCount'));
  await H.waitForFunction(() => { const b = document.querySelector('#localContainer .net-badge'); return b && b.textContent.includes('2 位觀眾'); }, null, { timeout: 10000 });
  check(true, 'host self badge summarizes viewers: ' + await H.textContent('#localContainer .net-badge'));

  // host leaves -> V1 becomes host and broadcasts to V2
  await H.click('#leaveRoomBtn');
  await V1.waitForFunction(() => window.app.room.amHost() && window.app.room.localStream, null, { timeout: 10000 });
  check(true, 'V1 promoted to host and opened camera');
  await V2.waitForFunction(() => { const v = document.querySelector('.video-card.host-video video'); return v && v.videoWidth > 0 && v.closest('.video-card').dataset.user !== ''; }, null, { timeout: 15000 });
  const v2src = await V2.$eval('.video-card.host-video', e => e.dataset.user);
  const v1id = await V1.evaluate(() => window.app.room.user.id);
  check(v2src === v1id, 'V2 now watching V1 as new broadcaster');

  // lobby after all leave
  await H.waitForSelector('#roomsSection:not(.hidden)');
  log('\nFAILURES:', failures);
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
