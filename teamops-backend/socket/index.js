const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET || 'teamops-dev-secret';

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('New client connected', socket.id);

        // try to extract userId from token provided by client
        try {
            const token = socket.handshake.auth && socket.handshake.auth.token;
            if (token) {
                const decoded = jwt.verify(token, jwtSecret);
                socket.userId = decoded.userId;
                socket.join(`user:${decoded.userId}`);
            }
        } catch (e) {
            socket.userId = null;
        }

        const normalizeRoomId = (payload) => {
            if (!payload) return '';
            if (typeof payload === 'string') return payload;
            return payload.boardId || payload.userId || '';
        };

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
            console.log('Client disconnected', socket.id);
        });
    });
};
