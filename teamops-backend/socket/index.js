const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { SESSION_COOKIE_NAME } = require('../utils/authCookies');
const jwtSecret = process.env.JWT_SECRET || 'teamops-dev-secret';

module.exports = (io) => {
    const workspacePresence = new Map();

    const normalizeRoomId = (payload) => {
        if (!payload) return '';
        if (typeof payload === 'string') return payload;
        return payload.boardId || payload.workspaceId || payload.userId || '';
    };

    const getPresenceUserId = (socket) => String(socket.userId || socket.id);

    const emitWorkspacePresence = (workspaceId) => {
        if (!workspaceId) return;
        const users = workspacePresence.get(String(workspaceId));
        io.to(`workspace:${workspaceId}`).emit('workspace:presence', {
            workspaceId: String(workspaceId),
            count: users ? users.size : 0,
        });
    };

    const leaveWorkspacePresence = (socket, workspaceId = socket.workspacePresenceId) => {
        if (!workspaceId) return;
        const normalizedWorkspaceId = String(workspaceId);
        const users = workspacePresence.get(normalizedWorkspaceId);
        if (users) {
            const userId = getPresenceUserId(socket);
            const nextCount = (users.get(userId) || 1) - 1;
            if (nextCount > 0) {
                users.set(userId, nextCount);
            } else {
                users.delete(userId);
            }
            if (users.size === 0) workspacePresence.delete(normalizedWorkspaceId);
        }
        socket.leave(`workspace:${normalizedWorkspaceId}`);
        if (String(socket.workspacePresenceId || '') === normalizedWorkspaceId) {
            socket.workspacePresenceId = '';
        }
        emitWorkspacePresence(normalizedWorkspaceId);
    };

    const joinWorkspacePresence = (socket, payload) => {
        const workspaceId = normalizeRoomId(payload);
        if (!workspaceId) return;
        const normalizedWorkspaceId = String(workspaceId);
        if (socket.workspacePresenceId === normalizedWorkspaceId) {
            emitWorkspacePresence(normalizedWorkspaceId);
            return;
        }
        if (socket.workspacePresenceId && socket.workspacePresenceId !== normalizedWorkspaceId) {
            leaveWorkspacePresence(socket, socket.workspacePresenceId);
        }
        socket.workspacePresenceId = normalizedWorkspaceId;
        socket.join(`workspace:${normalizedWorkspaceId}`);
        if (!workspacePresence.has(normalizedWorkspaceId)) {
            workspacePresence.set(normalizedWorkspaceId, new Map());
        }
        const users = workspacePresence.get(normalizedWorkspaceId);
        const userId = getPresenceUserId(socket);
        users.set(userId, (users.get(userId) || 0) + 1);
        emitWorkspacePresence(normalizedWorkspaceId);
    };

    io.on('connection', (socket) => {
        console.log('New client connected', socket.id);

        // try to extract userId from token provided by client
        try {
            const cookies = cookie.parse(socket.handshake.headers.cookie || '');
            const token = cookies[SESSION_COOKIE_NAME];
            if (token) {
                const decoded = jwt.verify(token, jwtSecret);
                socket.userId = decoded.userId;
                socket.join(`user:${decoded.userId}`);
            }
        } catch (e) {
            socket.userId = null;
        }

        const joinBoard = (payload) => {
            const boardId = normalizeRoomId(payload);
            if (!boardId) return;
            socket.join(`board:${boardId}`);
            console.log(`Socket ${socket.id} joined board ${boardId}`);
        };

        const leaveBoard = (payload) => {
            const boardId = normalizeRoomId(payload);
            if (!boardId) return;
            socket.leave(`board:${boardId}`);
        };

        socket.on('join:board', joinBoard);
        socket.on('board:join', joinBoard);
        socket.on('leave:board', leaveBoard);
        socket.on('board:leave', leaveBoard);
        socket.on('workspace:join', (payload) => joinWorkspacePresence(socket, payload));
        socket.on('join:workspace', (payload) => joinWorkspacePresence(socket, payload));
        socket.on('workspace:leave', (payload) => leaveWorkspacePresence(socket, normalizeRoomId(payload)));
        socket.on('leave:workspace', (payload) => leaveWorkspacePresence(socket, normalizeRoomId(payload)));

        socket.on('join:user', (payload) => {
            if (!socket.userId) return;
            const userId = normalizeRoomId(payload);
            if (userId && String(userId) !== String(socket.userId)) return;
            socket.join(`user:${socket.userId}`);
        });

        socket.on('leave:user', (payload) => {
            if (!socket.userId) return;
            const userId = normalizeRoomId(payload);
            if (userId && String(userId) !== String(socket.userId)) return;
            socket.leave(`user:${socket.userId}`);
        });

        socket.on('disconnect', () => {
            leaveWorkspacePresence(socket);
            console.log('Client disconnected', socket.id);
        });
    });
};
