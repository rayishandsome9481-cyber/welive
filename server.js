const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

// 房間人數上限：視訊通話是 mesh（每個人都連每個人），人多會爆頻寬；直播只有房主往外推流
const MAX_MEMBERS = { call: 4, live: 30 };

/*
 * 房間資料：roomId -> {
 *   id, name, hostUserId, createdAt,
 *   mode: 'call' | 'live',          // 視訊通話 / 一對多直播
 *   passwordHash: string | null,    // 私人房間密碼（只存雜湊）
 *   members: Map<userId, { userId, displayName }>,
 *   tokens: Map<userId, token>,     // /join 通過後發給的通行證，WebSocket 連線要帶
 *   muted: Set<userId>,             // 被房主禁言的人
 *   banned: Set<userId>,            // 被踢出的人（不能再加入）
 *   currentPoll, songQueue: [], nowPlaying: null
 * }
 */
const rooms = new Map();
// 房間連線：roomId -> Map<userId, WebSocket>
const roomSockets = new Map();

const app = express();
app.use(cors());
app.use(express.json());
// 靜態檔案：擋掉後端程式與設定檔，避免 server.js / package.json 被直接下載
const BLOCKED_STATIC = /^\/(server\.js|package(-lock)?\.json|render\.yaml|node_modules\/|\.)/i;
app.use((req, res, next) => (BLOCKED_STATIC.test(req.path) ? res.status(404).end() : next()));
app.use(express.static(path.join(__dirname), { dotfiles: 'deny' }));

