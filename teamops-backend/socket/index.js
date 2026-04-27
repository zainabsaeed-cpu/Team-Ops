const pool = require('../models');

// Store userId -> socketId mapping
const userSockets = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('New client connected', socket.id);

        socket.on('register', (userId) => {
            userSockets.set(userId, socket.id);
            console.log(`User ${userId} registered with socket ${socket.id}`);
        });

        socket.on('join-workspace', (workspaceId) => {
            socket.join(`workspace:${workspaceId}`);
            console.log(`Socket ${socket.id} joined workspace ${workspaceId}`);
        });

        socket.on('leave-workspace', (workspaceId) => {
            socket.leave(`workspace:${workspaceId}`);
        });

        socket.on('card:move', async (data) => {
            const { cardId, newColumnId, newPosition, workspaceId, userId } = data;
            
            try {
                // Update DB
                await pool.query(
                    'UPDATE cards SET column_id = $1, position = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                    [newColumnId, newPosition, cardId]
                );

                // Log Activity
                const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
                const userName = userResult.rows[0].name;
                const cardResult = await pool.query('SELECT title, assignee_id FROM cards WHERE id = $1', [cardId]);
                const card = cardResult.rows[0];
                
                const action = `${userName} moved card "${card.title}"`;
                const activityResult = await pool.query(
                    'INSERT INTO activities (workspace_id, user_id, action) VALUES ($1, $2, $3) RETURNING *',
                    [workspaceId, userId, action]
                );

                // Broadcast move
                socket.to(`workspace:${workspaceId}`).emit('card:moved', data);
                
                // Broadcast new activity
                io.to(`workspace:${workspaceId}`).emit('activity:new', activityResult.rows[0]);

                // Check for notifications (e.g., if assignee changed or if we want to notify assignee)
                if (card.assignee_id && card.assignee_id !== userId) {
                    const message = `${userName} moved your card "${card.title}"`;
                    const notifResult = await pool.query(
                        'INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *',
                        [card.assignee_id, message]
                    );
                    
                    const assigneeSocketId = userSockets.get(card.assignee_id);
                    if (assigneeSocketId) {
                        io.to(assigneeSocketId).emit('notification:new', notifResult.rows[0]);
                    }
                }
            } catch (err) {
                console.error('Socket card:move error:', err);
            }
        });

        socket.on('card:create', async (data) => {
            // Simplified broadcast
            socket.to(`workspace:${data.workspaceId}`).emit('card:created', data);
        });

        socket.on('disconnect', () => {
            // Remove from mapping
            for (const [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userSockets.delete(userId);
                    break;
                }
            }
            console.log('Client disconnected', socket.id);
        });
    });
};
