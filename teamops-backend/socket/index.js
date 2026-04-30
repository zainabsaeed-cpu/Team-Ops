const { Activity, Notification, Card, User } = require('../models');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('New client connected', socket.id);

        socket.on('board:join', ({ boardId }) => {
            socket.join(`board:${boardId}`);
            console.log(`Socket ${socket.id} joined board ${boardId}`);
        });

        socket.on('board:leave', ({ boardId }) => {
            socket.leave(`board:${boardId}`);
        });

        socket.on('card:move', async (data) => {
            const { boardId, actorId, cardId, activity } = data;

            socket.to(`board:${boardId}`).emit('card:moved', data);

            if (activity) {
                io.to(`board:${boardId}`).emit('activity:new', {
                    id: `${Date.now()}-${Math.random()}`,
                    action: activity,
                    created_at: new Date().toISOString(),
                });
            }

            if (actorId) {
                const actor = await User.findById(actorId).lean();
                const card = await Card.findById(cardId).lean();
                if (actor && card && card.assignee && card.assignee.toString() !== actorId.toString()) {
                    const notification = await Notification.create({
                        user: card.assignee,
                        message: `${actor.name} moved your card "${card.title}"`,
                    });
                    io.to(`board:${boardId}`).emit('notification:new', {
                        id: notification._id.toString(),
                        message: notification.message,
                        is_read: notification.is_read,
                        created_at: notification.createdAt,
                    });
                }
            }
        });

        socket.on('card:create', async (data) => {
            socket.to(`board:${data.workspaceId}`).emit('card:created', data);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected', socket.id);
        });
    });
};