function hashPassword(pw) {
    return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

function getRoomParticipants(room, excludeUserId) {
    if (!room) return [];
    return Array.from(room.members.values()).filter(member => member.userId !== excludeUserId);
}

function publicQueueState(room) {
    return {
        nowPlaying: room.nowPlaying || null,
        queue: room.songQueue || [],
        serverNow: Date.now(),
    };
}

app.get('/api/rooms', (req, res) => {
    const list = Array.from(rooms.values()).map(room => {
        const host = room.members.get(room.hostUserId);
        return {
            id: room.id,
            name: room.name,
            hostUserId: room.hostUserId,
            hostName: host ? host.displayName : null,
            mode: room.mode,
            hasPassword: !!room.passwordHash,
            memberCount: room.members.size,
            maxMembers: MAX_MEMBERS[room.mode],
            nowPlaying: room.nowPlaying ? room.nowPlaying.song : null,
            createdAt: room.createdAt,
        };
    });
    res.json({ rooms: list });
});

app.post('/api/rooms', (req, res) => {
    const { name, userId, displayName, mode, password } = req.body || {};
    if (!name || !name.trim() || !userId || !displayName || !displayName.trim()) {
        return res.status(400).json({ message: '資料不完整' });
    }
    const roomMode = mode === 'live' ? 'live' : 'call';
    const pw = typeof password === 'string' ? password.trim() : '';

    const room = {
        id: uuidv4(),
        name: name.trim().slice(0, 48),
        hostUserId: userId,
        createdAt: new Date().toISOString(),
        mode: roomMode,
        passwordHash: pw ? hashPassword(pw) : null,
        members: new Map(),
        tokens: new Map(),
        muted: new Set(),
        banned: new Set(),
        songQueue: [],
        nowPlaying: null,
    };
    // 創建者會接著呼叫 /join 正式加入（房主不需要輸入密碼）
    rooms.set(room.id, room);
    res.status(201).json({
        room: { id: room.id, name: room.name, hostUserId: room.hostUserId, mode: room.mode, hasPassword: !!room.passwordHash },
    });
});

app.post('/api/rooms/:roomId/join', (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (!room) {
        return res.status(404).json({ message: '房間不存在' });
    }
    const { userId, displayName, password } = req.body || {};
    if (!userId || !displayName || !displayName.trim()) {
        return res.status(400).json({ message: '資料不完整' });
    }
    if (room.banned.has(userId)) {
        return res.status(403).json({ message: '你已被房主移出這個房間' });
    }
    const isHost = room.hostUserId === userId;
    if (room.passwordHash && !isHost) {
        if (!password) return res.status(401).json({ message: '這是私人房間，請輸入密碼', needPassword: true });
        if (hashPassword(String(password).trim()) !== room.passwordHash) {
            return res.status(401).json({ message: '密碼錯誤', needPassword: true });
        }
    }
    if (!room.members.has(userId) && room.members.size >= MAX_MEMBERS[room.mode]) {
        return res.status(403).json({ message: `房間已滿（上限 ${MAX_MEMBERS[room.mode]} 人）` });
    }

    const safeName = displayName.trim().slice(0, 32);
    room.members.set(userId, { userId, displayName: safeName });
    const token = crypto.randomBytes(16).toString('hex');
    room.tokens.set(userId, token);

    res.json({
        room: { id: room.id, name: room.name, hostUserId: room.hostUserId, mode: room.mode, hasPassword: !!room.passwordHash },
        participants: Array.from(room.members.values()),
        token,
    });
});

app.post('/api/rooms/:roomId/leave', (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (!room) {
        return res.status(404).json({ message: '房間不存在' });
    }
    const { userId } = req.body || {};
    if (!userId) {
        return res.status(400).json({ message: '資料不完整' });
    }

    removeMember(room, userId);
    const ws = roomSockets.get(room.id) && roomSockets.get(room.id).get(userId);
    removeSocket(room.id, userId);
    if (ws) { try { ws.close(1000, 'left'); } catch (e) { } }
    maybeCleanupRoom(room.id);

    res.json({ message: '已離開房間' });
});

app.post('/api/rooms/:roomId/transfer-host', (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (!room) {
        return res.status(404).json({ message: '房間不存在' });
    }
    const { userId, newHostUserId } = req.body || {};
    if (!userId || !newHostUserId) {
        return res.status(400).json({ message: '資料不完整' });
    }

    // 檢查是否為現任房主
    if (room.hostUserId !== userId) {
        return res.status(403).json({ message: '只有房主可以轉移房主權限' });
    }

    // 檢查新房主是否在房間中
    if (!room.members.has(newHostUserId)) {
        return res.status(400).json({ message: '新房主不在房間中' });
    }

    setHost(room, newHostUserId, userId);
    res.json({ message: '房主已轉移', hostUserId: newHostUserId });
});

function setHost(room, newHostUserId, fromUserId) {
    room.hostUserId = newHostUserId;
    // 新房主不應該還在禁言名單裡
    room.muted.delete(newHostUserId);
    broadcastToRoom(room.id, {
        type: 'host-transferred',
        newHostUserId,
        fromUserId: fromUserId || null,
    });
}

// 成員離開（主動離開、斷線、被踢）時統一呼叫
function removeMember(room, userId) {
    if (!room || !room.members.has(userId)) return;
    room.members.delete(userId);
    room.tokens.delete(userId);
    room.muted.delete(userId);
    broadcastToRoom(room.id, { type: 'user-left', userId }, userId);

    // 房主離開 → 自動把房主交給最早加入的成員
    if (room.hostUserId === userId && room.members.size > 0) {
        const next = room.members.keys().next().value;
        setHost(room, next, userId);
    }
}

// Lyrics lookup via Genius API (server-side proxy and scraper)
app.post('/api/lyrics', (req, res) => {
    const { song, artist } = req.body || {};
    if (!song || !song.trim()) return res.status(400).json({ message: '請提供歌名' });

    const token = process.env.GENIUS_API_TOKEN;

    // If no Genius token, fallback to public Lyrics API (try YouTube then Musixmatch)
    if (!token) {
        const https = require('https');
        const base = process.env.LYRICS_API_BASE || 'https://lyrics.lewdhutao.my.eu.org';

        const fetchJson = (url) => new Promise((resolve, reject) => {
            try {
                https.get(url, { headers: { 'User-Agent': 'peerchat/1.0' } }, (r) => {
                    let body = '';
                    r.on('data', (c) => body += c);
                    r.on('end', () => {
                        const ct = (r.headers && r.headers['content-type']) || '';
                        const trimmed = (body || '').trim();
                        if (ct.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
                            try {
                                const json = JSON.parse(body);
                                return resolve({ status: r.statusCode, json });
                            } catch (err) {
                                return reject(new Error('Invalid JSON from lyrics provider'));
                            }
                        }
                        // Non-JSON body (HTML or error page)
                        return reject(new Error(`Non-JSON response from lyrics provider: ${ct}`));
                    });
                }).on('error', (err) => reject(err));
            } catch (err) {
                reject(err);
            }
        });

        (async () => {
            const qSong = encodeURIComponent(song);
            const qArtist = artist ? `&artist=${encodeURIComponent(artist)}` : '';

            const tryEndpoints = [
                `${base}/v2/youtube/lyrics?title=${qSong}${qArtist}`,
                `${base}/v2/musixmatch/lyrics?title=${qSong}${qArtist}`
            ];

            for (const url of tryEndpoints) {
                try {
                    const { status, json } = await fetchJson(url);
                    if (status === 200 && json) {
                        // Expected shapes: { data: { lyrics: '...' } } or { lyrics: '...' }
                        const lyrics = (json.data && (json.data.lyrics || json.data.lyrics)) || json.lyrics || (json.data && json.data.track && json.data.track.lyrics);
                        const title = (json.data && (json.data.trackName || json.data.track_name)) || json.title || song;
                        const artistName = (json.data && (json.data.artistName || json.data.artist_name)) || json.artist || artist || null;
                        const artwork = json.data && json.data.artworkUrl;
                        if (lyrics) {
                            return res.json({ title, artist: artistName, url: url, artworkUrl: artwork || null, lyrics });
                        }
                    }
                } catch (err) {
                    console.warn('lyrics provider attempt failed', { url, err: err && err.message ? err.message : err });
                    // try next
                }
            }

            return res.status(404).json({ message: '從備援歌詞 API 找不到歌詞或服務暫不可用' });
        })();

        return;
    }

    const query = encodeURIComponent(`${song}${artist ? ' ' + artist : ''}`);
    const https = require('https');

    const options = {
        hostname: 'api.genius.com',
        path: `/search?q=${query}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'peerchat/1.0'
        }
    };

    const r = https.request(options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => data += chunk);
        resp.on('end', () => {
            try {
                const json = JSON.parse(data);
                const hits = (json.response && json.response.hits) || [];
                if (!hits.length) return res.status(404).json({ message: '找不到相符的歌曲' });

                const first = hits[0].result;
                const pathUrl = first.path; // e.g. /songs/12345-song-title
                const fullUrl = `https://genius.com${pathUrl}`;

                // Fetch the song page HTML to extract lyrics
                https.get(fullUrl, { headers: { 'User-Agent': 'peerchat/1.0' } }, (pageRes) => {
                    let html = '';
                    pageRes.on('data', (c) => html += c);
                    pageRes.on('end', () => {
                        try {
                            // Genius uses multiple <div data-lyrics-container="true"> blocks for lyrics
                            const re = /<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g;
                            let match;
                            let parts = [];
                            while ((match = re.exec(html)) !== null) {
                                parts.push(match[1]);
                            }

                            if (!parts.length) {
                                // fallback: try older .lyrics selector
                                const legacy = /<div class="lyrics">([\s\S]*?)<\/div>/g.exec(html);
                                if (legacy && legacy[1]) parts = [legacy[1]];
                            }

                            if (!parts.length) return res.status(404).json({ message: '找不到歌詞內容' });

                            // Strip tags and replace <br> with newlines
                            const stripTags = (s) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
                            const lyrics = parts.map(p => stripTags(p)).join('\n\n').trim();

                            return res.json({
                                title: first.title,
                                artist: first.primary_artist && first.primary_artist.name,
                                url: fullUrl,
                                lyrics
                            });
                        } catch (err) {
                            console.warn('Lyrics parse error', err);
                            return res.status(500).json({ message: '解析歌詞時出錯' });
                        }
                    });
                }).on('error', (err) => {
                    console.warn('Fetch song page failed', err);
                    return res.status(500).json({ message: '無法取得歌曲頁面' });
                });
            } catch (err) {
                console.warn('Genius JSON parse error', err);
                return res.status(500).json({ message: 'Genius 回傳解析失敗' });
            }
        });
    });

    r.on('error', (err) => {
        console.warn('Genius request error', err);
        res.status(500).json({ message: '無法連線到 Genius API' });
    });

    r.end();
});

