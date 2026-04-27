const pool = require('../models');

exports.getNotifications = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.readAllNotifications = async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
            [req.userId]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
