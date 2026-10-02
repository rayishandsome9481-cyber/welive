/**
 * WeLIVE - PeerChat Application
 * Refactored for modularity and maintainability.
 */

const CONFIG = {
    ICE_SERVERS: {
        iceServers: [
            // 1. Google 的 STUN (問路用)
            { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
            
            // 2. OpenRelay 的免費 TURN (繞路/中繼用)
            // 注意：這是公開免費資源，不保證永久穩定，正式上線建議申請 Metered.ca 的免費額度
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject"
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject"
            },
            {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject"
            }
        ]
    },
    API_BASE: '',
    MAX_PARTICIPANTS: 4,          // 視訊通話上限（伺服器也會檢查）
    STATS_INTERVAL_MS: 2000,      // 網路品質偵測頻率
    DANMAKU_DURATION_MS: 8000     // 彈幕飛過畫面的時間
};

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatTime(ts) {
    const t = ts ? new Date(ts) : new Date();
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

/**
 * Manages all UI interactions and DOM updates.
 */
class UIManager {
    constructor() {
        this.elements = {};
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.elements = {
            app: document.getElementById('app'),
            profileSection: document.getElementById('profileSection'),
            profileForm: document.getElementById('profileForm'),
            displayNameInput: document.getElementById('displayNameInput'),
            currentIdentity: document.getElementById('currentIdentity'),
            currentDisplayName: document.getElementById('currentDisplayName'),
            changeNameBtn: document.getElementById('changeNameBtn'),
            roomsSection: document.getElementById('roomsSection'),
            createRoomForm: document.getElementById('createRoomForm'),
            newRoomName: document.getElementById('newRoomName'),
            roomsList: document.getElementById('roomsList'),
            conferenceSection: document.getElementById('conferenceSection'),
            roomName: document.getElementById('roomName'),
            participantsList: document.getElementById('participantsList'),
            toggleCamera: document.getElementById('toggleCamera'),
            toggleMic: document.getElementById('toggleMic'),
            leaveRoomBtn: document.getElementById('leaveRoomBtn'),
            messages: document.getElementById('messages'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            reactionButtons: document.querySelectorAll('.reactionBtn'),
            lyricsBtn: document.getElementById('lyricsBtn'),
            lyricsModal: document.getElementById('lyricsModal'),
            songInput: document.getElementById('songInput'),
            artistInput: document.getElementById('artistInput'),
            searchLyricsBtn: document.getElementById('searchLyricsBtn'),
            cancelLyricsBtn: document.getElementById('cancelLyricsBtn'),
            startPollBtn: document.getElementById('startPollBtn'),
            pollContainer: document.getElementById('pollContainer'),
            pollModal: document.getElementById('pollModal'),
            pollQuestionInput: document.getElementById('pollQuestionInput'),
            pollMultipleChoice: document.getElementById('pollMultipleChoice'),
            pollOptionsContainer: document.getElementById('pollOptionsContainer'),
            addPollOptionBtn: document.getElementById('addPollOptionBtn'),
            pollOption1: document.getElementById('pollOption1'),
            pollOption2: document.getElementById('pollOption2'),
            pollOption3: document.getElementById('pollOption3'),
            createPollBtn: document.getElementById('createPollBtn'),
            cancelPollBtn: document.getElementById('cancelPollBtn'),
            prompterSpeed: document.getElementById('prompterSpeed'),
            clearPrompterBtn: document.getElementById('clearPrompterBtn'),
            shareScreenBtn: document.getElementById('shareScreenBtn'),
            recordScreenBtn: document.getElementById('recordScreenBtn'),
            recordingIndicator: document.getElementById('recordingIndicator'),
            requestSongBtn: document.getElementById('requestSongBtn'),
            songRequestModal: document.getElementById('songRequestModal'),
            songRequestTarget: document.getElementById('songRequestTarget'),
            requestSongName: document.getElementById('requestSongName'),
            requestSongArtist: document.getElementById('requestSongArtist'),
            confirmSongRequestBtn: document.getElementById('confirmSongRequestBtn'),
            cancelSongRequestBtn: document.getElementById('cancelSongRequestBtn'),
            songRequestNotification: document.getElementById('songRequestNotification'),
            songRequestContent: document.getElementById('songRequestContent'),
            acceptSongRequestBtn: document.getElementById('acceptSongRequestBtn'),
            rejectSongRequestBtn: document.getElementById('rejectSongRequestBtn'),
            localVideo: document.getElementById('localVideo'),
            remoteGrid: document.getElementById('remoteGrid'),
            stage: document.getElementById('stage'),
            notification: document.getElementById('notification'),
            localContainer: document.getElementById('localContainer'),
            whiteboardBtn: document.getElementById('whiteboardBtn'),
            whiteboardModal: document.getElementById('whiteboardModal'),
            whiteboardCanvas: document.getElementById('whiteboardCanvas'),
            colorBtns: document.querySelectorAll('.color-btn'),
            clearBoardBtn: document.getElementById('clearBoardBtn'),
            closeWhiteboardBtn: document.getElementById('closeWhiteboardBtn'),
            // 新功能
            newRoomPassword: document.getElementById('newRoomPassword'),
            roomModeBadge: document.getElementById('roomModeBadge'),
            viewerCount: document.getElementById('viewerCount'),
            controls: document.getElementById('controls'),
            mentionSuggest: document.getElementById('mentionSuggest'),
            danmakuLayer: document.getElementById('danmakuLayer'),
            danmakuToggle: document.getElementById('danmakuToggle'),
            tabButtons: document.querySelectorAll('.sidebar-tabs .tab-btn'),
            chatPanel: document.getElementById('chat'),
            queuePanel: document.getElementById('queuePanel'),
            queueCount: document.getElementById('queueCount'),
            nowPlaying: document.getElementById('nowPlaying'),
            queueList: document.getElementById('queueList'),
            queueAddForm: document.getElementById('queueAddForm'),
            queueSongInput: document.getElementById('queueSongInput'),
            queueArtistInput: document.getElementById('queueArtistInput'),
            queueNextBtn: document.getElementById('queueNextBtn'),
            autoScrollBtn: document.getElementById('autoScrollBtn'),
            scrollSpeed: document.getElementById('scrollSpeed'),
            passwordModal: document.getElementById('passwordModal'),
            passwordModalRoom: document.getElementById('passwordModalRoom'),
            joinPasswordInput: document.getElementById('joinPasswordInput'),
            passwordError: document.getElementById('passwordError'),
            confirmPasswordBtn: document.getElementById('confirmPasswordBtn'),
            cancelPasswordBtn: document.getElementById('cancelPasswordBtn')
        };
    }

    bindEvents() {
        // Events will be delegated to the App controller
    }
    bindLyricsEvents() {
        const elems = this.elements;
        if (!elems) return;
        if (elems.lyricsBtn) {
            elems.lyricsBtn.addEventListener('click', () => {
                if (elems.lyricsModal) elems.lyricsModal.classList.remove('hidden');
            });
        }
        if (elems.cancelLyricsBtn) {
            elems.cancelLyricsBtn.addEventListener('click', () => {
                if (elems.lyricsModal) elems.lyricsModal.classList.add('hidden');
                if (elems.songInput) elems.songInput.value = '';
                if (elems.artistInput) elems.artistInput.value = '';
                this.resetPrompter();
            });
        }

        if (elems.clearPrompterBtn) {
            elems.clearPrompterBtn.addEventListener('click', () => {
                this.resetPrompter();
            });
        }

        if (elems.searchLyricsBtn) {
            elems.searchLyricsBtn.addEventListener('click', () => {
                const song = elems.songInput ? elems.songInput.value.trim() : '';
                const artist = elems.artistInput ? elems.artistInput.value.trim() : '';
                if (!song) {
                    this.showNotification('請輸入歌名', true);
                    return;
                }
                this.fetchAndDisplayLyrics(song, artist);
            });
        }
    }

    fetchAndDisplayLyrics(song, artist, options = {}) {
        const silent = !!options.silent; // KTV 佇列自動載入：不要彈出歌詞視窗
        const elems = this.elements;
        // Call server-side lyrics endpoint (uses Genius API)
        const resultEl = document.getElementById('lyricsResult');
        if (resultEl) {
            resultEl.classList.remove('hidden');
            resultEl.textContent = '搜尋中…';
        }

        // If triggered from song request, we might want to show the modal if it's hidden
        if (!silent && elems.lyricsModal && elems.lyricsModal.classList.contains('hidden')) {
            elems.lyricsModal.classList.remove('hidden');
        }
        // Fill inputs if empty (or overwrite if we want to show what's playing)
        if (elems.songInput) elems.songInput.value = song;
        if (elems.artistInput) elems.artistInput.value = artist || '';

        if (!silent) this.stopAutoScroll();
        return fetch(`${CONFIG.API_BASE}/api/lyrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song, artist })
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || '搜尋失敗');
            }
            return res.json();
        }).then(data => {
            if (!resultEl) return;
            const title = data.title || song;
            const artistName = data.artist || artist || '';
            const headerText = `${title}${artistName ? ' — ' + artistName : ''}`;

            const lyricsText = data.lyrics || '';
            const rawLines = lyricsText.split(/\r?\n/);
            // remove purely empty / whitespace-only lines to avoid blank rows
            const filtered = rawLines.map(l => (l || '')).filter(l => l.trim().length > 0);
            const lines = filtered.length > 0 ? filtered : ['(無歌詞)'];

            // Render Right Panel (Full Lyrics)
            resultEl.innerHTML = '';
            const headerDiv = document.createElement('div');
            headerDiv.classList.add('lyrics-header');
            headerDiv.textContent = headerText;
            resultEl.appendChild(headerDiv);

            const linesContainer = document.createElement('div');
            linesContainer.classList.add('lyrics-lines-container');

            this.resultLines = [];
            this.resultLineClickHandlers = [];

            lines.forEach((line, idx) => {
                const p = document.createElement('p');
                p.textContent = line;
                p.classList.add('lyrics-line');
                // click to jump
                const handler = () => this.jumpToIndex(idx);
                p.addEventListener('click', handler);
                this.resultLineClickHandlers.push({ el: p, handler });

                linesContainer.appendChild(p);
                this.resultLines.push(p);
            });
            resultEl.appendChild(linesContainer);

            // Render Teleprompter (Left Panel)
            const prompter = document.getElementById('prompter');
            if (prompter) {
                prompter.innerHTML = '';
                prompter.removeAttribute('aria-hidden');
                this.prompterLines = [];
                this.prompterLineClickHandlers = [];

                // Spacer top
                const spacerTop = document.createElement('div');
                spacerTop.style.height = '50%'; // Push first content to center
                prompter.appendChild(spacerTop);

                lines.forEach((line, idx) => {
                    const div = document.createElement('div');
                    div.classList.add('prompter-line');
                    div.textContent = line;
                    // click to jump
                    const handler = (e) => {
                        e.stopPropagation(); // prevent container click
                        this.jumpToIndex(idx);
                    };
                    div.addEventListener('click', handler);
                    this.prompterLineClickHandlers.push({ el: div, handler });

                    prompter.appendChild(div);
                    this.prompterLines.push(div);
                });

                // Spacer bottom
                const spacerBottom = document.createElement('div');
                spacerBottom.style.height = '50%';
                prompter.appendChild(spacerBottom);

                // Hint
                const hint = document.createElement('div');
                hint.classList.add('prompter-hint');
                hint.textContent = '點擊畫面或按空白鍵換行';
                prompter.appendChild(hint);
                this.prompterHint = hint;

                // Click anywhere in prompter to advance
                if (this.prompterClickHandler) prompter.removeEventListener('click', this.prompterClickHandler);
                this.prompterClickHandler = this.advancePrompter.bind(this);
                prompter.addEventListener('click', this.prompterClickHandler);

                // Mouse wheel to scroll
                if (this.prompterWheelHandler) prompter.removeEventListener('wheel', this.prompterWheelHandler);
                this.prompterWheelHandler = this.handlePrompterWheel.bind(this);
                prompter.addEventListener('wheel', this.prompterWheelHandler, { passive: false });
            }

            // Show controls
            const clearBtn = document.getElementById('clearPrompterBtn');
            if (clearBtn && !silent) clearBtn.classList.remove('hidden'); // KTV 歌詞由佇列控制，不顯示清除鈕

            // Reset state
            this.prompterIndex = -1;
            this.jumpToIndex(0);

            // KTV：在提詞機左上角標示正在唱的歌
            if (silent && prompter) {
                const tag = document.createElement('div');
                tag.className = 'prompter-now';
                tag.textContent = `🎤 ${headerText}`;
                prompter.appendChild(tag);
            }

            // Close the lyrics modal on success
            if (!silent && elems.lyricsModal) elems.lyricsModal.classList.add('hidden');
            return true;

        }).catch(err => {
            console.error(err);
            if (resultEl) resultEl.textContent = '找不到歌詞 (' + err.message + ')';
            if (silent) {
                this.showPrompterMessage(`🎤 ${song}${artist ? ' — ' + artist : ''}`, '找不到這首歌的歌詞，直接開唱吧！');
            } else {
                this.showNotification('找不到歌詞', true);
            }
            return false;
        });
    }

    showPrompterMessage(title, sub) {
        this.resetPrompter();
        const prompter = document.getElementById('prompter');
        if (!prompter) return;
        prompter.removeAttribute('aria-hidden');
        const box = document.createElement('div');
        box.className = 'prompter-message';
        const t = document.createElement('div');
        t.className = 'prompter-message-title';
        t.textContent = title;
        const d = document.createElement('div');
        d.textContent = sub;
        box.appendChild(t);
        box.appendChild(d);
        prompter.appendChild(box);
    }

    /* ---------- KTV 歌詞自動捲動 ---------- */
    // anchorTime 時顯示第 anchorIndex 行，之後每 lineMs 前進一行。
    // 用伺服器的開始時間當錨點，所以每個人看到的歌詞位置會同步。
    // synced = true：錨點是「歌曲開始時間」，同速度的人永遠在同一行；手動暫停後再繼續就變成各自的進度
    startAutoScroll(anchorTime, anchorIndex = 0, synced = false) {
        this.stopAutoScroll();
        if (!this.prompterLines || !this.prompterLines.length) return;
        const lineMs = Number(this.elements.scrollSpeed && this.elements.scrollSpeed.value) || 3500;
        this.autoScroll = { running: true, lineMs, anchorTime, anchorIndex, synced };
        const tick = () => {
            if (!this.autoScroll || !this.autoScroll.running) return;
            const a = this.autoScroll;
            const idx = a.anchorIndex + Math.floor(Math.max(0, Date.now() - a.anchorTime) / a.lineMs);
            if (idx !== this.prompterIndex) this.jumpToIndex(idx, true);
        };
        tick();
        this.autoScrollTimer = setInterval(tick, 250);
        this.updateAutoScrollButton();
    }

    stopAutoScroll() {
        if (this.autoScrollTimer) clearInterval(this.autoScrollTimer);
        this.autoScrollTimer = null;
        if (this.autoScroll) this.autoScroll.running = false;
        this.updateAutoScrollButton();
    }

    toggleAutoScroll() {
        if (this.autoScroll && this.autoScroll.running) {
            this.stopAutoScroll();
        } else if (this.prompterLines && this.prompterLines.length) {
            // 從目前這行繼續
            this.startAutoScroll(Date.now(), Math.max(0, this.prompterIndex));
        }
    }

    updateAutoScrollButton() {
        const btn = this.elements.autoScrollBtn;
        if (!btn) return;
        const hasLyrics = !!(this.prompterLines && this.prompterLines.length);
        btn.disabled = !hasLyrics;
        btn.textContent = (this.autoScroll && this.autoScroll.running) ? '⏸ 暫停捲動' : '▶ 自動捲動';
    }

    /* Poll UI handling */
    bindPollEvents() {
        const elems = this.elements;
        if (!elems) return;
        if (elems.startPollBtn) {
            elems.startPollBtn.addEventListener('click', () => {
                if (elems.pollModal) elems.pollModal.classList.remove('hidden');
            });
        }

        if (elems.addPollOptionBtn) {
            elems.addPollOptionBtn.addEventListener('click', () => {
                if (elems.pollOptionsContainer) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'poll-option-wrapper';
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'poll-option-input';
                    input.placeholder = '________';
                    input.maxLength = '120';
                    wrapper.appendChild(input);
                    elems.pollOptionsContainer.appendChild(wrapper);
                }
            });
        }

        if (elems.cancelPollBtn) {
            elems.cancelPollBtn.addEventListener('click', () => {
                if (elems.pollModal) elems.pollModal.classList.add('hidden');
                this.clearPollForm();
            });
        }
    }

    clearPollForm() {
        const elems = this.elements;
        if (!elems) return;
        if (elems.pollQuestionInput) elems.pollQuestionInput.value = '';
        if (elems.pollMultipleChoice) elems.pollMultipleChoice.checked = false;
        // Clear all option inputs
        const optionInputs = document.querySelectorAll('.poll-option-input');
        optionInputs.forEach(input => input.value = '');
        // Remove extra options beyond the first 3
        if (elems.pollOptionsContainer) {
            const wrappers = elems.pollOptionsContainer.querySelectorAll('.poll-option-wrapper');
            for (let i = wrappers.length - 1; i >= 3; i--) {
                wrappers[i].remove();
            }
        }
    }

    /* Song request UI handling */
    bindSongRequestEvents(currentParticipants) {
        const elems = this.elements;
        if (!elems) return;

        if (elems.requestSongBtn) {
            elems.requestSongBtn.addEventListener('click', () => {
                // Show a dropdown or modal to select who to request song from
                if (currentParticipants && currentParticipants.length > 0) {
                    this.showSongRequestModal(currentParticipants);
                } else {
                    this.showNotification('沒有其他成員在線', true);
                }
            });
        }
        // 重新修改 main.js 中的 confirmSongRequestBtn 事件監聽器
        if (elems.confirmSongRequestBtn) {
            // 避免重複綁定，先移除舊的
            const newBtn = elems.confirmSongRequestBtn.cloneNode(true);
            elems.confirmSongRequestBtn.parentNode.replaceChild(newBtn, elems.confirmSongRequestBtn);
            elems.confirmSongRequestBtn = newBtn;

            elems.confirmSongRequestBtn.addEventListener('click', () => {
                // 從下拉選單取得點歌對象
                const targetUserId = elems.songRequestTarget ? elems.songRequestTarget.value : '';

                const songName = elems.requestSongName.value.trim(); // 取得歌名
                const artist = elems.requestSongArtist.value.trim(); // 取得歌手

                if (!songName) {
                    this.showNotification('請輸入歌名', true);
                    return;
                }
                if (!targetUserId) {
                    this.showNotification('請選擇要請誰唱', true);
                    return;
                }

                // 選「我自己唱」→ 直接排進 KTV 佇列，不用等對方確認
                if (targetUserId === '__self__') {
                    window.app.room.sendSignal('queue-add', { song: songName, artist });
                    this.showNotification(`已點歌：${songName}`);
                    elems.songRequestModal.classList.add('hidden');
                    elems.requestSongName.value = '';
                    elems.requestSongArtist.value = '';
                    return;
                }
                const target = (this.currentParticipants || []).find(p => p.userId === targetUserId);
                if (!target) {
                    this.showNotification('對方已經不在房間了', true);
                    this.showSongRequestModal(this.currentParticipants);
                    return;
                }

                // *** 關鍵修改：使用 window.app.room.sendSignal ***
                if (window.app && window.app.room) {
                    window.app.room.sendSignal('song-request', {
                        targetUserId: targetUserId,
                        requesterName: window.app.room.user ? window.app.room.user.displayName : 'Unknown',
                        songName: songName,
                        artistName: artist
                    });

                    this.showNotification(`已請 ${target.displayName} 唱：${songName}，等待對方確認`);

                    // 關閉視窗並清空
                    elems.songRequestModal.classList.add('hidden');
                    elems.requestSongName.value = '';
                    elems.requestSongArtist.value = '';
                } else {
                    console.error('App or RoomManager not defined.');
                    this.showNotification('系統錯誤：無法發送請求', true);
                }
            });
        }
        if (elems.cancelSongRequestBtn) {
            elems.cancelSongRequestBtn.addEventListener('click', () => {
                if (elems.songRequestModal) elems.songRequestModal.classList.add('hidden');
            });
        }

        if (elems.rejectSongRequestBtn) {
            elems.rejectSongRequestBtn.addEventListener('click', () => {
                if (elems.songRequestNotification) elems.songRequestNotification.classList.add('hidden');
            });
        }

        if (elems.acceptSongRequestBtn) {
            elems.acceptSongRequestBtn.addEventListener('click', () => {
                if (this.pendingSongRequest) {
                    // 接受後伺服器會把歌排進 KTV 佇列，輪到時自動顯示歌詞
                    this.showNotification(`已接受點歌：${this.pendingSongRequest.songName}，已加入點歌佇列`);
                }
                if (elems.songRequestNotification) elems.songRequestNotification.classList.add('hidden');
            });
        }
    }

    showSongRequestModal(participants) {
        const elems = this.elements;
        if (!elems || !elems.songRequestModal) return;

        if (elems.requestSongName) elems.requestSongName.value = '';
        if (elems.requestSongArtist) elems.requestSongArtist.value = '';

        // 建立點歌對象下拉選單：房間內其他成員 + 我自己唱
        const select = elems.songRequestTarget;
        if (select) {
            const prev = select.value;
            select.innerHTML = '';
            (participants || []).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.userId;
                opt.textContent = `🎤 ${p.displayName}`;
                select.appendChild(opt);
            });
            const self = document.createElement('option');
            self.value = '__self__';
            self.textContent = '🙋 我自己唱（直接加入佇列）';
            select.appendChild(self);
            if (prev && [...select.options].some(o => o.value === prev)) select.value = prev;
        }

        elems.songRequestModal.classList.remove('hidden');
        setTimeout(() => elems.requestSongName && elems.requestSongName.focus(), 50);
    }

    showSongRequestNotification(requesterName, songName, artistName, requesterId) {
        const elems = this.elements;
        if (!elems || !elems.songRequestNotification) return;

        // Store pending request details
        this.pendingSongRequest = { requesterName, songName, artistName, requesterId };

        if (elems.songRequestContent) {
            elems.songRequestContent.innerHTML = `<h4>${escapeHtml(requesterName)} 希望你唱 <strong>${escapeHtml(songName)}</strong>${artistName ? ' (' + escapeHtml(artistName) + ')' : ''}</h4>`;
        }
        elems.songRequestNotification.classList.remove('hidden');
    }

    showSongAlreadySinging() {
        this.showNotification('對方正在開嗓', true);
    }

    renderPoll(poll, isHost, counts) {
        const container = this.elements.pollContainer;
        if (!container) return;
        container.innerHTML = '';
        container.classList.remove('hidden');

        // close button (top-right)
        const closeBtn = document.createElement('button');
        closeBtn.className = 'poll-close';
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.title = '關閉';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '8px';
        closeBtn.style.top = '6px';
        closeBtn.style.background = 'transparent';
        closeBtn.style.border = 'none';
        closeBtn.style.color = 'var(--text-primary)';
        closeBtn.style.fontSize = '18px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); this.clearPollDisplay(); });
        container.appendChild(closeBtn);

        // Make window draggable by the title (.poll-question)
        // Clean up any previous handlers
        try {
            if (container._dragCleanup) {
                container._dragCleanup();
                container._dragCleanup = null;
            }
        } catch (e) { }

        const titleEl = container.querySelector('.poll-question');
        let isDragging = false;
        let startX = 0, startY = 0;
        let origLeft = 0, origTop = 0;

        const toNumber = (v) => parseFloat(v) || 0;

        const onMouseMove = (ev) => {
            if (!isDragging) return;
            const clientX = ev.type.startsWith('touch') ? ev.touches[0].clientX : ev.clientX;
            const clientY = ev.type.startsWith('touch') ? ev.touches[0].clientY : ev.clientY;
            const dx = clientX - startX;
            const dy = clientY - startY;
            container.style.left = (origLeft + dx) + 'px';
            container.style.top = (origTop + dy) + 'px';
            // remove centering transform while moving
            container.style.transform = 'translate(0, 0)';
            container.classList.add('dragging');
        };

        const onMouseUp = (ev) => {
            if (!isDragging) return;
            isDragging = false;
            container.classList.remove('dragging');
            // store final position
            try { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); } catch (e) { }
            try { document.removeEventListener('touchmove', onMouseMove); document.removeEventListener('touchend', onMouseUp); } catch (e) { }
        };

        const onMouseDown = (ev) => {
            // don't start drag when clicking buttons/inputs
            if (ev.target && (ev.target.tagName === 'BUTTON' || ev.target.tagName === 'INPUT')) return;
            isDragging = true;
            const rect = container.getBoundingClientRect();
            startX = ev.type.startsWith('touch') ? ev.touches[0].clientX : ev.clientX;
            startY = ev.type.startsWith('touch') ? ev.touches[0].clientY : ev.clientY;
            // current left/top in pixels; if using transform centering, compute center-based coords
            // If style.left/top not set (centered), compute origLeft/origTop as center position
            const leftStyle = window.getComputedStyle(container).left;
            const topStyle = window.getComputedStyle(container).top;
            if (leftStyle && leftStyle !== 'auto') origLeft = toNumber(leftStyle);
            else origLeft = rect.left;
            if (topStyle && topStyle !== 'auto') origTop = toNumber(topStyle);
            else origTop = rect.top;

            // set explicit position to avoid flicker
            container.style.left = origLeft + 'px';
            container.style.top = origTop + 'px';
            container.style.transform = 'translate(0, 0)';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchmove', onMouseMove, { passive: false });
            document.addEventListener('touchend', onMouseUp);
        };

        if (titleEl) {
            titleEl.style.cursor = 'grab';
            titleEl.addEventListener('mousedown', onMouseDown);
            titleEl.addEventListener('touchstart', onMouseDown, { passive: false });
            // store cleanup to remove listeners later
            container._dragCleanup = () => {
                try { titleEl.removeEventListener('mousedown', onMouseDown); titleEl.removeEventListener('touchstart', onMouseDown); } catch (e) { }
                try { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); } catch (e) { }
                try { document.removeEventListener('touchmove', onMouseMove); document.removeEventListener('touchend', onMouseUp); } catch (e) { }
                container.classList.remove('dragging');
            };
        }

        const title = document.createElement('div');
        title.className = 'poll-question';
        title.textContent = poll.question;
        container.appendChild(title);

        const list = document.createElement('div');
        list.className = 'poll-options';
        poll.options.forEach((opt, idx) => {
            const row = document.createElement('div');
            row.className = 'poll-option-row';

            const btn = document.createElement('button');
            btn.className = 'poll-option';
            btn.type = 'button';
            btn.dataset.index = idx;
            btn.textContent = opt;

            const countSpan = document.createElement('span');
            countSpan.className = 'poll-count';
            countSpan.textContent = (counts && counts[idx] != null) ? String(counts[idx]) : '0';

            row.appendChild(btn);
            row.appendChild(countSpan);
            list.appendChild(row);
        });
        container.appendChild(list);

        const actions = document.createElement('div');
        actions.className = 'poll-actions';
        if (isHost) {
            const endBtn = document.createElement('button');
            endBtn.id = 'endPollBtn';
            endBtn.type = 'button';
            endBtn.textContent = '結束投票';
            actions.appendChild(endBtn);
        }
        const info = document.createElement('div');
        info.className = 'poll-info';
        info.textContent = '點選選項以投票';
        actions.appendChild(info);

        container.appendChild(actions);
    }

    updatePollCounts(counts) {
        const container = this.elements.pollContainer;
        if (!container) return;
        const countEls = container.querySelectorAll('.poll-count');
        countEls.forEach((el, idx) => {
            if (counts && counts[idx] != null) el.textContent = String(counts[idx]);
        });
    }

    clearPollDisplay() {
        const container = this.elements.pollContainer;
        if (!container) return;
        // remove drag handlers if present
        try {
            if (container._dragCleanup) {
                container._dragCleanup();
                container._dragCleanup = null;
            }
        } catch (e) { }
        container.innerHTML = '';
        container.classList.add('hidden');
        // reset centering so next open starts centered
        container.style.left = '';
        container.style.top = '';
        container.style.transform = 'translate(-50%, -50%)';
    }

    showNotification(message, isError = false) {
        const notif = this.elements.notification;

        notif.textContent = message;
        notif.style.backgroundColor = isError ? 'rgba(255, 77, 79, 0.95)' : '#3C3453';
        notif.classList.remove('hidden');

        if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            notif.classList.add('hidden');
        }, 3000);

    }

    advancePrompter() {
        // advance one line (used by container click)
        if (!this.prompterLines || !this.prompterLines.length) return;
        if (this.autoScroll && this.autoScroll.running) this.stopAutoScroll(); // 手動換行時暫停自動捲動
        // remove previous highlight
        if (this.prompterLines[this.prompterIndex]) this.prompterLines[this.prompterIndex].classList.remove('prompter-current');
        this.prompterIndex++;
        if (this.prompterIndex >= this.prompterLines.length) {
            // clamp to last
            this.prompterIndex = this.prompterLines.length - 1;
            if (this.prompterLines[this.prompterIndex]) this.prompterLines[this.prompterIndex].classList.add('prompter-current');
            // hide stop button and show clear
            const elems = this.elements;
            if (this.prompterHint) this.prompterHint.classList.add('hidden');
            if (elems.stopPrompterBtn) elems.stopPrompterBtn.classList.add('hidden');
            if (elems.clearPrompterBtn) elems.clearPrompterBtn.classList.remove('hidden');
            return;
        }
        const node = this.prompterLines[this.prompterIndex];
        if (node) node.classList.add('prompter-current');
        try { node.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { }
        this.syncResultToIndex(this.prompterIndex);
    }

    handlePrompterWheel(e) {
        e.preventDefault();
        const now = Date.now();
        if (now - (this.lastWheelTime || 0) < 60) return; // Throttle 60ms
        this.lastWheelTime = now;

        if (e.deltaY > 0) {
            // Scroll down -> next
            this.jumpToIndex(this.prompterIndex + 1);
        } else if (e.deltaY < 0) {
            // Scroll up -> prev
            this.jumpToIndex(this.prompterIndex - 1);
        }
    }

    syncResultToIndex(index) {
        const resultEl = document.getElementById('lyricsResult');
        if (!resultEl || !this.resultLines || !this.resultLines.length) return;
        // ensure resultLines is an array
        if (!Array.isArray(this.resultLines)) this.resultLines = Array.from(this.resultLines || []);
        const i = Math.max(0, Math.min(index, this.resultLines.length - 1));
        console.debug('[syncResultToIndex] syncing index', i, 'of', this.resultLines.length);
        this.resultLines.forEach(n => n.classList && n.classList.remove('lyrics-current'));
        const resNode = this.resultLines[i];
        if (!resNode) return;
        resNode.classList.add('lyrics-current');
        // place the target line at the top of the result viewport (just below header)
        try {
            const header = resultEl.querySelector('.lyrics-header');
            const headerHeight = header ? header.offsetHeight : 0;
            // offsetTop of resNode is relative to its offsetParent (the lines container)
            // We want the scrollTop value that places the line immediately below the header
            const top = Math.max(0, headerHeight + (resNode.offsetTop || 0));
            console.debug('[syncResultToIndex] placing line at top, top=', top);
            resultEl.scrollTo({ top, behavior: 'auto' });
        } catch (e) {
            console.warn('syncResultToIndex fallback scroll', e);
            const header = resultEl.querySelector('.lyrics-header');
            const headerHeight = header ? header.offsetHeight : 0;
            const top = headerHeight + resNode.offsetTop;
            resultEl.scrollTo({ top, behavior: 'auto' });
        }
    }

    jumpToIndex(index, fromAuto = false) {
        // Jump prompter and result to a specific line index
        if (!Number.isFinite(index)) return;
        if (!this.prompterLines || !this.prompterLines.length) return;
        if (!fromAuto && this.autoScroll && this.autoScroll.running) this.stopAutoScroll();
        if (fromAuto && index >= this.prompterLines.length) { this.stopAutoScroll(); return; } // 唱完了
        const i = Math.max(0, Math.min(index, this.prompterLines.length - 1));
        // remove previous
        this.prompterLines.forEach(n => n.classList && n.classList.remove('prompter-current'));
        // set current
        const node = this.prompterLines[i];
        if (node) node.classList.add('prompter-current');
        this.prompterIndex = i;
        // ensure visible in prompter (center)
        try { node && node.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { }
        // sync right-side
        this.syncResultToIndex(i);
        // show/hide hint: keep hint visible except when at last line
        if (this.prompterHint) {
            if (i >= this.prompterLines.length - 1) this.prompterHint.classList.add('hidden');
            else this.prompterHint.classList.remove('hidden');
        }

        // ensure container click handler is attached (defensive)
        try {
            const prompterEl = document.getElementById('prompter');
            if (prompterEl && !this.prompterClickHandler) {
                this.prompterClickHandler = this.advancePrompter.bind(this);
                prompterEl.addEventListener('click', this.prompterClickHandler);
            }
        } catch (e) {
            console.debug('jumpToIndex: could not reattach prompterClickHandler', e);
        }
    }

    resetPrompter() {
        const elems = this.elements;
        // stop any running lyric auto-scroll and prompter timer
        if (this.lyricsTimer) {
            clearInterval(this.lyricsTimer);
            this.lyricsTimer = null;
        }
        if (this.prompterTimer) {
            clearInterval(this.prompterTimer);
            this.prompterTimer = null;
        }
        const resultEl = document.getElementById('lyricsResult');
        if (resultEl) resultEl.innerHTML = '';
        const prompter = document.getElementById('prompter');
        if (prompter) {
            if (this.prompterClickHandler) prompter.removeEventListener('click', this.prompterClickHandler);
            if (this.prompterWheelHandler) prompter.removeEventListener('wheel', this.prompterWheelHandler); // Cleanup wheel
            // remove per-line handlers if present
            if (this.prompterLineClickHandlers && this.prompterLineClickHandlers.length) {
                this.prompterLineClickHandlers.forEach(item => {
                    try { item.el.removeEventListener('click', item.handler); } catch (e) { }
                });
                this.prompterLineClickHandlers = [];
            }
            if (this.resultLineClickHandlers && this.resultLineClickHandlers.length) {
                this.resultLineClickHandlers.forEach(item => {
                    try { item.el.removeEventListener('click', item.handler); } catch (e) { }
                });
                this.resultLineClickHandlers = [];
            }
            prompter.innerHTML = '';
            prompter.setAttribute('aria-hidden', 'true');
            this.prompterClickHandler = null;
            this.prompterWheelHandler = null;
            this.prompterHint = null;
        }
        // hide stop button
        const clearBtn = document.getElementById('clearPrompterBtn');
        if (clearBtn) clearBtn.classList.add('hidden');

        this.prompterLines = [];
        this.resultLines = [];
        this.stopAutoScroll();
    }

    updateIdentity(user) {
        if (!user) {
            this.elements.profileSection.classList.remove('hidden');
            this.elements.roomsSection.classList.add('hidden');
            this.elements.conferenceSection.classList.add('hidden');
            this.elements.currentIdentity.classList.add('hidden');
        } else {
            this.elements.profileSection.classList.add('hidden');
            this.elements.currentIdentity.classList.remove('hidden');
            this.elements.currentDisplayName.textContent = user.displayName;

            if (this.elements.conferenceSection.classList.contains('hidden')) {
                this.elements.roomsSection.classList.remove('hidden');
            }
        }
    }

    toggleConferenceMode(active) {
        if (active) {
            this.elements.roomsSection.classList.add('hidden');
            this.elements.conferenceSection.classList.remove('hidden');
        } else {
            this.elements.roomsSection.classList.remove('hidden');
            this.elements.conferenceSection.classList.add('hidden');
        }
    }

    renderRooms(rooms, onJoin) {
        this.elements.roomsList.innerHTML = '';
        if (!rooms.length) {
            const empty = document.createElement('li');
            empty.className = 'rooms-empty';
            empty.textContent = '尚無房間，成為第一個建立者吧！';
            this.elements.roomsList.appendChild(empty);
            return;
        }

        rooms.forEach(room => {
            const li = document.createElement('li');
            li.classList.add('room-item');

            const meta = document.createElement('div');
            meta.classList.add('meta');

            const title = document.createElement('h3');
            title.textContent = room.name;

            const badges = document.createElement('div');
            badges.className = 'room-badges';
            const addBadge = (text, cls) => {
                const b = document.createElement('span');
                b.className = `room-badge ${cls}`;
                b.textContent = text;
                badges.appendChild(b);
            };
            if (room.mode === 'live') addBadge('● LIVE 直播', 'badge-live');
            else addBadge('💬 視訊通話', 'badge-call');
            if (room.hasPassword) addBadge('🔒 私人', 'badge-lock');
            if (room.nowPlaying) addBadge(`🎤 ${room.nowPlaying}`, 'badge-song');

            const max = room.maxMembers || CONFIG.MAX_PARTICIPANTS;
            const sub = document.createElement('span');
            sub.className = 'room-sub';
            sub.textContent = `${room.hostName ? '房主：' + room.hostName + ' · ' : ''}在線 ${room.memberCount}/${max}`;

            meta.appendChild(title);
            meta.appendChild(badges);
            meta.appendChild(sub);

            const joinBtn = document.createElement('button');
            joinBtn.type = 'button';

            if ((room.memberCount || 0) >= max) {
                joinBtn.textContent = '房間已滿';
                joinBtn.disabled = true;
                joinBtn.classList.add('btn-disabled');
            } else {
                joinBtn.textContent = room.mode === 'live' ? '進入觀看' : '加入';
                joinBtn.addEventListener('click', () => onJoin(room));
            }

            li.appendChild(meta);
            li.appendChild(joinBtn);
            this.elements.roomsList.appendChild(li);
        });
    }

    /* ---------- 私人房間密碼視窗 ---------- */
    askPassword(roomName, errorText) {
        const e = this.elements;
        return new Promise((resolve) => {
            e.passwordModalRoom.textContent = `「${roomName}」是私人房間，請輸入密碼才能加入。`;
            e.joinPasswordInput.value = '';
            e.passwordError.textContent = errorText || '';
            e.passwordError.classList.toggle('hidden', !errorText);
            e.passwordModal.classList.remove('hidden');
            setTimeout(() => e.joinPasswordInput.focus(), 50);

            const finish = (value) => {
                e.passwordModal.classList.add('hidden');
                e.confirmPasswordBtn.removeEventListener('click', onOk);
                e.cancelPasswordBtn.removeEventListener('click', onCancel);
                e.joinPasswordInput.removeEventListener('keydown', onKey);
                resolve(value);
            };
            const onOk = () => {
                const v = e.joinPasswordInput.value.trim();
                if (!v) {
                    e.passwordError.textContent = '請輸入密碼';
                    e.passwordError.classList.remove('hidden');
                    return;
                }
                finish(v);
            };
            const onCancel = () => finish(null);
            const onKey = (ev) => {
                if (ev.key === 'Enter') onOk();
                if (ev.key === 'Escape') onCancel();
            };
            e.confirmPasswordBtn.addEventListener('click', onOk);
            e.cancelPasswordBtn.addEventListener('click', onCancel);
            e.joinPasswordInput.addEventListener('keydown', onKey);
        });
    }

    /* ---------- 房間模式（直播 / 視訊通話）---------- */
    applyRoomMode(mode, isHost, hasPassword) {
        const e = this.elements;
        const isLive = mode === 'live';
        const isViewer = isLive && !isHost;
        e.stage.classList.toggle('live-mode', isLive);
        e.stage.classList.toggle('viewer-mode', isViewer);
        e.localContainer.classList.toggle('hidden', isViewer);
        e.localContainer.classList.toggle('broadcasting', isLive && isHost);
        const label = e.localContainer.querySelector('.label');
        if (label) label.textContent = isLive && isHost ? '● LIVE 我正在直播' : '我';
        [e.toggleCamera, e.toggleMic, e.shareScreenBtn, e.recordScreenBtn].forEach(btn => {
            if (btn) btn.classList.toggle('hidden', isViewer);
        });
        if (e.controls) e.controls.classList.toggle('viewer-controls', isViewer);
        if (e.roomModeBadge) {
            e.roomModeBadge.textContent = `${isLive ? '● LIVE' : '💬 通話'}${hasPassword ? ' 🔒' : ''}`;
            e.roomModeBadge.className = `mode-badge ${isLive ? 'badge-live' : 'badge-call'}`;
        }
        if (e.viewerCount) e.viewerCount.classList.toggle('hidden', !isLive);
    }

    updateViewerCount(count) {
        if (this.elements.viewerCount) this.elements.viewerCount.textContent = `👀 ${count} 位觀眾正在觀看`;
    }

    /* ---------- 網路品質指示 ---------- */
    updateNetBadge(userId, info) {
        const card = userId === 'self'
            ? this.elements.localContainer
            : document.querySelector(`.video-card[data-user="${userId}"]`);
        if (!card) return;
        let badge = card.querySelector('.net-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'net-badge';
            badge.innerHTML = '<span class="net-bars"><i></i><i></i><i></i></span><span class="net-text"></span>';
            card.appendChild(badge);
        }
        const labels = { good: '良好', fair: '普通', poor: '不穩', unknown: '連線中' };
        badge.className = `net-badge q-${info.quality}`;
        badge.querySelector('.net-text').textContent = info.text || labels[info.quality];
        badge.title = info.title || `連線品質：${labels[info.quality]}`;
    }

    updateParticipants(participants, hostId, currentUserId, onTransferHost, extra = {}) {
        const muted = extra.muted || new Set();
        this.mentionNames = participants.filter(p => p.userId !== currentUserId).map(p => p.displayName);
        this.allNames = participants.map(p => p.displayName);
        console.debug('UI.updateParticipants called', { participants, hostId, currentUserId });
        this.elements.participantsList.innerHTML = '';

        // Store only OTHER participants (exclude self)
        this.currentParticipants = participants.filter(p => p.userId !== currentUserId);

        // --- 動態按鈕處理區域 (白板 + 點歌) ---
        const participantsHeader = document.querySelector('.participants-header');
        
        // 1. 處理白板按鈕 (確保它存在)
        let wbBtn = participantsHeader.querySelector('#whiteboardBtn');
        if (!wbBtn) {
            wbBtn = document.createElement('button');
            wbBtn.id = 'whiteboardBtn';
            wbBtn.title = '互動白板';
            wbBtn.textContent = '🎨'; 
            
            const transferBtns = participantsHeader.querySelectorAll('button');
            if (transferBtns.length > 0) {
                participantsHeader.insertBefore(wbBtn, transferBtns[0]);
            } else {
                participantsHeader.appendChild(wbBtn);
            }
            
            // 綁定白板事件
            wbBtn.addEventListener('click', () => {
                this.showWhiteboard(true); 
            });
        }

        // 2. 處理點歌按鈕
        const existingBtn = participantsHeader.querySelector('#requestSongBtn');
        
        // 只有當「有其他成員」時才顯示點歌按鈕
        if (this.currentParticipants.length > 0) {
            let btn = existingBtn;
            
            // 如果按鈕還沒建立，就建立一個
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'requestSongBtn';
                btn.title = '點歌';
                btn.setAttribute('aria-label', '點歌');
                btn.textContent = '🎵';

                // ★ 關鍵排版：放在白板按鈕後面
                if (wbBtn && wbBtn.nextSibling) {
                    participantsHeader.insertBefore(btn, wbBtn.nextSibling);
                } else {
                    participantsHeader.appendChild(btn);
                }
            }

            // ★★★ 關鍵修復開始：重新綁定點擊事件 ★★★
            
            // 步驟 A: 先移除舊的監聽器 (透過 cloneNode 快速清除，避免重複綁定導致點一次跳兩次視窗)
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            btn = newBtn; // 更新變數參考
            
            // 步驟 B: 綁定真正的邏輯
            btn.addEventListener('click', () => {
                // 檢查是否有其他人可以點歌
                if (this.currentParticipants && this.currentParticipants.length > 0) {
                    this.showSongRequestModal(this.currentParticipants);
                } else {
                    this.showNotification('沒有其他成員在線', true);
                }
            });
            // ★★★ 關鍵修復結束 ★★★
            
            // 更新 cached elements 中的參照，確保其他地方能抓到它
            this.elements.requestSongBtn = btn;

        } else {
            // 如果沒有其他人，移除點歌按鈕
            if (existingBtn) {
                existingBtn.remove();
                this.elements.requestSongBtn = null;
            }
        }
        // --- 按鈕處理結束 ---

        // Render participants list
        participants.forEach(p => {
            const li = document.createElement('li');
            const isHost = p.userId === hostId;
            const isSelf = p.userId === currentUserId;
            if (isHost) li.classList.add('is-host');

            const info = document.createElement('span');
            info.className = 'participant-name';
            info.textContent = `${p.displayName}${isSelf ? ' (自己)' : ''}${isHost ? ' 👑' : ''}${muted.has(p.userId) ? ' 🔇' : ''}`;
            if (!isSelf) {
                info.title = '點一下可以 @提及';
                info.addEventListener('click', () => this.insertMention(p.displayName));
            }
            li.appendChild(info);

            if (currentUserId === hostId && !isSelf && !isHost) {
                const actions = document.createElement('div');
                actions.className = 'participant-actions';

                const btn = document.createElement('button');
                btn.textContent = '設為房主';
                btn.addEventListener('click', () => onTransferHost(p.userId));
                actions.appendChild(btn);

                const muteBtn = document.createElement('button');
                const isMuted = muted.has(p.userId);
                muteBtn.textContent = isMuted ? '解除禁言' : '禁言';
                muteBtn.addEventListener('click', () => extra.onMute && extra.onMute(p.userId, !isMuted));
                actions.appendChild(muteBtn);

                // 踢人需要按兩次確認，避免誤觸
                const kickBtn = document.createElement('button');
                kickBtn.className = 'danger-btn';
                kickBtn.textContent = '踢出';
                kickBtn.addEventListener('click', () => {
                    if (kickBtn.dataset.confirm === '1') {
                        extra.onKick && extra.onKick(p.userId);
                        return;
                    }
                    kickBtn.dataset.confirm = '1';
                    kickBtn.textContent = '確定？';
                    setTimeout(() => {
                        kickBtn.dataset.confirm = '';
                        kickBtn.textContent = '踢出';
                    }, 3000);
                });
                actions.appendChild(kickBtn);
                li.appendChild(actions);
            }

            this.elements.participantsList.appendChild(li);
        });

        // show/hide start poll button
        try {
            if (this.elements.startPollBtn) {
                if (currentUserId === hostId) this.elements.startPollBtn.classList.remove('hidden');
                else this.elements.startPollBtn.classList.add('hidden');
            }
        } catch (e) { }
    }

    appendMessage(msg, currentUserId, ctx = {}) {
        const { from, text, timestamp } = msg;
        if (!text) return;

        const message = document.createElement('div');
        const isSelf = from && from.userId === currentUserId;
        const myName = ctx.myName || '';
        const mentionsMe = !isSelf && !!myName && text.includes('@' + myName);
        message.classList.add('message', isSelf ? 'self' : 'other');
        if (mentionsMe) message.classList.add('mentioned');

        const content = document.createElement('div');
        content.className = 'message-text';
        this.renderMentions(content, text, myName);

        const meta = document.createElement('div');
        meta.classList.add('meta');
        const isHostMsg = from && ctx.hostId && from.userId === ctx.hostId;
        if (isHostMsg) message.classList.add('from-host');
        meta.textContent = `${from ? from.displayName : '系統'}${isHostMsg ? ' 👑' : ''} · ${formatTime(timestamp)}`;

        message.appendChild(content);
        message.appendChild(meta);

        this.appendToMessages(message);

        if (mentionsMe) this.showNotification(`💬 ${from.displayName} 提到了你`);
        this.addDanmaku(text, { isSelf, isMention: mentionsMe });
    }

    // 把 @暱稱 包成高亮的 <span>（用 DOM 節點組字，避免 XSS）
    renderMentions(container, text, myName) {
        const names = (this.allNames || []).filter(Boolean).sort((a, b) => b.length - a.length);
        if (!names.length || !text.includes('@')) {
            container.textContent = text;
            return;
        }
        const re = new RegExp('@(' + names.map(escapeRegExp).join('|') + ')', 'g');
        let last = 0;
        let m;
        while ((m = re.exec(text)) !== null) {
            if (m.index > last) container.appendChild(document.createTextNode(text.slice(last, m.index)));
            const span = document.createElement('span');
            span.className = 'mention' + (m[1] === myName ? ' mention-me' : '');
            span.textContent = m[0];
            container.appendChild(span);
            last = m.index + m[0].length;
        }
        if (last < text.length) container.appendChild(document.createTextNode(text.slice(last)));
    }

    appendSystemMessage(text) {
        const el = document.createElement('div');
        el.className = 'message system';
        el.textContent = `${text} · ${formatTime()}`;
        this.appendToMessages(el);
    }

    appendToMessages(el) {
        const box = this.elements.messages;
        const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
        box.appendChild(el);
        // 使用者正在往上翻舊訊息時不要硬拉到底
        if (nearBottom) box.scrollTop = box.scrollHeight;
    }

    setChatMuted(isMuted) {
        const input = this.elements.messageInput;
        input.disabled = isMuted;
        this.elements.sendBtn.disabled = isMuted;
        input.placeholder = isMuted ? '🔇 你已被房主禁言' : '輸入訊息，打 @ 可以提及成員...';
    }

    /* ---------- @提及 自動完成 ---------- */
    bindMentionEvents() {
        const input = this.elements.messageInput;
        const box = this.elements.mentionSuggest;
        if (!input || !box) return;
        this.mentionIndex = 0;

        const currentQuery = () => {
            const pos = input.selectionStart || input.value.length;
            const before = input.value.slice(0, pos);
            const m = before.match(/@([^\s@]*)$/);
            return m ? { query: m[1], start: pos - m[0].length, end: pos } : null;
        };

        const render = () => {
            const q = currentQuery();
            const names = this.mentionNames || [];
            const list = q ? names.filter(n => n.toLowerCase().includes(q.query.toLowerCase())).slice(0, 6) : [];
            this.mentionMatches = list;
            this.mentionRange = q;
            if (!list.length) { box.classList.add('hidden'); return; }
            this.mentionIndex = Math.min(this.mentionIndex, list.length - 1);
            box.innerHTML = '';
            list.forEach((name, i) => {
                const item = document.createElement('div');
                item.className = 'mention-item' + (i === this.mentionIndex ? ' active' : '');
                item.textContent = '@' + name;
                item.addEventListener('mousedown', (ev) => {
                    ev.preventDefault();
                    this.applyMention(name);
                });
                box.appendChild(item);
            });
            box.classList.remove('hidden');
        };

        input.addEventListener('input', () => { this.mentionIndex = 0; render(); });
        input.addEventListener('blur', () => setTimeout(() => box.classList.add('hidden'), 100));
        input.addEventListener('keydown', (ev) => {
            if (ev.isComposing) return; // 注音/拼音輸入法還在選字時不要攔截 Enter
            if (box.classList.contains('hidden') || !this.mentionMatches || !this.mentionMatches.length) return;
            if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
                ev.preventDefault();
                const n = this.mentionMatches.length;
                this.mentionIndex = (this.mentionIndex + (ev.key === 'ArrowDown' ? 1 : n - 1)) % n;
                render();
            } else if (ev.key === 'Enter' || ev.key === 'Tab') {
                ev.preventDefault();
                ev.stopImmediatePropagation();
                // preventDefault 會讓這次 Enter 不觸發 keypress，所以只會選人、不會送出訊息
                this.applyMention(this.mentionMatches[this.mentionIndex]);
            } else if (ev.key === 'Escape') {
                box.classList.add('hidden');
            }
        });
    }

    applyMention(name) {
        const input = this.elements.messageInput;
        const r = this.mentionRange;
        if (!r) return this.insertMention(name);
        const v = input.value;
        input.value = v.slice(0, r.start) + '@' + name + ' ' + v.slice(r.end);
        const caret = r.start + name.length + 2;
        input.setSelectionRange(caret, caret);
        this.elements.mentionSuggest.classList.add('hidden');
        input.focus();
    }

    insertMention(name) {
        const input = this.elements.messageInput;
        if (input.disabled) return;
        const v = input.value;
        input.value = `${v}${v && !v.endsWith(' ') ? ' ' : ''}@${name} `;
        this.switchTab('chat');
        input.focus();
    }

    /* ---------- 彈幕 ---------- */
    setDanmakuEnabled(on) {
        this.danmakuEnabled = on;
        const btn = this.elements.danmakuToggle;
        if (btn) {
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', String(on));
            btn.title = on ? '彈幕：開（點一下關閉）' : '彈幕：關（點一下開啟）';
        }
        if (!on && this.elements.danmakuLayer) this.elements.danmakuLayer.innerHTML = '';
        try { localStorage.setItem('welive.danmaku', on ? '1' : '0'); } catch (e) { }
    }

    addDanmaku(text, { isSelf = false, isMention = false } = {}) {
        if (this.danmakuEnabled === false) return;
        const layer = this.elements.danmakuLayer;
        if (!layer || !layer.clientWidth) return;

        const LANE_H = 40;
        const laneCount = Math.max(2, Math.floor((layer.clientHeight * 0.7) / LANE_H));
        if (!this.danmakuLanes || this.danmakuLanes.length !== laneCount) {
            this.danmakuLanes = new Array(laneCount).fill(0);
        }
        // 找一條「上一則已經完全離開右邊界」的軌道，避免重疊
        const now = performance.now();
        let lane = this.danmakuLanes.findIndex(t => t <= now);
        if (lane === -1) lane = this.danmakuLanes.indexOf(Math.min(...this.danmakuLanes));

        const el = document.createElement('div');
        el.className = 'danmaku-item' + (isSelf ? ' self' : '') + (isMention ? ' mention' : '');
        el.textContent = text.length > 60 ? text.slice(0, 60) + '…' : text;
        el.style.top = `${lane * LANE_H + 10}px`;
        layer.appendChild(el);

        const w = layer.clientWidth;
        const ew = el.offsetWidth;
        const duration = CONFIG.DANMAKU_DURATION_MS;
        const speed = (w + ew) / duration; // px per ms
        this.danmakuLanes[lane] = now + (ew + 24) / speed;

        const anim = el.animate(
            [{ transform: `translateX(${w}px)` }, { transform: `translateX(${-ew}px)` }],
            { duration, easing: 'linear' }
        );
        anim.onfinish = () => el.remove();
    }

    /* ---------- 側邊欄分頁 ---------- */
    switchTab(tab) {
        this.elements.tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        this.elements.chatPanel.classList.toggle('hidden', tab !== 'chat');
        this.elements.queuePanel.classList.toggle('hidden', tab !== 'queue');
        if (tab === 'queue' && this.elements.queueCount) this.elements.queueCount.classList.remove('pulse');
    }

    /* ---------- KTV 點歌佇列 ---------- */
    renderQueue(state, ctx, onRemove) {
        const e = this.elements;
        const np = state.nowPlaying;
        const queue = state.queue || [];
        const canManage = (item) => ctx.isHost || item.requestedBy.userId === ctx.myId;

        e.nowPlaying.classList.toggle('empty', !np);
        e.nowPlaying.innerHTML = '';
        const label = document.createElement('div');
        label.className = 'np-label';
        label.textContent = np ? '● 正在演唱' : '正在演唱';
        const title = document.createElement('div');
        title.className = 'np-title';
        title.textContent = np ? `${np.song}${np.artist ? ' — ' + np.artist : ''}` : '目前沒有歌曲';
        const meta = document.createElement('div');
        meta.className = 'np-meta';
        meta.textContent = np
            ? `🎤 ${np.singer ? np.singer.displayName : '大家一起唱'} · 點歌：${np.requestedBy.displayName}`
            : '在下面點一首歌開始吧！';
        e.nowPlaying.append(label, title, meta);

        const canSkip = !!np && (ctx.isHost || np.requestedBy.userId === ctx.myId || (np.singer && np.singer.userId === ctx.myId));
        e.queueNextBtn.disabled = !canSkip;
        e.queueNextBtn.title = canSkip ? '切到下一首' : '只有房主、點歌者或演唱者可以切歌';

        e.queueList.innerHTML = '';
        if (!queue.length) {
            const li = document.createElement('li');
            li.className = 'queue-empty';
            li.textContent = '佇列是空的';
            e.queueList.appendChild(li);
        }
        queue.forEach((item, i) => {
            const li = document.createElement('li');
            li.className = 'queue-item' + (i === 0 ? ' up-next' : '');
            const info = document.createElement('div');
            info.className = 'queue-info';
            const t = document.createElement('div');
            t.className = 'queue-title';
            t.textContent = `${item.song}${item.artist ? ' — ' + item.artist : ''}`;
            const m = document.createElement('div');
            m.className = 'queue-meta';
            m.textContent = `${i === 0 ? '下一首 · ' : ''}🎤 ${item.singer ? item.singer.displayName : '大家'} · 點歌：${item.requestedBy.displayName}`;
            info.append(t, m);
            li.appendChild(info);
            if (canManage(item)) {
                const rm = document.createElement('button');
                rm.className = 'queue-remove';
                rm.title = '移除';
                rm.textContent = '✕';
                rm.addEventListener('click', () => onRemove(item.id));
                li.appendChild(rm);
            }
            e.queueList.appendChild(li);
        });

        const total = queue.length + (np ? 1 : 0);
        e.queueCount.textContent = String(total);
        e.queueCount.classList.toggle('hidden', total === 0);
        if (ctx.changed && e.queuePanel.classList.contains('hidden')) e.queueCount.classList.add('pulse');
    }

    createReaction(emoji, userId) {
        let container;
        if (userId === 'self') {
            container = this.elements.localContainer;
        } else {
            container = document.querySelector(`.video-card[data-user="${userId}"]`);
        }

        if (!container) return;

        const elem = document.createElement('div');
        elem.classList.add('remote-reaction');
        elem.textContent = emoji;

        // Random position: 10% to 80%
        const randomLeft = Math.floor(Math.random() * 70) + 10;
        const randomTop = Math.floor(Math.random() * 70) + 10;
        // Random rotation: -20deg to 20deg
        const randomRot = Math.floor(Math.random() * 40) - 20;

        elem.style.left = `${randomLeft}%`;
        elem.style.top = `${randomTop}%`;
        elem.style.transform = `rotate(${randomRot}deg) scale(0.5)`; // Initial scale for animation

        container.appendChild(elem);

        // Remove after animation
        setTimeout(() => {
            if (elem.parentElement) elem.parentElement.removeChild(elem);
        }, 2000);
    }

    ensureVideoCard(user, isHost) {
        let card = document.querySelector(`.video-card[data-user="${user.userId}"]`);

        if (!card) {
            card = document.createElement('div');
            card.classList.add('video-card');
            card.setAttribute('data-user', user.userId);

            const video = document.createElement('video');
            video.autoplay = true;
            video.playsinline = true;

            const label = document.createElement('span');
            label.classList.add('label');
            label.textContent = user.displayName;

            card.appendChild(video);
            card.appendChild(label);

            // Expand button
            const expandBtn = document.createElement('button');
            expandBtn.className = 'expand-btn';
            expandBtn.title = '全螢幕';
            // maximize icon
            expandBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

            expandBtn.onclick = (e) => {
                e.stopPropagation();
                card.classList.toggle('expanded');
                const isExpanded = card.classList.contains('expanded');
                // update icon
                if (isExpanded) {
                    expandBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    expandBtn.title = '還原';
                } else {
                    expandBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    expandBtn.title = '全螢幕';
                    
                    // ★★★ 新增這三行：清除拖曳時留下的座標樣式 ★★★
                    card.style.left = '';
                    card.style.top = '';
                    card.style.transform = ''; 
                }
            };

            card.appendChild(expandBtn);

            // Drag handling
            // --- 拖曳邏輯修改開始 (替換原有的拖曳程式碼) ---
            let isDragging = false;
            let shiftX, shiftY; // 記錄滑鼠相對於視窗左上角的偏移量

            const onMouseDown = (e) => {
                // 只有放大且不是點擊按鈕時才允許拖曳
                if (!card.classList.contains('expanded')) return;
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

                isDragging = true;
                card.classList.add('dragging-mode');

                const clientX = e.clientX || e.touches?.[0].clientX;
                const clientY = e.clientY || e.touches?.[0].clientY;

                // 1. 取得視窗當前的位置
                const rect = card.getBoundingClientRect();

                // 2. ★ 關鍵修正：計算滑鼠點擊點與視窗左上角的距離 (Offset)
                shiftX = clientX - rect.left;
                shiftY = clientY - rect.top;

                // 3. 暫時移除 CSS transition，避免拖曳時產生延遲或跳動
                card.style.transition = 'none';

                // 4. 清除 CSS 的置中 transform，鎖定在當前像素位置
                card.style.transform = 'none';
                card.style.left = `${rect.left}px`;
                card.style.top = `${rect.top}px`;

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                document.addEventListener('touchmove', onMouseMove, { passive: false });
                document.addEventListener('touchend', onMouseUp);
            };

            const onMouseMove = (e) => {
                if (!isDragging) return;
                e.preventDefault(); // 防止手機版拖曳時捲動頁面

                const clientX = e.clientX || e.touches?.[0].clientX;
                const clientY = e.clientY || e.touches?.[0].clientY;

                // 5. 新位置 = 當前滑鼠位置 - 偏移量 (保持相對位置)
                card.style.left = `${clientX - shiftX}px`;
                card.style.top = `${clientY - shiftY}px`;
            };

            const onMouseUp = () => {
                isDragging = false;
                card.classList.remove('dragging-mode');
                
                // 6. 拖曳結束，把 transition 加回來 (讓之後縮放有動畫效果)
                card.style.transition = ''; 

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.removeEventListener('touchmove', onMouseMove);
                document.removeEventListener('touchend', onMouseUp);
            };
            // --- 拖曳邏輯修改結束 ---

            card.addEventListener('mousedown', onMouseDown);
            card.addEventListener('touchstart', onMouseDown, { passive: false });

            this.elements.stage.appendChild(card);
        }

        // Update host styling if needed
        if (isHost) {
            card.classList.add('host-video');
            card.style.order = -1; // Host first
        } else {
            card.classList.remove('host-video');
            card.style.order = 1;
        }

        return card.querySelector('video');
    }

    removeVideoCard(userId) {
        const card = document.querySelector(`.video-card[data-user="${userId}"]`);
        if (card) card.remove();
    }

    clearConference() {
        this.elements.messages.innerHTML = '';
        this.elements.participantsList.innerHTML = '';
        if (this.elements.danmakuLayer) this.elements.danmakuLayer.innerHTML = '';
        this.setChatMuted(false);
        this.renderQueue({ nowPlaying: null, queue: [] }, { isHost: false, myId: null }, () => { });
        this.queueSongId = null;
        this.resetPrompter();
        this.switchTab('chat');
        this.applyRoomMode('call', true, false);
        const selfBadge = this.elements.localContainer.querySelector('.net-badge');
        if (selfBadge) selfBadge.remove();
        const remoteCards = document.querySelectorAll('.video-card:not([data-user="self"])');
        remoteCards.forEach(c => c.remove());
    }

    // --- 白板功能 ---
    // --- 修改後的 bindWhiteboardEvents (加入節流優化) ---
    // --- 效能優化版 bindWhiteboardEvents ---
    // --- 修復斷線問題的 bindWhiteboardEvents ---
    bindWhiteboardEvents(roomManager) {
        const elems = this.elements;
        if (!elems.whiteboardCanvas) return;

        this.ctx = elems.whiteboardCanvas.getContext('2d');
        this.drawing = false;
        this.currentColor = '#000000';
        this.roomManager = roomManager;
        
        this.canvasRect = null;
        this.lastSentTime = 0;
        
        // 用來畫本地端 (高更新率)
        this.currentPos = { x: 0, y: 0 };
        this.lastPos = { x: 0, y: 0 };
        
        // ★ 新增：專門用來記錄「上一次發送給別人的位置」
        this.networkLastPos = { x: 0, y: 0 }; 
        
        this.isDrawingFramePending = false;

        // 顏色選擇
        elems.colorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                elems.colorBtns.forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.currentColor = e.target.dataset.color;
            });
        });

        // 清除
        if(elems.clearBoardBtn) {
            elems.clearBoardBtn.addEventListener('click', () => {
                this.clearCanvas();
                this.roomManager.sendSignal('whiteboard-clear');
            });
        }

        // 關閉
        if(elems.closeWhiteboardBtn) {
            elems.closeWhiteboardBtn.addEventListener('click', () => {
                elems.whiteboardModal.classList.add('hidden');
            });
        }

        const canvas = elems.whiteboardCanvas;
        
        const updateRect = () => {
            this.canvasRect = canvas.getBoundingClientRect();
        };
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect);

        const startDraw = (e) => {
            this.drawing = true;
            updateRect(); 
            const pos = this.getPos(e, canvas);
            
            // 初始化所有座標點
            this.lastPos = pos;
            this.currentPos = pos;
            this.networkLastPos = pos; // ★ 網路起點也要同步
        };

        const moveDraw = (e) => {
            if (!this.drawing) return;
            e.preventDefault();
            this.currentPos = this.getPos(e, canvas);

            if (!this.isDrawingFramePending) {
                this.isDrawingFramePending = true;
                requestAnimationFrame(performDraw);
            }
        };

        const performDraw = () => {
            if (!this.drawing) {
                this.isDrawingFramePending = false;
                return;
            }

            // 1. 本地繪圖 (依然流暢)
            // 畫這一段微小的移動
            this.drawStroke(this.lastPos.x, this.lastPos.y, this.currentPos.x, this.currentPos.y, this.currentColor);
            
            // 更新本地的舊座標，準備畫下一幀
            this.lastPos = { ...this.currentPos };

            // 2. 網路發送 (修復斷線邏輯)
            const now = Date.now();
            if (now - this.lastSentTime > 50) { 
                const w = canvas.width;
                const h = canvas.height;
                
                // ★ 關鍵修正：
                // 起點使用 networkLastPos (上一次發送的位置)，終點使用 currentPos (現在的位置)
                // 這樣會直接拉一條直線連過去，補足中間被節流掉的軌跡，對方看到的就是連續的線
                this.roomManager.sendSignal('whiteboard-draw', {
                    x0: this.networkLastPos.x / w,
                    y0: this.networkLastPos.y / h,
                    x1: this.currentPos.x / w,
                    y1: this.currentPos.y / h,
                    color: this.currentColor
                });
                
                this.lastSentTime = now;
                // 更新網路的舊座標
                this.networkLastPos = { ...this.currentPos };
            }
            
            this.isDrawingFramePending = false;
        };

        const endDraw = () => {
            this.drawing = false;
            // 選擇性：停筆時補送最後一段 (避免最後一小筆沒畫出來)
            const w = canvas.width;
            const h = canvas.height;
            // 檢查是否還有沒送出去的位移
            if (this.networkLastPos.x !== this.currentPos.x || this.networkLastPos.y !== this.currentPos.y) {
                 this.roomManager.sendSignal('whiteboard-draw', {
                    x0: this.networkLastPos.x / w,
                    y0: this.networkLastPos.y / h,
                    x1: this.currentPos.x / w,
                    y1: this.currentPos.y / h,
                    color: this.currentColor
                });
            }
        };

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', moveDraw);
        canvas.addEventListener('mouseup', endDraw);
        canvas.addEventListener('mouseout', endDraw);
        
        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', moveDraw, { passive: false });
        canvas.addEventListener('touchend', endDraw);
    }

    // --- 修改後的 getPos (使用快取的 rect) ---
    getPos(e, canvas) {
        // 如果沒有快取到，就臨時抓一次
        const rect = this.canvasRect || canvas.getBoundingClientRect();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    drawStroke(x0, y0, x1, y1, color) {
        if (!this.ctx) return;
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
        this.ctx.closePath();
    }

    clearCanvas() {
        if (!this.ctx || !this.elements.whiteboardCanvas) return;
        this.ctx.clearRect(0, 0, this.elements.whiteboardCanvas.width, this.elements.whiteboardCanvas.height);
    }

    // 修改 main.js 中的 showWhiteboard 方法
    showWhiteboard(emitSignal = false) {
        const modal = this.elements.whiteboardModal;
        const canvas = this.elements.whiteboardCanvas;
        
        // 顯示視窗
        modal.classList.remove('hidden');
        
        // 重新調整 Canvas 解析度以避免模糊
        // 必須在顯示之後計算，因為 display:none 時寬度為 0
        const container = canvas.parentElement;
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;

        // 如果需要通知其他人 (點擊按鈕時為 true，接收訊號時為 false 以免無窮迴圈)
        if (emitSignal && this.roomManager) {
            this.roomManager.sendSignal('whiteboard-open');
        }
    }
}


/**
 * Manages WebRTC connections and WebSocket signaling.
 */
class RoomManager {
    constructor(ui) {
        this.ui = ui;
        this.user = null;
        this.currentRoom = null;
        this.socket = null;
        this.localStream = null;
        this.peers = new Map(); // userId -> { pc, stream }
        this.mediaState = { camera: true, mic: true };
        // Recording state
        this.isScreenSharing = false;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        // 新功能狀態
        this.mode = 'call';            // 'call' 視訊通話 / 'live' 直播
        this.participants = new Map();
        this.muted = new Set();        // 被禁言的 userId
        this.queueState = null;        // KTV 佇列
        this.clockOffset = 0;          // 伺服器時間 - 本機時間
        this.statsTimer = null;
        this.onKicked = null;
    }

    async initLocalStream() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('navigator.mediaDevices 不可用，isSecureContext =', window.isSecureContext);
            this.ui.showNotification('瀏覽器不允許使用相機：請用 https:// 或 http://localhost 開啟（不能用區網 IP 的 http）', true);
            return false;
        }
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.ui.elements.localVideo.srcObject = this.localStream;
            this.updateMediaTracks();
            return true;
        } catch (err) {
            console.error('Media Error:', err);
            const hint = err && err.name === 'NotAllowedError' ? '（權限被拒絕，請在網址列允許相機/麥克風）'
                : err && err.name === 'NotFoundError' ? '（找不到相機或麥克風裝置）'
                : err && err.name === 'NotReadableError' ? '（相機正被其他程式佔用，例如另一個分頁或 Zoom）'
                : `（${err && err.name}）`;
            this.ui.showNotification('無法存取相機或麥克風' + hint, true);
            return false;
        }
    }

    async startScreenShare() {
        if (this.isScreenSharing) return;
        try {
            let screenStream;
            try {
                screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            } catch (e) {
                screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            }

            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) throw new Error('無法取得螢幕錄影軌');

            const screenAudioTrack = (screenStream.getAudioTracks() && screenStream.getAudioTracks().length) ? screenStream.getAudioTracks()[0] : null;
            const localAudioTrack = (this.localStream && this.localStream.getAudioTracks().length) ? this.localStream.getAudioTracks()[0] : null;

            // Create mixed audio using AudioContext with GainNodes for better control
            let mixedAudioTrack = null;
            if (screenAudioTrack || localAudioTrack) {
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    const audioContext = new AudioCtx();
                    const dest = audioContext.createMediaStreamDestination();

                    if (screenAudioTrack) {
                        const screenSource = audioContext.createMediaStreamSource(new MediaStream([screenAudioTrack]));
                        const screenGain = audioContext.createGain();
                        screenGain.gain.value = 1.0;
                        screenSource.connect(screenGain);
                        screenGain.connect(dest);
                    }

                    if (localAudioTrack) {
                        const micSource = audioContext.createMediaStreamSource(new MediaStream([localAudioTrack]));
                        const micGain = audioContext.createGain();
                        micGain.gain.value = 1.0;
                        micSource.connect(micGain);
                        micGain.connect(dest);
                    }

                    mixedAudioTrack = dest.stream.getAudioTracks()[0];
                    this._audioMixer = { audioContext, dest, mixedTrack: mixedAudioTrack };
                } catch (e) {
                    console.warn('Audio mixing failed', e);
                    mixedAudioTrack = screenAudioTrack || localAudioTrack;
                }
            }

            const displayStream = new MediaStream();
            displayStream.addTrack(screenTrack);
            if (mixedAudioTrack) displayStream.addTrack(mixedAudioTrack);
            this.ui.elements.localVideo.srcObject = displayStream;

            // Create local audio playback for broadcaster to monitor
            if (mixedAudioTrack) {
                let audioEl = document.getElementById('localMixedAudio');
                if (!audioEl) {
                    audioEl = document.createElement('audio');
                    audioEl.id = 'localMixedAudio';
                    audioEl.autoplay = true;
                    audioEl.controls = false;
                    audioEl.style.display = 'none';
                    document.body.appendChild(audioEl);
                }
                audioEl.muted = false;
                audioEl.srcObject = new MediaStream([mixedAudioTrack]);
            }

            // Send mixed audio to all peers
            this.peers.forEach((peer) => {
                const pc = peer.pc;
                const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (videoSender) videoSender.replaceTrack(screenTrack).catch(() => { });

                if (mixedAudioTrack) {
                    const audioSender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
                    if (audioSender) {
                        audioSender.replaceTrack(mixedAudioTrack).catch(() => { });
                    }
                }
            });

            this.screenStream = screenStream;
            this.screenTrack = screenTrack;
            this.screenAudioTracks = mixedAudioTrack;
            this.isScreenSharing = true;

            if (this.ui && this.ui.elements && this.ui.elements.shareScreenBtn) this.ui.elements.shareScreenBtn.textContent = '停止分享';

            this.ui.showNotification('開始分享螢幕');

            screenTrack.onended = () => {
                this.stopScreenShare();
            };
        } catch (err) {
            console.warn('startScreenShare error', err);
            this.ui.showNotification('無法開始分享螢幕', true);
        }
    }

    async startRecording() {
        if (this.isRecording) return;

        // Auto-start screen sharing if not active
        if (!this.isScreenSharing) {
            await this.startScreenShare();
            if (!this.isScreenSharing) return; // User cancelled or failed
        }

        try {
            // Create a canvas to combine screen video + audio
            const displayStream = this.ui.elements.localVideo.srcObject;
            console.log('DEBUG startRecording: displayStream=', displayStream);
            if (!displayStream) {
                this.ui.showNotification('無螢幕內容可錄製', true);
                return;
            }

            // MediaRecorder will capture the combined stream
            const mimeType = 'video/webm;codecs=vp9,opus';
            console.log('DEBUG startRecording: MediaRecorder.isTypeSupported(vp9) =', MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus'));
            console.log('DEBUG startRecording: MediaRecorder.isTypeSupported(vp8) =', MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus'));
            const options = { mimeType };

            // Fallback mime types if vp9 not supported
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8,opus';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'video/webm';
                }
            }

            this.mediaRecorder = new MediaRecorder(displayStream, options);
            console.log('DEBUG startRecording: created MediaRecorder, mimeType=', this.mediaRecorder.mimeType, 'state=', this.mediaRecorder.state);
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstart = () => {
                console.log('DEBUG mediaRecorder onstart, state=', this.mediaRecorder.state);
            };

            this.mediaRecorder.onstop = () => {
                console.log('DEBUG mediaRecorder onstop, chunks=', this.recordedChunks.length);
                const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
                const url = URL.createObjectURL(blob);

                // Create download link
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `screen-recording-${new Date().getTime()}.webm`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);

                this.ui.showNotification('錄製已儲存並下載');
            };

            this.mediaRecorder.start();
            console.log('DEBUG mediaRecorder started, state=', this.mediaRecorder.state);
            this.isRecording = true;

            // Update UI
            if (this.ui && this.ui.elements && this.ui.elements.recordScreenBtn) {
                this.ui.elements.recordScreenBtn.textContent = '停止錄製';
                this.ui.elements.recordScreenBtn.style.color = 'red';
            }
            if (this.ui && this.ui.elements && this.ui.elements.recordingIndicator) {
                this.ui.elements.recordingIndicator.style.display = 'inline';
            }

            this.ui.showNotification('開始錄製螢幕');
        } catch (err) {
            console.warn('startRecording error', err);
            this.ui.showNotification('無法開始錄製', true);
        }
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;

        console.log('DEBUG stopRecording: stopping mediaRecorder, state=', this.mediaRecorder && this.mediaRecorder.state);
        try { this.mediaRecorder.stop(); } catch (e) { console.warn('stop mediaRecorder error', e); }
        this.isRecording = false;

        // Update UI
        if (this.ui && this.ui.elements && this.ui.elements.recordScreenBtn) {
            this.ui.elements.recordScreenBtn.textContent = '開始錄製';
            this.ui.elements.recordScreenBtn.style.color = '';
        }
        if (this.ui && this.ui.elements && this.ui.elements.recordingIndicator) {
            this.ui.elements.recordingIndicator.style.display = 'none';
        }

        this.ui.showNotification('停止錄製');
    }

    toggleRecording() {
        if (this.isRecording) return this.stopRecording();
        return this.startRecording();
    }

    async stopScreenShare() {
        if (!this.isScreenSharing) return;

        try {
            if (this.screenStream) {
                this.screenStream.getTracks().forEach(t => { try { t.stop(); } catch (e) { } });
            }
        } catch (e) { }

        const cameraTrack = this.localStream ? this.localStream.getVideoTracks()[0] : null;
        const localAudioTrack = this.localStream ? this.localStream.getAudioTracks()[0] : null;

        this.peers.forEach((peer) => {
            const pc = peer.pc;
            if (cameraTrack) {
                const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (videoSender) videoSender.replaceTrack(cameraTrack).catch(() => { });
            }
            if (localAudioTrack) {
                const audioSender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
                if (audioSender) audioSender.replaceTrack(localAudioTrack).catch(() => { });
            }
        });

        if (this._audioMixer) {
            try {
                if (this._audioMixer.audioContext) this._audioMixer.audioContext.close().catch(() => { });
            } catch (e) { }
            this._audioMixer = null;
        }

        try {
            const audioEl = document.getElementById('localMixedAudio');
            if (audioEl) {
                audioEl.pause();
                audioEl.srcObject = null;
                if (audioEl.parentNode) audioEl.parentNode.removeChild(audioEl);
            }
        } catch (e) { }

        this.ui.elements.localVideo.srcObject = this.localStream;

        // Stop recording if active
        if (this.isRecording) {
            this.stopRecording();
        }

        this.isScreenSharing = false;
        this.screenStream = null;
        this.screenTrack = null;
        this.screenAudioTracks = null;

        // Stop recording if active
        if (this.isRecording) {
            this.stopRecording();
        }

        if (this.ui && this.ui.elements && this.ui.elements.shareScreenBtn) this.ui.elements.shareScreenBtn.textContent = '分享螢幕';
        this.ui.showNotification('停止分享螢幕');
    }

    async toggleScreenShare() {
        if (this.isScreenSharing) return this.stopScreenShare();
        return this.startScreenShare();
    }

    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
            this.ui.elements.localVideo.srcObject = null;
        }
    }

    toggleMedia(type) {
        if (type === 'video') {
            this.mediaState.camera = !this.mediaState.camera;
            this.ui.elements.toggleCamera.textContent = this.mediaState.camera ? '關閉鏡頭' : '開啟鏡頭';
        } else {
            this.mediaState.mic = !this.mediaState.mic;
            this.ui.elements.toggleMic.textContent = this.mediaState.mic ? '關閉麥克風' : '開啟麥克風';
        }
        this.updateMediaTracks();
    }

    updateMediaTracks() {
        if (!this.localStream) return;
        this.localStream.getVideoTracks().forEach(t => t.enabled = this.mediaState.camera);
        this.localStream.getAudioTracks().forEach(t => t.enabled = this.mediaState.mic);
    }

    isLive() {
        return this.mode === 'live';
    }

    amHost() {
        return !!this.user && this.hostUserId === this.user.id;
    }

    connectSocket(roomId, token) {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${window.location.host}/ws?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(this.user.id)}&token=${encodeURIComponent(token)}`;

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => console.log('✅ WS Connected');
        this.socket.onclose = (ev) => {
            console.log('⚠️ WS Closed', ev.code, ev.reason);
            if (!this.currentRoom) return;
            if (ev.code === 4003) this.ui.showNotification('連線未授權，請重新加入房間', true);
            else if (ev.code !== 4005) this.ui.showNotification('已斷開連線', true);
        };
        this.socket.onerror = (err) => console.error('WS Error', err);

        this.socket.onmessage = async (e) => {
            try {
                const msg = JSON.parse(e.data);
                await this.handleSignal(msg);
            } catch (err) {
                console.error('Signal Error', err);
            }
        };
    }

    sendSignal(type, payload = {}) {
        // Special-case: transfer-host should go through server REST API so server
        // updates room state and broadcasts 'host-transferred' to all sockets.
        if (type === 'transfer-host') {
            const roomId = this.currentRoom && this.currentRoom.id;
            if (!roomId) return;
            fetch(`${CONFIG.API_BASE}/api/rooms/${roomId}/transfer-host`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.user.id, newHostUserId: payload.newHostUserId })
            }).then(async res => {
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    this.ui.showNotification(data.message || '轉移房主失敗', true);
                }
                // 成功時伺服器會廣播 host-transferred
            }).catch(err => console.warn('transfer-host REST failed', err));
            return;
        }

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, ...payload }));
        }
    }

    async handleSignal(msg) {
        switch (msg.type) {
            case 'room-state':
                this.handleRoomState(msg);
                break;
            case 'user-joined':
                this.handleUserJoined(msg.user);
                break;
            case 'user-left':
                this.handleUserLeft(msg.userId);
                break;
            case 'offer':
                await this.handleOffer(msg);
                break;
            case 'answer':
                await this.handleAnswer(msg);
                break;
            case 'candidate':
                await this.handleCandidate(msg);
                break;
            case 'chat':
                this.ui.appendMessage(msg, this.user.id, { hostId: this.hostUserId, myName: this.user.displayName });
                break;
            case 'reaction':
                // 自己按的表情已經在本地顯示過了
                if (msg.from.userId !== this.user.id) this.ui.createReaction(msg.emoji, msg.from.userId);
                break;
            case 'host-transferred':
                await this.handleHostTransfer(msg);
                break;
            case 'notification':
                this.ui.showNotification(msg.message, msg.isError);
                break;

            // ---- 房主權限管理 ----
            case 'mute-state': {
                if (msg.muted) this.muted.add(msg.userId); else this.muted.delete(msg.userId);
                const isMe = msg.userId === this.user.id;
                this.ui.appendSystemMessage(`${msg.byName} ${msg.muted ? '將' : '解除了'} ${isMe ? '你' : msg.targetName} ${msg.muted ? '禁言' : '的禁言'}`);
                if (isMe) {
                    this.ui.setChatMuted(msg.muted);
                    this.ui.showNotification(msg.muted ? '你已被房主禁言' : '房主解除了你的禁言', msg.muted);
                }
                this.updateParticipantsUI();
                break;
            }
            case 'user-kicked':
                this.ui.appendSystemMessage(`${msg.targetName} 被房主移出了房間`);
                break;
            case 'kicked':
                if (this.onKicked) this.onKicked(msg.byName);
                break;

            // ---- KTV 點歌佇列 ----
            case 'queue-update':
                this.applyQueueState(msg);
                break;

            case 'song-request': {
                // Someone is requesting current user to sing a song
                this.ui.showSongRequestNotification(msg.requesterName, msg.songName, msg.artistName, msg.requesterId);
                break;
            }
            case 'song-request-accepted': {
                this.ui.showNotification(`${msg.responderName} 接受了點歌`);
                break;
            }
            case 'song-request-rejected': {
                this.ui.showNotification(`${msg.responderName} 拒絕了點歌`, true);
                break;
            }
            case 'poll-started': {
                const poll = msg.poll;
                if (!poll) break;
                this.currentPollId = poll.id;
                const counts = poll.counts || (poll.options ? poll.options.map(() => 0) : []);
                this.ui.renderPoll(poll, this.amHost(), counts);
                break;
            }
            case 'poll-update': {
                if (msg.pollId && Array.isArray(msg.counts)) {
                    this.ui.updatePollCounts(msg.counts);
                }
                break;
            }
            case 'poll-ended': {
                const poll = msg.poll;
                if (poll && Array.isArray(poll.counts)) {
                    // show final counts then clear after a short delay
                    this.ui.updatePollCounts(poll.counts);
                    this.ui.showNotification('投票已結束');
                }
                this.currentPollId = null;
                setTimeout(() => this.ui.clearPollDisplay(), 3000);
                break;
            }

            // 收到開啟白板訊號：打開白板，但不要再回傳訊號給對方
            case 'whiteboard-open': {
                this.ui.showWhiteboard(false);
                this.ui.showNotification('夥伴開啟了白板');
                break;
            }
            case 'whiteboard-draw': {
                const { x0, y0, x1, y1, color } = msg;
                const canvas = this.ui.elements.whiteboardCanvas;

                // 如果收到畫畫指令，但白板是關著的，就強制幫他打開 (被動開啟)
                if (this.ui.elements.whiteboardModal.classList.contains('hidden')) {
                    this.ui.showWhiteboard(false);
                }

                if (canvas) {
                    const w = canvas.width;
                    const h = canvas.height;
                    // 如果寬高是 0 (可能剛開啟還沒 render)，稍微延遲一下再畫
                    if (w === 0 || h === 0) {
                        setTimeout(() => this.ui.drawStroke(x0 * canvas.width, y0 * canvas.height, x1 * canvas.width, y1 * canvas.height, color), 50);
                    } else {
                        this.ui.drawStroke(x0 * w, y0 * h, x1 * w, y1 * h, color);
                    }
                }
                break;
            }
            case 'whiteboard-clear': {
                this.ui.clearCanvas();
                this.ui.showNotification('有人清除了白板');
                break;
            }
        }
    }

    handleRoomState(msg) {
        this.hostUserId = msg.hostUserId;
        this.mode = msg.mode || 'call';
        this.participants = new Map();
        this.muted = new Set(msg.muted || []);

        this.ui.elements.roomName.textContent = this.currentRoom.name;
        this.ui.applyRoomMode(this.mode, this.amHost(), this.currentRoom.hasPassword);
        this.ui.setChatMuted(this.muted.has(this.user.id));

        if (msg.participants) {
            msg.participants.forEach(p => {
                if (p.userId === this.user.id) return;
                this.participants.set(p.userId, p);
                if (!this.isLive()) {
                    // 視訊通話：新加入的人主動和每個人建立連線（mesh）
                    this.createPeerConnection(p.userId, true);
                } else if (this.amHost()) {
                    // 直播：只有房主推流給每位觀眾
                    this.createPeerConnection(p.userId, true);
                }
                // 直播觀眾：什麼都不做，等房主送 offer 過來
            });
        }
        // If there's an active poll included in room state, render it
        if (msg.currentPoll) {
            this.currentPollId = msg.currentPoll.id;
            this.ui.renderPoll(msg.currentPoll, this.amHost(), msg.currentPoll.counts || (msg.currentPoll.options ? msg.currentPoll.options.map(() => 0) : []));
        }
        this.applyQueueState(msg);
        this.updateParticipantsUI();
        this.startStatsMonitor();
    }

    handleUserJoined(user) {
        if (user.userId === this.user.id) return;
        this.participants.set(user.userId, user);
        this.ui.showNotification(`${user.displayName} ${this.isLive() ? '進來看直播了' : '加入房間'}`);
        this.updateParticipantsUI();
        // 視訊通話：等新成員送 offer 過來。
        // 直播：房主主動把直播畫面推給新觀眾。
        if (this.isLive() && this.amHost()) {
            this.createPeerConnection(user.userId, true);
        }
    }

    handleUserLeft(userId) {
        const p = this.participants.get(userId);
        if (p) this.ui.showNotification(`${p.displayName} 離開房間`);
        this.participants.delete(userId);
        this.closePeer(userId);
        this.ui.removeVideoCard(userId);
        this.updateParticipantsUI();
    }

    // --- 改良版 createPeerConnection (含除錯與連線修復) ---
    async createPeerConnection(targetUserId, isInitiator) {
        if (this.peers.has(targetUserId)) return this.peers.get(targetUserId).pc;

        console.log(`[WebRTC] 正在建立與 ${targetUserId} 的連線 (發起者: ${isInitiator})`);

        const pc = new RTCPeerConnection(CONFIG.ICE_SERVERS);

        // Add local tracks（直播觀眾沒有 localStream，只接收不傳送）
        if (this.localStream) {
            const videoTrack = (this.isScreenSharing && this.screenTrack) ? this.screenTrack : this.localStream.getVideoTracks()[0];
            const audioTrack = (this.isScreenSharing && this.screenAudioTracks) ? this.screenAudioTracks : this.localStream.getAudioTracks()[0];
            if (videoTrack) pc.addTrack(videoTrack, this.localStream);
            if (audioTrack) pc.addTrack(audioTrack, this.localStream);
        }

        pc.ontrack = (event) => {
            console.log(`[WebRTC] 收到 ${targetUserId} 的影像串流`);
            const user = this.participants.get(targetUserId);
            if (user) {
                const videoEl = this.ui.ensureVideoCard(user, user.userId === this.hostUserId);
                // 直接使用對方傳過來的原始 Stream (解決 iOS/Safari 黑屏問題)
                if (event.streams && event.streams[0]) {
                    videoEl.srcObject = event.streams[0];
                    videoEl.play().catch(e => console.warn('自動播放被阻擋:', e));
                }
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal('candidate', { targetUserId, candidate: event.candidate });
            }
        };

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            console.log(`[WebRTC] 與 ${targetUserId} 的連線狀態: ${state}`);
            if (state === 'failed' || state === 'disconnected') {
                const name = (this.participants.get(targetUserId) || {}).displayName || targetUserId;
                this.ui.showNotification(`與 ${name} 的連線不穩定 (${state})`, true);
            }
        };

        // pendingCandidates：remote description 還沒設定好之前先收到的 ICE candidate 要先排隊
        this.peers.set(targetUserId, { pc, pendingCandidates: [], lastStats: null });

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.sendSignal('offer', { targetUserId, offer });
        }

        return pc;
    }

    async handleOffer(msg) {
        const { from, offer } = msg;
        const pc = await this.createPeerConnection(from.userId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await this.flushCandidates(from.userId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal('answer', { targetUserId: from.userId, answer });
    }

    async handleAnswer(msg) {
        const { from, answer } = msg;
        const peer = this.peers.get(from.userId);
        if (peer) {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
            await this.flushCandidates(from.userId);
        }
    }

    async handleCandidate(msg) {
        const { from, candidate } = msg;
        const peer = this.peers.get(from.userId);
        if (!peer) return;
        if (!peer.pc.remoteDescription) {
            peer.pendingCandidates.push(candidate);
            return;
        }
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn('addIceCandidate', e));
    }

    async flushCandidates(userId) {
        const peer = this.peers.get(userId);
        if (!peer || !peer.pendingCandidates.length) return;
        const list = peer.pendingCandidates.splice(0);
        for (const c of list) {
            await peer.pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn('addIceCandidate', e));
        }
    }

    closePeer(userId) {
        const peer = this.peers.get(userId);
        if (peer) {
            peer.pc.close();
            this.peers.delete(userId);
        }
    }

    async handleHostTransfer(msg) {
        const newHost = msg.newHostUserId || msg.hostUserId || msg.newHostId || msg.newHost;
        if (!newHost) {
            console.warn('handleHostTransfer: no host id in message', msg);
            return;
        }
        const prevHost = this.hostUserId;
        if (newHost === prevHost) return;

        this.hostUserId = newHost;
        this.muted.delete(newHost);
        const isMe = this.user && this.user.id === newHost;
        const name = isMe ? '你' : ((this.participants.get(newHost) || {}).displayName || '');
        this.ui.showNotification(name ? `房主已變更：${name}` : '房主已變更');
        this.ui.appendSystemMessage(`👑 ${isMe ? '你' : name} 成為新房主`);
        if (isMe) this.ui.setChatMuted(false);

        if (this.isLive()) {
            await this.switchBroadcaster(prevHost);
        } else {
            this.participants.forEach(p => this.ui.ensureVideoCard(p, p.userId === this.hostUserId));
        }
        this.updateParticipantsUI();
    }

    // 直播換房主：舊房主停止推流、新房主開鏡頭重新推流給所有觀眾
    async switchBroadcaster(prevHost) {
        // 這段必須同步執行完，才不會吃掉新房主馬上送來的 offer
        Array.from(this.peers.keys()).forEach(id => this.closePeer(id));
        document.querySelectorAll('.video-card:not([data-user="self"])').forEach(c => c.remove());

        if (prevHost === this.user.id) {
            if (this.isScreenSharing) await this.stopScreenShare();
            this.stopLocalStream();
        }
        this.ui.applyRoomMode(this.mode, this.amHost(), this.currentRoom && this.currentRoom.hasPassword);

        if (this.amHost()) {
            const ok = this.localStream ? true : await this.initLocalStream();
            if (!ok) {
                this.ui.showNotification('無法開啟鏡頭，觀眾暫時看不到畫面', true);
                return;
            }
            this.ui.applyRoomMode(this.mode, true, this.currentRoom && this.currentRoom.hasPassword);
            this.participants.forEach(p => this.createPeerConnection(p.userId, true));
        }
    }

    updateParticipantsUI() {
        if (!this.user || !this.participants) return;
        const list = [
            { userId: this.user.id, displayName: this.user.displayName },
            ...Array.from(this.participants.values())
        ];

        this.ui.updateParticipants(list, this.hostUserId, this.user.id, (targetId) => {
            // 伺服器確認後會廣播 host-transferred，所有人（包含自己）一起更新
            this.sendSignal('transfer-host', { newHostUserId: targetId });
        }, {
            muted: this.muted,
            onMute: (targetUserId, muted) => this.sendSignal('mute-user', { targetUserId, muted }),
            onKick: (targetUserId) => this.sendSignal('kick-user', { targetUserId }),
        });

        if (this.isLive()) {
            const viewers = list.filter(p => p.userId !== this.hostUserId).length;
            this.ui.updateViewerCount(viewers);
        }
    }

    /* ---------- KTV 點歌佇列 ---------- */
    applyQueueState(msg) {
        if (!('nowPlaying' in msg)) return;
        // 伺服器時間和本機時間的差，用來讓每個人的歌詞捲動同步
        if (msg.serverNow) this.clockOffset = msg.serverNow - Date.now();
        const np = msg.nowPlaying || null;
        const prevId = this.queueState && this.queueState.nowPlaying ? this.queueState.nowPlaying.id : null;
        const prevLen = this.queueState ? (this.queueState.queue || []).length : 0;
        this.queueState = { nowPlaying: np, queue: msg.queue || [] };

        this.ui.renderQueue(this.queueState, {
            isHost: this.amHost(),
            myId: this.user.id,
            changed: (np ? np.id : null) !== prevId || this.queueState.queue.length !== prevLen,
        }, (id) => this.sendSignal('queue-remove', { id }));

        const newId = np ? np.id : null;
        if (newId === this.ui.queueSongId) return;
        this.ui.queueSongId = newId;
        if (np) {
            const singer = np.singer ? np.singer.displayName : '大家';
            this.ui.appendSystemMessage(`🎤 現在由 ${singer} 演唱《${np.song}》`);
            const localStart = np.startedAt - (this.clockOffset || 0);
            this.ui.fetchAndDisplayLyrics(np.song, np.artist, { silent: true }).then(ok => {
                if (ok && this.ui.queueSongId === np.id) this.ui.startAutoScroll(localStart, 0, true);
            });
        } else {
            this.ui.resetPrompter();
        }
    }

    /* ---------- 網路品質監測（RTCPeerConnection.getStats）---------- */
    startStatsMonitor() {
        this.stopStatsMonitor();
        this.statsTimer = setInterval(() => this.collectStats().catch(e => console.warn('stats', e)), CONFIG.STATS_INTERVAL_MS);
    }

    stopStatsMonitor() {
        if (this.statsTimer) clearInterval(this.statsTimer);
        this.statsTimer = null;
    }

    async collectStats() {
        const results = [];
        for (const [userId, peer] of this.peers) {
            const report = await peer.pc.getStats();
            let rtt = null, lost = 0, received = 0, remoteLoss = null, hasInbound = false;
            report.forEach(r => {
                if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated && r.currentRoundTripTime != null) {
                    rtt = r.currentRoundTripTime * 1000;
                }
                if (r.type === 'inbound-rtp') {
                    hasInbound = true;
                    lost += r.packetsLost || 0;
                    received += r.packetsReceived || 0;
                }
                if (r.type === 'remote-inbound-rtp' && r.fractionLost != null) {
                    remoteLoss = Math.max(remoteLoss || 0, r.fractionLost);
                }
            });

            // 丟包率用「這 2 秒內」的增量計算，不是累計值
            let lossPct = 0;
            if (hasInbound && received > 0) {
                const prev = peer.lastStats || { lost: 0, received: 0 };
                const dLost = Math.max(0, lost - prev.lost);
                const dRecv = Math.max(0, received - prev.received);
                lossPct = dLost + dRecv > 0 ? (dLost / (dLost + dRecv)) * 100 : 0;
                peer.lastStats = { lost, received };
            } else if (remoteLoss != null) {
                lossPct = remoteLoss * 100; // 只送不收（直播房主）：看對方回報的丟包
            }

            const state = peer.pc.iceConnectionState;
            let quality;
            if (state === 'failed' || state === 'disconnected') quality = 'poor';
            else if (rtt == null) quality = 'unknown';
            else if (rtt < 150 && lossPct < 2) quality = 'good';
            else if (rtt < 400 && lossPct < 8) quality = 'fair';
            else quality = 'poor';

            const info = {
                quality,
                rtt,
                lossPct,
                text: rtt == null ? null : `${Math.round(rtt)}ms`,
                title: rtt == null ? '連線建立中…' : `延遲 ${Math.round(rtt)} ms · 丟包 ${lossPct.toFixed(1)}%`,
            };
            results.push({ userId, info });
            this.ui.updateNetBadge(userId, info);
        }

        // 直播房主看不到觀眾畫面，把所有觀眾連線狀況彙整顯示在自己的畫面上
        if (this.isLive() && this.amHost()) {
            const order = { poor: 3, fair: 2, unknown: 1, good: 0 };
            const known = results.filter(r => r.info.rtt != null);
            if (!results.length) {
                this.ui.updateNetBadge('self', { quality: 'unknown', text: '等待觀眾', title: '目前沒有觀眾' });
            } else {
                const worst = results.reduce((a, b) => (order[b.info.quality] > order[a.info.quality] ? b : a));
                const avg = known.length ? known.reduce((sum, r) => sum + r.info.rtt, 0) / known.length : null;
                this.ui.updateNetBadge('self', {
                    quality: worst.info.quality,
                    text: `${results.length} 位觀眾${avg != null ? ' · ' + Math.round(avg) + 'ms' : ''}`,
                    title: results.map(r => `${(this.participants.get(r.userId) || {}).displayName || r.userId}：${r.info.title}`).join('\n'),
                });
            }
        }
    }
}