app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(__dirname, 'index.html'));
    }
    next();
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

function broadcastToRoom(roomId, payload, excludeUserId) {
    const sockets = roomSockets.get(roomId);
    if (!sockets) return;
    const data = JSON.stringify(payload);
    sockets.forEach((client, userId) => {
        if (client.readyState === WebSocket.OPEN && userId !== excludeUserId) {
            client.send(data);
        }
    });
}

function forwardToTarget(roomId, targetUserId, payload) {
    const sockets = roomSockets.get(roomId);
    if (!sockets) return;
    const ws = sockets.get(targetUserId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

function removeSocket(roomId, userId) {
    const sockets = roomSockets.get(roomId);
    if (sockets) {
        sockets.delete(userId);
        if (sockets.size === 0) {
            roomSockets.delete(roomId);
        }
    }
}

function maybeCleanupRoom(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    const sockets = roomSockets.get(roomId);
    if (room.members.size === 0 && (!sockets || sockets.size === 0)) {
        rooms.delete(roomId);
    }
}

// 建好房間卻沒人進去（例如相機權限被拒）的空房間，1 分鐘後自動清掉
setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, id) => {
        if (room.members.size === 0 && now - new Date(room.createdAt).getTime() > 60 * 1000) {
            maybeCleanupRoom(id);
        }
    });
}, 30 * 1000);

