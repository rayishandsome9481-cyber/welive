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
    MAX_PARTICIPANTS: 2
};

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
            closeWhiteboardBtn: document.getElementById('closeWhiteboardBtn')
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

    fetchAndDisplayLyrics(song, artist) {
        const elems = this.elements;
        // Call server-side lyrics endpoint (uses Genius API)
        const resultEl = document.getElementById('lyricsResult');
        if (resultEl) {
            resultEl.classList.remove('hidden');
            resultEl.textContent = '搜尋中…';
        }

        // If triggered from song request, we might want to show the modal if it's hidden
        if (elems.lyricsModal && elems.lyricsModal.classList.contains('hidden')) {
            elems.lyricsModal.classList.remove('hidden');
        }
        // Fill inputs if empty (or overwrite if we want to show what's playing)
        if (elems.songInput) elems.songInput.value = song;
        if (elems.artistInput) elems.artistInput.value = artist || '';

        fetch(`${CONFIG.API_BASE}/api/lyrics`, {
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
            if (clearBtn) clearBtn.classList.remove('hidden');

            // Reset state
            this.prompterIndex = -1;
            this.jumpToIndex(0);

            // Close the lyrics modal on success
            if (elems.lyricsModal) elems.lyricsModal.classList.add('hidden');

        }).catch(err => {
            console.error(err);
            if (resultEl) resultEl.textContent = '找不到歌詞 (' + err.message + ')';
            this.showNotification('找不到歌詞', true);
        });
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
                // Auto-target the first other participant
                let targetUserId = null;
                if (this.currentParticipants && this.currentParticipants.length > 0) {
                    targetUserId = this.currentParticipants[0].userId;
                }

                const songName = elems.requestSongName.value.trim(); // 取得歌名
                const artist = elems.requestSongArtist.value.trim(); // 取得歌手

                if (!targetUserId) {
                    this.showNotification('沒有其他成員在線', true);
                    return;
                }
                if (!songName) {
                    this.showNotification('請輸入歌名', true);
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

                    this.showNotification(`點歌請求已送出: ${songName}`);

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
                    const { songName, artistName } = this.pendingSongRequest;
                    this.fetchAndDisplayLyrics(songName, artistName);
                    this.showNotification(`已接受點歌：${songName}`);
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

        elems.songRequestModal.classList.remove('hidden');
    }

    showSongRequestNotification(requesterName, songName, artistName) {
        const elems = this.elements;
        if (!elems || !elems.songRequestNotification) return;

        // Store pending request details
        this.pendingSongRequest = { requesterName, songName, artistName };

        if (elems.songRequestContent) {
            elems.songRequestContent.innerHTML = `<h4>${requesterName} 希望你唱 <strong>${songName}</strong>${artistName ? ' (' + artistName + ')' : ''}</h4>`;
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
        notif.style.backgroundColor = isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(15, 23, 42, 0.9)';
        notif.classList.remove('hidden');

        if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            notif.classList.add('hidden');
        }, 3000);

    }

    advancePrompter() {
        // advance one line (used by container click)
        if (!this.prompterLines || !this.prompterLines.length) return;
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

    jumpToIndex(index) {
        // Jump prompter and result to a specific line index
        if (!Number.isFinite(index)) return;
        if (!this.prompterLines || !this.prompterLines.length) return;
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
            empty.textContent = '尚無房間，成為第一個建立者吧！';
            empty.style.opacity = '0.7';
            empty.style.textAlign = 'center';
            empty.style.padding = '20px';
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

            const sub = document.createElement('span');
            sub.textContent = `在線人數：${room.memberCount}`;

            meta.appendChild(title);
            meta.appendChild(sub);

            const joinBtn = document.createElement('button');
            joinBtn.type = 'button';

            if ((room.memberCount || 0) >= CONFIG.MAX_PARTICIPANTS) {
                joinBtn.textContent = '房間已滿';
                joinBtn.disabled = true;
                joinBtn.style.opacity = '0.5';
                joinBtn.style.cursor = 'not-allowed';
            } else {
                joinBtn.textContent = '加入';
                joinBtn.addEventListener('click', () => onJoin(room.id));
            }

            li.appendChild(meta);
            li.appendChild(joinBtn);
            this.elements.roomsList.appendChild(li);
        });
    }

    updateParticipants(participants, hostId, currentUserId, onTransferHost) {
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

            const info = document.createElement('span');
            info.textContent = `${p.displayName}${isSelf ? ' (自己)' : ''}${isHost ? ' 👑' : ''}`;
            li.appendChild(info);

            if (currentUserId === hostId && !isSelf && !isHost) {
                const btn = document.createElement('button');
                btn.textContent = '設為房主';
                btn.style.padding = '4px 8px';
                btn.style.fontSize = '10px';
                btn.addEventListener('click', () => onTransferHost(p.userId));
                li.appendChild(btn);
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

    appendMessage(msg, currentUserId) {
        const { from, text, timestamp } = msg;
        if (!text) return;

        const message = document.createElement('div');
        const isSelf = from && from.userId === currentUserId;
        message.classList.add('message', isSelf ? 'self' : 'other');

        const content = document.createElement('div');
        content.textContent = text;

        const meta = document.createElement('div');
        meta.classList.add('meta');
        const time = timestamp ? new Date(timestamp) : new Date();
        const formatted = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        meta.textContent = `${from ? from.displayName : '系統'} · ${formatted}`;

        message.appendChild(content);
        message.appendChild(meta);

        this.elements.messages.appendChild(message);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
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
    }

    async initLocalStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.ui.elements.localVideo.srcObject = this.localStream;
            this.updateMediaTracks();
            return true;
        } catch (err) {
            console.error('Media Error:', err);
            this.ui.showNotification('無法存取相機或麥克風', true);
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

    connectSocket(roomId) {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${window.location.host}/ws?roomId=${roomId}&userId=${this.user.id}&displayName=${encodeURIComponent(this.user.displayName)}`;

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => console.log('✅ WS Connected');
        this.socket.onclose = () => {
            console.log('⚠️ WS Closed');
            if (this.currentRoom) this.ui.showNotification('已斷開連線', true);
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
            try {
                const roomId = this.currentRoom && this.currentRoom.id;
                if (!roomId) return;
                fetch(`${CONFIG.API_BASE}/api/rooms/${roomId}/transfer-host`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: this.user.id, newHostUserId: payload.newHostUserId })
                }).then(res => res.json()).then(() => {
                    // server will broadcast host-transferred; nothing else to do here
                }).catch(err => console.warn('transfer-host REST failed', err));
            } catch (err) {
                console.warn('transfer-host error', err);
            }
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
                this.ui.appendMessage(msg, this.user.id);
                break;
            case 'reaction':
                this.ui.createReaction(msg.emoji, msg.from.userId);
                break;
            case 'host-transferred':
                this.handleHostTransfer(msg);
                break;
            case 'notification':
                this.ui.showNotification(msg.message, msg.isError);
                break;
            case 'song-request': {
                // Someone is requesting current user to sing a song
                const requesterName = msg.requesterName;
                const songName = msg.songName;
                const artistName = msg.artistName;
                this.ui.showSongRequestNotification(requesterName, songName, artistName);
                break;
            }
            case 'song-request-accepted': {
                this.ui.showNotification(`${msg.responderName} 接受了你的點歌`);
                break;
            }
            case 'song-request-rejected': {
                this.ui.showNotification(`${msg.responderName} 拒絕了你的點歌`, true);
                break;
            }
            case 'singing-started': {
                this.currentUserSinging = true;
                break;
            }
            case 'singing-ended': {
                this.currentUserSinging = false;
                break;
            }
            case 'poll-started': {
                const poll = msg.poll;
                if (!poll) break;
                this.currentPollId = poll.id;
                const isHost = (this.hostUserId === this.user.id);
                const counts = poll.counts || (poll.options ? poll.options.map(() => 0) : []);
                this.ui.renderPoll(poll, isHost, counts);
                break;
            }
            case 'poll-update': {
                // update counts
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
                // clear UI (keep results visible briefly)
                setTimeout(() => this.ui.clearPollDisplay(), 3000);
                break;
            }
            // ... (在 switch 語句內) ...

            // 1. 新增：處理開啟白板訊號
            case 'whiteboard-open': {
                // 收到訊號時，開啟白板，但傳入 false 代表不要再回傳訊號給對方
                this.ui.showWhiteboard(false);
                this.ui.showNotification('夥伴開啟了白板');
                break;
            }

            // 2. 修改：收到畫畫訊號時
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
            
            // ... (原本的 case whiteboard-clear ...)
            case 'whiteboard-clear': {
                this.ui.clearCanvas();
                this.ui.showNotification('有人清除了白板');
                break;
            }
        }
    }

    handleRoomState(msg) {
        this.hostUserId = msg.hostUserId;
        this.participants = new Map();

        // Update UI for self
        this.ui.elements.roomName.textContent = this.currentRoom.name;

        // Process participants
        if (msg.participants) {
            msg.participants.forEach(p => {
                if (p.userId !== this.user.id) {
                    this.participants.set(p.userId, p);
                    this.createPeerConnection(p.userId, true); // Initiate connection
                }
            });
        }
        // If there's an active poll included in room state, render it
        if (msg.currentPoll) {
            this.currentPollId = msg.currentPoll.id;
            const isHost = (this.hostUserId === this.user.id);
            this.ui.renderPoll(msg.currentPoll, isHost, msg.currentPoll.counts || (msg.currentPoll.options ? msg.currentPoll.options.map(() => 0) : []));
        }
        this.updateParticipantsUI();
    }

    handleUserJoined(user) {
        if (user.userId === this.user.id) return;
        this.participants.set(user.userId, user);
        this.ui.showNotification(`${user.displayName} 加入房間`);
        this.updateParticipantsUI();
        // Wait for offer from new user (or initiate if we are host/older peer - simplified here to let joiner initiate via room-state logic usually, but actually room-state is for joiner. Existing peers wait for offer.)
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
        
        // 修正：直接使用對方的 Stream，不手動組裝，相容性較好
        // const remoteStream = new MediaStream(); <-- 舊的不需要了

        // Add local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
        }

        // ★★★ 關鍵修正 1：更穩定的畫面接收邏輯 ★★★
        pc.ontrack = (event) => {
            console.log(`[WebRTC] 收到 ${targetUserId} 的影像串流`);
            
            const user = this.participants.get(targetUserId);
            if (user) {
                // 確保視訊卡片存在
                const videoEl = this.ui.ensureVideoCard(user, user.userId === this.hostUserId);
                
                // 直接使用對方傳過來的原始 Stream (解決 iOS/Safari 黑屏問題)
                if (event.streams && event.streams[0]) {
                    videoEl.srcObject = event.streams[0];
                    
                    // 嘗試播放 (解決部分瀏覽器自動播放限制)
                    videoEl.play().catch(e => console.warn('自動播放被阻擋:', e));
                }
            }
        };

        // ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal('candidate', { targetUserId, candidate: event.candidate });
            }
        };

        // ★★★ 關鍵修正 2：加入連線狀態監聽 (這樣才知道發生什麼事) ★★★
        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            console.log(`[WebRTC] 與 ${targetUserId} 的連線狀態: ${state}`);
            
            if (state === 'failed' || state === 'disconnected') {
                this.ui.showNotification(`與 ${targetUserId} 的連線不穩定 (${state})`, true);
            }
            if (state === 'connected') {
                console.log(`[WebRTC] 成功連線！應該要看到畫面了`);
            }
        };

        // 這裡不需要存 remoteStream 了，因為我們直接用 event.streams[0]
        this.peers.set(targetUserId, { pc });

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
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal('answer', { targetUserId: from.userId, answer });
    }

    async handleAnswer(msg) {
        const { from, answer } = msg;
        const peer = this.peers.get(from.userId);
        if (peer) {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    async handleCandidate(msg) {
        const { from, candidate } = msg;
        const peer = this.peers.get(from.userId);
        if (peer) {
            await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    closePeer(userId) {
        const peer = this.peers.get(userId);
        if (peer) {
            peer.pc.close();
            this.peers.delete(userId);
        }
    }

    handleHostTransfer(msg) {
        // Accept multiple possible property names from server payloads
        const newHost = msg.newHostUserId || msg.hostUserId || msg.newHostId || msg.newHost;
        console.debug('handleHostTransfer received', { msg, newHost, currentHost: this.hostUserId, participantsCount: this.participants.size });
        if (!newHost) {
            console.warn('handleHostTransfer: no host id in message', msg);
            return;
        }

        this.hostUserId = newHost;
        const name = (this.participants.get(newHost) && this.participants.get(newHost).displayName) || (this.user && this.user.id === newHost ? this.user.displayName : null);
        this.ui.showNotification(name ? `房主已變更：${name}` : '房主已變更');

        // Update participants UI so the new host sees the transfer buttons
        this.updateParticipantsUI();

        // Re-organize video layout
        this.participants.forEach(p => {
            this.ui.ensureVideoCard(p, p.userId === this.hostUserId);
        });
    }

    updateParticipantsUI() {
        const list = [
            { userId: this.user.id, displayName: this.user.displayName },
            ...Array.from(this.participants.values())
        ];

        this.ui.updateParticipants(list, this.hostUserId, this.user.id, (targetId) => {
            // Optimistically apply host transfer locally so UI updates immediately
            // (server should also broadcast a host-transferred event)
            if (this.hostUserId === this.user.id) {
                this.hostUserId = targetId;
                // Trigger local handler to update UI/layout
                this.handleHostTransfer({ newHostUserId: targetId });
            }

            // Notify server of host transfer
            this.sendSignal('transfer-host', { newHostUserId: targetId });
        });
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

            try {
                const res = await fetch(`${CONFIG.API_BASE}/api/rooms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, userId: this.room.user.id, displayName: this.room.user.displayName })
                });
                const data = await res.json();
                if (data.room) {
                    this.joinRoom(data.room.id);
                }
            } catch (err) {
                this.ui.showNotification('建立房間失敗', true);
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
                this.room.sendSignal('song-request-accepted', {
                    responderName: this.room.user.displayName
                });
                if (this.ui.elements.songRequestNotification) {
                    this.ui.elements.songRequestNotification.classList.add('hidden');
                }
            });
        }

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
            this.ui.renderRooms(data.rooms || [], (id) => this.joinRoom(id));
        } catch (e) {
            console.error(e);
        }
    }

    async joinRoom(roomId) {
        if (!await this.room.initLocalStream()) return;

        try {
            const res = await fetch(`${CONFIG.API_BASE}/api/rooms/${roomId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.room.user.id, displayName: this.room.user.displayName })
            });

            if (!res.ok) throw new Error('Join failed');

            const data = await res.json();
            this.room.currentRoom = data.room;
            this.ui.toggleConferenceMode(true);
            this.room.connectSocket(roomId);
        } catch (e) {
            this.ui.showNotification('加入房間失敗', true);
            this.room.stopLocalStream();
        }
    }

    async leaveRoom() {
        if (this.room.currentRoom) {
            try {
                // If current user is the host, attempt to transfer host to another participant before leaving
                if (this.room.hostUserId === this.room.user.id && this.room.participants && this.room.participants.size > 0) {
                    const nextHostId = this.room.participants.keys().next().value;
                    if (nextHostId) {
                        // Optimistically transfer locally and notify server
                        this.room.hostUserId = nextHostId;
                        this.room.handleHostTransfer({ newHostUserId: nextHostId });
                        this.room.sendSignal('transfer-host', { newHostUserId: nextHostId });
                    }
                }

                await fetch(`${CONFIG.API_BASE}/api/rooms/${this.room.currentRoom.id}/leave`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: this.room.user.id })
                }).catch(() => { });
            } catch (err) {
                console.warn('leaveRoom: transfer attempt failed', err);
            }
        }

        this.room.currentRoom = null;
        this.room.stopLocalStream();
        if (this.room.socket) this.room.socket.close();
        this.room.peers.forEach(p => p.pc.close());
        this.room.peers.clear();

        this.ui.clearConference();
        this.ui.toggleConferenceMode(false);
        this.loadRooms();
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



