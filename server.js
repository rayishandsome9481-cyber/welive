const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

// 房間資料：roomId -> { id, name, hostUserId, createdAt, members: Map<userId, { userId, displayName }> }
const rooms = new Map();
// 房間連線：roomId -> Map<userId, WebSocket>
const roomSockets = new Map();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function getRoomParticipants(room, excludeUserId) {
    if (!room) return [];
    return Array.from(room.members.values()).filter(member => member.userId !== excludeUserId);
}

app.get('/api/rooms', (req, res) => {
    const list = Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        hostUserId: room.hostUserId,
        memberCount: room.members.size,
        createdAt: room.createdAt,
    }));
    res.json({ rooms: list });
});

app.post('/api/rooms', (req, res) => {
    const { name, userId, displayName } = req.body || {};
    if (!name || !name.trim() || !userId || !displayName || !displayName.trim()) {
        return res.status(400).json({ message: '資料不完整' });
    }

    const room = {
        id: uuidv4(),
        name: name.trim(),
        hostUserId: userId,
        createdAt: new Date().toISOString(),
        members: new Map(),
    };
    // 創建者自動加入房間
    room.members.set(userId, { userId, displayName: displayName.trim().slice(0, 32) });
    rooms.set(room.id, room);
    res.status(201).json({ 
        room: { id: room.id, name: room.name, hostUserId: room.hostUserId },
        participants: Array.from(room.members.values())
    });
});