// ---- 點歌佇列 ----
function cleanText(v, max) {
    return (typeof v === 'string' ? v.trim() : '').slice(0, max);
}

function startNextSong(room) {
    const next = room.songQueue.shift() || null;
    room.nowPlaying = next ? { ...next, startedAt: Date.now() } : null;
}

function broadcastQueue(room) {
    broadcastToRoom(room.id, { type: 'queue-update', ...publicQueueState(room) });
}

function addToQueue(room, { song, artist, requestedBy, singer }) {
    if (room.songQueue.length >= 50) return false;
    room.songQueue.push({
        id: uuidv4(),
        song,
        artist: artist || '',
        requestedBy,
        singer: singer || null,
        addedAt: Date.now(),
    });
    if (!room.nowPlaying) startNextSong(room);
    broadcastQueue(room);
    return true;
}

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');
    const userId = url.searchParams.get('userId');
    const token = url.searchParams.get('token');

    if (!roomId || !userId || !token) {
        ws.close(4001, 'Missing credentials');
        return;
    }

    const room = rooms.get(roomId);
    if (!room) {
        ws.close(4004, 'Room not found');
        return;
    }
    // 必須先通過 /join（密碼、黑名單、人數檢查）才能連線
    if (room.tokens.get(userId) !== token) {
        ws.close(4003, 'Not authorized');
        return;
    }
    const member = room.members.get(userId);
    const displayName = member ? member.displayName : 'Guest';

    ws.userId = userId;
    ws.roomId = roomId;
    ws.displayName = displayName;
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    if (!roomSockets.has(roomId)) {
        roomSockets.set(roomId, new Map());
    }
    // 同一個 userId 重複連線時，關掉舊的那條
    const oldWs = roomSockets.get(roomId).get(userId);
    if (oldWs && oldWs !== ws) {
        oldWs.replaced = true;
        try { oldWs.close(4000, 'Replaced'); } catch (e) { }
    }
    roomSockets.get(roomId).set(userId, ws);

    const existingParticipants = getRoomParticipants(room, userId);
    ws.send(JSON.stringify({
        type: 'room-state',
        participants: existingParticipants,
        hostUserId: room.hostUserId,
        mode: room.mode,
        muted: Array.from(room.muted),
        ...publicQueueState(room),
        currentPoll: room.currentPoll ? {
            id: room.currentPoll.id,
            question: room.currentPoll.question,
            options: room.currentPoll.options,
            counts: room.currentPoll.votes ? room.currentPoll.votes.map(s => s.size) : room.currentPoll.options.map(() => 0),
            startedBy: room.currentPoll.startedBy
        } : null
    }));

    broadcastToRoom(roomId, {
        type: 'user-joined',
        user: { userId, displayName }
    }, userId);

    const isHost = () => {
        const r = rooms.get(roomId);
        return !!r && r.hostUserId === userId;
    };
    const deny = (message) => forwardToTarget(roomId, userId, { type: 'notification', message, isError: true });

    ws.on('message', (message) => {
        let payload;
        try {
            payload = JSON.parse(message);
        } catch (e) {
            console.warn('⚠️ Invalid JSON from client, ignoring');
            return;
        }
        const roomObj = rooms.get(roomId);
        if (!roomObj || !roomObj.members.has(userId)) return;

        switch (payload.type) {
            case 'offer':
            case 'answer':
            case 'candidate':
                if (!payload.targetUserId) return;
                forwardToTarget(roomId, payload.targetUserId, {
                    ...payload,
                    from: { userId, displayName }
                });
                break;
            case 'chat': {
                const text = cleanText(payload.text, 500);
                if (!text) return;
                if (roomObj.muted.has(userId)) {
                    deny('你已被房主禁言，暫時無法發言');
                    return;
                }
                broadcastToRoom(roomId, {
                    type: 'chat',
                    text,
                    from: { userId, displayName },
                    timestamp: Date.now()
                });
                break;
            }

            // ---- 房主權限管理：禁言 / 踢人 ----
            case 'mute-user': {
                if (!isHost()) return deny('只有房主可以禁言');
                const target = payload.targetUserId;
                if (!target || target === userId || !roomObj.members.has(target)) return;
                const muted = payload.muted !== false;
                if (muted) roomObj.muted.add(target); else roomObj.muted.delete(target);
                broadcastToRoom(roomId, {
                    type: 'mute-state',
                    userId: target,
                    muted,
                    byName: displayName,
                    targetName: roomObj.members.get(target).displayName,
                });
                break;
            }
            case 'kick-user': {
                if (!isHost()) return deny('只有房主可以踢人');
                const target = payload.targetUserId;
                if (!target || target === userId || !roomObj.members.has(target)) return;
                const targetName = roomObj.members.get(target).displayName;
                roomObj.banned.add(target);
                forwardToTarget(roomId, target, { type: 'kicked', byName: displayName });
                const targetWs = roomSockets.get(roomId) && roomSockets.get(roomId).get(target);
                removeMember(roomObj, target);
                removeSocket(roomId, target);
                if (targetWs) { try { targetWs.close(4005, 'Kicked'); } catch (e) { } }
                broadcastToRoom(roomId, { type: 'user-kicked', userId: target, targetName, byName: displayName });
                break;
            }

            case 'start-poll': {
                // Only current room host may start a poll
                if (!isHost()) return deny('只有房主可以發起投票');
                const question = typeof payload.question === 'string' ? payload.question.trim() : '';
                const options = Array.isArray(payload.options) ? payload.options.map(o => (typeof o === 'string' ? o.trim() : String(o))).filter(o => o.length > 0) : [];
                if (!question || options.length < 2) return deny('請提供問題與至少兩個選項');
                // ensure single active poll per room
                if (roomObj.currentPoll) return deny('已有進行中的投票，請先結束它');
                const pollId = uuidv4();
                const votes = options.map(() => new Set());
                roomObj.currentPoll = { id: pollId, question, options, votes, startedBy: userId, startedAt: Date.now() };

                // broadcast poll start (do not include voter identities, only counts)
                broadcastToRoom(roomId, {
                    type: 'poll-started',
                    poll: { id: pollId, question, options, counts: options.map(() => 0), startedBy: userId }
                });
                return;
            }
            case 'vote': {
                if (!roomObj.currentPoll) return;
                const poll = roomObj.currentPoll;
                const optionIndex = Number.isFinite(payload.optionIndex) ? payload.optionIndex : parseInt(payload.optionIndex);
                if (poll.id !== payload.pollId) return;
                if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) return;

                // Remove any previous votes by this user, then add this vote
                poll.votes.forEach((set) => set.delete(userId));
                poll.votes[optionIndex].add(userId);

                broadcastToRoom(roomId, {
                    type: 'poll-update',
                    pollId: poll.id,
                    counts: poll.votes.map(s => s.size)
                });
                return;
            }
            case 'end-poll': {
                if (!roomObj.currentPoll) return;
                if (!isHost()) return deny('只有房主可以結束投票');
                const poll = roomObj.currentPoll;
                broadcastToRoom(roomId, {
                    type: 'poll-ended',
                    poll: { id: poll.id, question: poll.question, options: poll.options, counts: poll.votes.map(s => s.size) }
                });
                delete roomObj.currentPoll;
                return;
            }
            case 'reaction': {
                const emoji = typeof payload.emoji === 'string' ? payload.emoji.slice(0, 8) : '';
                if (!emoji) return;
                broadcastToRoom(roomId, {
                    type: 'reaction',
                    emoji,
                    from: { userId, displayName }
                });
                break;
            }

            // 白板：直接轉發給房間內「除了自己以外」的所有人
            case 'whiteboard-open':
            case 'whiteboard-draw':
            case 'whiteboard-clear': {
                broadcastToRoom(roomId, payload, userId);
                break;
            }

            // ---- 點歌（指定某人唱）----
            case 'song-request': {
                const targetUserId = payload.targetUserId;
                if (!targetUserId) return;
                forwardToTarget(roomId, targetUserId, {
                    type: 'song-request',
                    requesterName: displayName,
                    songName: cleanText(payload.songName, 100),
                    artistName: cleanText(payload.artistName, 100),
                    requesterId: userId
                });
                break;
            }
            case 'song-request-accepted': {
                broadcastToRoom(roomId, {
                    type: 'song-request-accepted',
                    responderName: displayName
                });
                // 接受點歌 → 自動排進 KTV 佇列，演唱者是自己
                const song = cleanText(payload.songName, 100);
                if (song) {
                    const requester = roomObj.members.get(payload.requesterId);
                    addToQueue(roomObj, {
                        song,
                        artist: cleanText(payload.artistName, 100),
                        requestedBy: requester ? { userId: requester.userId, displayName: requester.displayName } : { userId, displayName },
                        singer: { userId, displayName },
                    });
                }
                break;
            }
            case 'song-request-rejected': {
                broadcastToRoom(roomId, {
                    type: 'song-request-rejected',
                    responderName: displayName
                });
                break;
            }

            // ---- KTV 點歌佇列 ----
            case 'queue-add': {
                const song = cleanText(payload.song, 100);
                if (!song) return deny('請輸入歌名');
                const ok = addToQueue(roomObj, {
                    song,
                    artist: cleanText(payload.artist, 100),
                    requestedBy: { userId, displayName },
                    singer: payload.singAsSelf === false ? null : { userId, displayName },
                });
                if (!ok) deny('佇列已滿（最多 50 首）');
                break;
            }
            case 'queue-next': {
                const np = roomObj.nowPlaying;
                if (!np) return;
                const canSkip = isHost() || np.requestedBy.userId === userId || (np.singer && np.singer.userId === userId);
                if (!canSkip) return deny('只有房主、點歌者或演唱者可以切歌');
                startNextSong(roomObj);
                broadcastQueue(roomObj);
                break;
            }
            case 'queue-remove': {
                const idx = roomObj.songQueue.findIndex(s => s.id === payload.id);
                if (idx === -1) return;
                if (!isHost() && roomObj.songQueue[idx].requestedBy.userId !== userId) {
                    return deny('只能移除自己點的歌');
                }
                roomObj.songQueue.splice(idx, 1);
                broadcastQueue(roomObj);
                break;
            }

            case 'transfer-host': {
                // 這個功能通過 REST API 處理，這裡只是備用
                break;
            }
            default:
                console.warn('Unknown message type from client:', payload.type);
        }
    });

    ws.on('close', () => {
        if (ws.replaced) return; // 已被同一位使用者的新連線取代
        const sockets = roomSockets.get(roomId);
        if (sockets && sockets.get(userId) === ws) removeSocket(roomId, userId);
        const currentRoom = rooms.get(roomId);
        if (currentRoom) {
            removeMember(currentRoom, userId);
            maybeCleanupRoom(roomId);
        }
    });

    ws.on('error', (err) => {
        console.warn('⚠️ WebSocket client error:', err.message || err);
    });
});

setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            try { ws.terminate(); } catch { }
            return;
        }
        ws.isAlive = false;
        try { ws.ping(); } catch { }
    });
}, 30000);

server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