/**
 * Main Application Controller
 */
class App {
    constructor() {
        this.ui = new UIManager();
        this.room = new RoomManager(this.ui);
        this.currentUserSinging = false;
        this.bindEvents();
        // Bind UI-specific handlers (lyrics modal + poll modal + song request modal)
        this.ui.bindLyricsEvents && this.ui.bindLyricsEvents();
        this.ui.bindPollEvents && this.ui.bindPollEvents();
        this.ui.bindSongRequestEvents && this.ui.bindSongRequestEvents();
        this.ui.bindWhiteboardEvents(this.room);
        this.ui.bindMentionEvents();
        this.room.onKicked = (byName) => this.handleKicked(byName);

        // 彈幕預設開啟，記住使用者上次的選擇
        let danmakuOn = true;
        try { danmakuOn = localStorage.getItem('welive.danmaku') !== '0'; } catch (e) { }
        this.ui.setDanmakuEnabled(danmakuOn);
        this.ui.updateAutoScrollButton();
    }

    bindEvents() {
        // Profile
        this.ui.elements.profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = this.ui.elements.displayNameInput.value.trim();
            if (name) {
                this.room.user = { id: this.generateId(), displayName: name };
                this.ui.updateIdentity(this.room.user);
                this.loadRooms();
            }
        });

        this.ui.elements.changeNameBtn.addEventListener('click', () => {
            if (this.room.currentRoom) {
                this.ui.showNotification('請先離開房間', true);
                return;
            }
            this.room.user = null;
            this.ui.updateIdentity(null);
        });

        // Rooms
        this.ui.elements.createRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = this.ui.elements.newRoomName.value.trim();
            if (!name) return;
            const modeInput = document.querySelector('input[name="roomMode"]:checked');
            const mode = modeInput ? modeInput.value : 'call';
            const password = (this.ui.elements.newRoomPassword && this.ui.elements.newRoomPassword.value || '').trim();

            if (!this.room.user) {
                this.ui.showNotification('請先設定暱稱', true);
                return;
            }

            try {
                const res = await fetch(`${CONFIG.API_BASE}/api/rooms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, userId: this.room.user.id, displayName: this.room.user.displayName, mode, password })
                });
                let data = null;
                try { data = await res.json(); } catch (_) { /* 非 JSON 回應 */ }
                if (!res.ok || !data || !data.room) {
                    const reason = (data && data.message) || `伺服器回應 ${res.status}（請確認是用 node server.js 開啟網站，而不是直接開 index.html 或 Live Server）`;
                    console.error('建立房間失敗：', res.status, data);
                    this.ui.showNotification(`建立房間失敗：${reason}`, true);
                    return;
                }
                this.ui.elements.newRoomName.value = '';
                if (this.ui.elements.newRoomPassword) this.ui.elements.newRoomPassword.value = '';
                this.joinRoom(data.room.id, { name: data.room.name });
            } catch (err) {
                console.error('建立房間失敗：', err);
                this.ui.showNotification(`建立房間失敗：無法連線到伺服器（${err.message}）`, true);
            }
        });

        // Conference
        this.ui.elements.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());

        this.ui.elements.toggleCamera.addEventListener('click', () => this.room.toggleMedia('video'));
        this.ui.elements.toggleMic.addEventListener('click', () => this.room.toggleMedia('audio'));
        if (this.ui.elements.shareScreenBtn) {
            this.ui.elements.shareScreenBtn.addEventListener('click', async () => {
                // ensure local stream available
                if (!this.room.localStream) {
                    const ok = await this.room.initLocalStream();
                    if (!ok) return;
                }
                this.room.toggleScreenShare();
            });
        }

        if (this.ui.elements.recordScreenBtn) {
            this.ui.elements.recordScreenBtn.addEventListener('click', () => {
                this.room.toggleRecording();
            });
        }

        // Poll creation (host) and voting
        if (this.ui.elements.createPollBtn) {
            this.ui.elements.createPollBtn.addEventListener('click', () => {
                const q = (this.ui.elements.pollQuestionInput && this.ui.elements.pollQuestionInput.value || '').trim();
                const multipleChoice = this.ui.elements.pollMultipleChoice && this.ui.elements.pollMultipleChoice.checked;

                // Get all option values
                const optionInputs = document.querySelectorAll('.poll-option-input');
                const opts = Array.from(optionInputs).map(input => (input.value || '').trim()).filter(s => s.length > 0);

                if (!q || opts.length < 2) {
                    this.ui.showNotification('請輸入問題，並至少建立兩個選項', true);
                    return;
                }

                // send start-poll to server (server will validate host)
                this.room.sendSignal('start-poll', { question: q, options: opts, multipleChoice });

                // hide modal and clear inputs
                if (this.ui.elements.pollModal) this.ui.elements.pollModal.classList.add('hidden');
                this.ui.clearPollForm();
                this.ui.showNotification('投票已發出');
            });
        }

        // Poll container (delegated clicks for voting / end poll)
        if (this.ui.elements.pollContainer) {
            this.ui.elements.pollContainer.addEventListener('click', (e) => {
                const target = e.target;
                if (!target) return;
                // vote button
                if (target.classList && target.classList.contains('poll-option')) {
                    const idx = Number(target.dataset.index);
                    if (!this.room.currentRoom) return;
                    const pollId = this.room.currentPollId || null;
                    // prefer manager-stored currentPollId
                    const id = this.room.currentPollId || pollId || null;
                    if (!id) return;
                    this.room.sendSignal('vote', { pollId: id, optionIndex: idx });
                    this.ui.showNotification('已送出投票');
                    return;
                }

                // end poll (host only)
                if (target.id === 'endPollBtn') {
                    if (this.room.hostUserId !== this.room.user.id) {
                        this.ui.showNotification('只有房主可以結束投票', true);
                        return;
                    }
                    this.room.sendSignal('end-poll', {});
                    return;
                }
            });
            // close button on floating poll window
            const closeBtn = this.ui.elements.pollContainer.querySelector('#closePollWindow');
            if (closeBtn) {
                closeBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    this.ui.clearPollDisplay();
                });
            }
        }

        // Song request events
        if (this.ui.elements.confirmSongRequestBtn) {
            this.ui.elements.confirmSongRequestBtn.addEventListener('click', () => {
                const targetSelect = this.ui.elements.songRequestTarget;
                const targetUserId = targetSelect && targetSelect.value;
                const songName = (this.ui.elements.requestSongName && this.ui.elements.requestSongName.value || '').trim();
                const artistName = (this.ui.elements.requestSongArtist && this.ui.elements.requestSongArtist.value || '').trim();

                if (!targetUserId || !songName) {
                    this.ui.showNotification('請選擇成員並輸入歌名', true);
                    return;
                }

                // Check if target is currently singing
                const targetParticipant = this.room.participants.get(targetUserId);
                if (targetParticipant && targetParticipant.isSinging) {
                    this.ui.showSongAlreadySinging();
                    return;
                }

                // Send song request
                this.room.sendSignal('song-request', {
                    targetUserId,
                    requesterName: this.room.user.displayName,
                    songName,
                    artistName
                });

                // Hide modal and clear
                if (this.ui.elements.songRequestModal) this.ui.elements.songRequestModal.classList.add('hidden');
                this.ui.showNotification('點歌已發送');
            });
        }

        if (this.ui.elements.acceptSongRequestBtn) {
            this.ui.elements.acceptSongRequestBtn.addEventListener('click', () => {
                const req = this.ui.pendingSongRequest || {};
                // 伺服器收到後會把這首歌排進 KTV 佇列，演唱者是自己
                this.room.sendSignal('song-request-accepted', {
                    songName: req.songName,
                    artistName: req.artistName,
                    requesterId: req.requesterId
                });
                if (this.ui.elements.songRequestNotification) {
                    this.ui.elements.songRequestNotification.classList.add('hidden');
                }
            });
        }
        if (this.ui.elements.rejectSongRequestBtn) {
            this.ui.elements.rejectSongRequestBtn.addEventListener('click', () => {
                this.room.sendSignal('song-request-rejected', {});
            });
        }

        // ---- 側邊欄分頁 ----
        this.ui.elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this.ui.switchTab(btn.dataset.tab));
        });

        // ---- 彈幕開關 ----
        if (this.ui.elements.danmakuToggle) {
            this.ui.elements.danmakuToggle.addEventListener('click', () => {
                this.ui.setDanmakuEnabled(!this.ui.danmakuEnabled);
            });
        }

        // ---- KTV 點歌佇列 ----
        this.ui.elements.queueAddForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const song = this.ui.elements.queueSongInput.value.trim();
            const artist = this.ui.elements.queueArtistInput.value.trim();
            if (!song) return;
            this.room.sendSignal('queue-add', { song, artist });
            this.ui.elements.queueSongInput.value = '';
            this.ui.elements.queueArtistInput.value = '';
            this.ui.showNotification(`已點歌：${song}`);
        });
        this.ui.elements.queueNextBtn.addEventListener('click', () => this.room.sendSignal('queue-next'));
        this.ui.elements.autoScrollBtn.addEventListener('click', () => this.ui.toggleAutoScroll());
        this.ui.elements.scrollSpeed.addEventListener('change', () => {
            const a = this.ui.autoScroll;
            if (!a || !a.running) return;
            if (a.synced) {
                // 仍以歌曲開始時間為準，選同樣速度的人會看到同一行
                this.ui.startAutoScroll(a.anchorTime, 0, true);
            } else {
                // 手動調整過進度：從目前這一行繼續
                this.ui.startAutoScroll(Date.now(), Math.max(0, this.ui.prompterIndex));
            }
        });

        this.ui.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.ui.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        this.ui.elements.reactionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const emoji = btn.dataset.emoji;
                this.ui.createReaction(emoji, 'self');
                this.room.sendSignal('reaction', { emoji });
            });
        });
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    async loadRooms() {
        try {
            const res = await fetch(`${CONFIG.API_BASE}/api/rooms`);
            const data = await res.json();
            this.ui.renderRooms(data.rooms || [], (room) => this.joinRoom(room.id, { name: room.name, needPassword: room.hasPassword }));
        } catch (e) {
            console.error(e);
        }
    }

    async joinRoom(roomId, opts = {}) {
        if (this.joining) return;
        this.joining = true;
        try {
            let password = null;
            if (opts.needPassword) {
                password = await this.ui.askPassword(opts.name || '');
                if (password == null) return;
            }

            // 1. 先向伺服器報到（檢查密碼、黑名單、人數），拿到房間模式與通行證
            let data;
            for (; ;) {
                const res = await fetch(`${CONFIG.API_BASE}/api/rooms/${roomId}/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: this.room.user.id, displayName: this.room.user.displayName, password })
                });
                data = await res.json().catch(() => ({}));
                if (res.ok) break;
                if (res.status === 401 && data.needPassword) {
                    password = await this.ui.askPassword(opts.name || '', password ? data.message : null);
                    if (password == null) return;
                    continue;
                }
                throw new Error(data.message || `伺服器回應 ${res.status}`);
            }

            // 2. 視訊通話：每個人都要開鏡頭；直播：只有房主開鏡頭，觀眾只看
            const room = data.room;
            const needCamera = room.mode !== 'live' || room.hostUserId === this.room.user.id;
            if (needCamera) {
                if (!await this.room.initLocalStream()) {
                    this.notifyLeave(roomId);
                    return;
                }
            } else {
                this.room.stopLocalStream();
            }

            this.room.currentRoom = room;
            this.room.mode = room.mode;
            this.room.hostUserId = room.hostUserId;
            this.ui.applyRoomMode(room.mode, room.hostUserId === this.room.user.id, room.hasPassword);
            this.ui.toggleConferenceMode(true);
            this.room.connectSocket(roomId, data.token);
        } catch (e) {
            console.error('加入房間失敗：', e);
            this.ui.showNotification(`加入房間失敗：${e.message}`, true);
            this.room.stopLocalStream();
            this.loadRooms();
        } finally {
            this.joining = false;
        }
    }

    notifyLeave(roomId) {
        fetch(`${CONFIG.API_BASE}/api/rooms/${roomId}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: this.room.user.id })
        }).catch(() => { });
    }

    async leaveRoom(opts = {}) {
        const room = this.room.currentRoom;
        // 先清掉 currentRoom，避免 socket 關閉時跳出「已斷開連線」
        this.room.currentRoom = null;
        // 房主離開時，伺服器會自動把房主交給下一位成員
        if (room && !opts.skipServer) this.notifyLeave(room.id);

        this.room.stopStatsMonitor();
        if (this.room.isScreenSharing) await this.room.stopScreenShare();
        this.room.stopLocalStream();
        if (this.room.socket) this.room.socket.close();
        this.room.peers.forEach(p => p.pc.close());
        this.room.peers.clear();
        this.room.participants = new Map();
        this.room.muted = new Set();
        this.room.queueState = null;
        this.room.mode = 'call';
        this.ui.clearPollDisplay();

        this.ui.clearConference();
        this.ui.toggleConferenceMode(false);
        this.loadRooms();
    }

    handleKicked(byName) {
        this.leaveRoom({ skipServer: true });
        this.ui.showNotification(`你已被房主${byName ? ' ' + byName + ' ' : ''}移出房間`, true);
    }

    sendMessage() {
        const text = this.ui.elements.messageInput.value.trim();
        if (text) {
            this.room.sendSignal('chat', { text });
            this.ui.elements.messageInput.value = '';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});