app.post('/api/rooms/:roomId/join', (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (!room) {
        return res.status(404).json({ message: '房間不存在' });
    }
    const { userId, displayName } = req.body || {};
    if (!userId || !displayName || !displayName.trim()) {
        return res.status(400).json({ message: '資料不完整' });
    }
    const safeName = displayName.trim().slice(0, 32);
    room.members.set(userId, { userId, displayName: safeName });

    const participants = Array.from(room.members.values());
    res.json({
        room: { id: room.id, name: room.name, hostUserId: room.hostUserId },
        participants,
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

    room.members.delete(userId);
    removeSocket(room.id, userId);
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
    
    // 轉移房主
    room.hostUserId = newHostUserId;
    
    // 廣播給所有房間成員
    broadcastToRoom(room.id, {
        type: 'host-transferred',
        newHostUserId: newHostUserId,
        fromUserId: userId
    });
    
    res.json({ message: '房主已轉移', hostUserId: newHostUserId });
});

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

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');
    const userId = url.searchParams.get('userId');
    const displayNameParam = url.searchParams.get('displayName') || '';
    const displayName = decodeURIComponent(displayNameParam).trim();

    if (!roomId || !userId || !displayName) {
        ws.close(4001, 'Missing credentials');
        return;
    }

    const room = rooms.get(roomId);
    if (!room) {
        ws.close(4004, 'Room not found');
        return;
    }

    room.members.set(userId, { userId, displayName });

    ws.userId = userId;
    ws.roomId = roomId;
    ws.displayName = displayName;
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    if (!roomSockets.has(roomId)) {
        roomSockets.set(roomId, new Map());
    }
    roomSockets.get(roomId).set(userId, ws);

    const existingParticipants = getRoomParticipants(room, userId);
    ws.send(JSON.stringify({ 
        type: 'room-state', 
        participants: existingParticipants,
        hostUserId: room.hostUserId,
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

    ws.on('message', (message) => {
        let payload;
        try {
            payload = JSON.parse(message);
        } catch (e) {
            console.warn('⚠️ Invalid JSON from client, ignoring');
            return;
        }

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
                const text = typeof payload.text === 'string' ? payload.text.trim() : '';
                if (!text) return;
                broadcastToRoom(roomId, {
                    type: 'chat',
                    text,
                    from: { userId, displayName },
                    timestamp: Date.now()
                });
                break;
            }
            case 'start-poll': {
                // Only current room host may start a poll
                const roomObj = rooms.get(roomId);
                if (!roomObj) return;
                if (roomObj.hostUserId !== userId) {
                    // send back an error to requester
                    forwardToTarget(roomId, userId, { type: 'notification', message: '只有房主可以發起投票', isError: true });
                    return;
                }
                const question = typeof payload.question === 'string' ? payload.question.trim() : '';
                const options = Array.isArray(payload.options) ? payload.options.map(o => (typeof o === 'string' ? o.trim() : String(o))).filter(o => o.length > 0) : [];
                if (!question || options.length < 2) {
                    forwardToTarget(roomId, userId, { type: 'notification', message: '請提供問題與至少兩個選項', isError: true });
                    return;
                }
                // ensure single active poll per room
                if (roomObj.currentPoll) {
                    forwardToTarget(roomId, userId, { type: 'notification', message: '已有進行中的投票，請先結束它', isError: true });
                    return;
                }
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
                const roomObj = rooms.get(roomId);
                if (!roomObj || !roomObj.currentPoll) return;
                const poll = roomObj.currentPoll;
                const pollId = payload.pollId;
                const optionIndex = Number.isFinite(payload.optionIndex) ? payload.optionIndex : parseInt(payload.optionIndex);
                if (poll.id !== pollId) return;
                if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) return;

                // Remove any previous votes by this user
                poll.votes.forEach((set) => set.delete(userId));
                // Add this vote
                poll.votes[optionIndex].add(userId);

                // compute counts
                const counts = poll.votes.map(s => s.size);

                // broadcast updated counts (no voter identities)
                broadcastToRoom(roomId, {
                    type: 'poll-update',
                    pollId: poll.id,
                    counts
                });
                return;
            }
            case 'end-poll': {
                const roomObj = rooms.get(roomId);
                if (!roomObj || !roomObj.currentPoll) return;
                // only host can end
                if (roomObj.hostUserId !== userId) {
                    forwardToTarget(roomId, userId, { type: 'notification', message: '只有房主可以結束投票', isError: true });
                    return;
                }
                const poll = roomObj.currentPoll;
                const counts = poll.votes.map(s => s.size);
                // broadcast final results
                broadcastToRoom(roomId, {
                    type: 'poll-ended',
                    poll: { id: poll.id, question: poll.question, options: poll.options, counts }
                });
                // clear poll state
                delete roomObj.currentPoll;
                return;
            }
            case 'reaction': {
                const emoji = typeof payload.emoji === 'string' ? payload.emoji : '';
                if (!emoji) return;
                broadcastToRoom(roomId, {
                    type: 'reaction',
                    emoji,
                    from: { userId, displayName }
                });
                break;
            }

            // ... (接在 case 'reaction' 之後)

            // ★★★ 新增：白板功能訊號轉發 ★★★
            case 'whiteboard-open':
            case 'whiteboard-draw':
            case 'whiteboard-clear': {
                // 直接將收到的封包廣播給房間內「除了自己以外」的所有人
                broadcastToRoom(roomId, payload, userId);
                break;
            }

            // ... (接續原本的 case 'song-request' ...)
            case 'song-request': {
                // Forward song request to target user
                const targetUserId = payload.targetUserId;
                if (!targetUserId) return;
                forwardToTarget(roomId, targetUserId, {
                    type: 'song-request',
                    requesterName: displayName,
                    songName: payload.songName,
                    artistName: payload.artistName,
                    requesterId: userId
                });
                break;
            }
            case 'song-request-accepted': {
                // Find the original requester and send them the acceptance notification
                // For now, broadcast to room so everyone knows
                broadcastToRoom(roomId, {
                    type: 'song-request-accepted',
                    responderName: displayName
                });
                break;
            }
            case 'song-request-rejected': {
                // Broadcast rejection
                broadcastToRoom(roomId, {
                    type: 'song-request-rejected',
                    responderName: displayName
                });
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
        removeSocket(roomId, userId);
        const currentRoom = rooms.get(roomId);
        if (currentRoom) {
            currentRoom.members.delete(userId);
            broadcastToRoom(roomId, {
                type: 'user-left',
                userId
            }, userId);
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
            try { ws.terminate(); } catch {}
            return;
        }
        ws.isAlive = false;
        try { ws.ping(); } catch {}
    });
}, 30000);

server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});

