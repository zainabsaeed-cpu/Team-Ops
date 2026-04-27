const pool = require('../models');

exports.getBoardData = async (req, res) => {
    const { boardId } = req.params; // boardId is workspaceId
    try {
        // Fetch workspace name
        const workspaceResult = await pool.query('SELECT name FROM workspaces WHERE id = $1', [boardId]);
        if (workspaceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Board not found' });
        }

        // Fetch columns
        const columnsResult = await pool.query(
            'SELECT * FROM columns WHERE workspace_id = $1 ORDER BY position',
            [boardId]
        );

        // Fetch cards for each column
        const columns = await Promise.all(columnsResult.rows.map(async (col) => {
            const cardsResult = await pool.query(
                'SELECT * FROM cards WHERE column_id = $1 ORDER BY position',
                [col.id]
            );
            return { ...col, cards: cardsResult.rows };
        }));

        // Fetch activity logs
        const activitiesResult = await pool.query(
            'SELECT * FROM activities WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 50',
            [boardId]
        );

        res.json({
            id: boardId,
            title: `${workspaceResult.rows[0].name} Board`,
            columns,
            activityLogs: activitiesResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.moveCard = async (req, res) => {
    const { boardId, cardId } = req.params;
    const { toColumnId, newIndex } = req.body;

    try {
        // Simple update: set new column and position
        // In a real app, you'd reorder other cards in the same column
        await pool.query(
            'UPDATE cards SET column_id = $1, position = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [toColumnId, newIndex, cardId]
        );

        // Optional: Log activity
        const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.userId]);
        const userName = userResult.rows[0].name;
        const cardResult = await pool.query('SELECT title FROM cards WHERE id = $1', [cardId]);
        const cardTitle = cardResult.rows[0].title;
        
        const action = `${userName} moved card "${cardTitle}"`;
        await pool.query(
            'INSERT INTO activities (workspace_id, user_id, action) VALUES ($1, $2, $3)',
            [boardId, req.userId, action]
        );

        res.json({ message: 'Card moved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
