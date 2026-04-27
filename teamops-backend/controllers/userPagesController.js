const pool = require('../models');

exports.getAnalytics = async (req, res) => {
    // Return static metrics as requested
    res.json({
        metrics: [
            { label: 'Completed Tasks', value: 24 },
            { label: 'Pending Tasks', value: 12 },
            { label: 'Efficiency', value: '88%' }
        ],
        trend: [5, 10, 8, 15, 12, 20]
    });
};

exports.getActivityFeed = async (req, res) => {
    try {
        // Fetch real activity if workspaceId is provided, else mock/global
        const result = await pool.query(
            'SELECT a.*, u.name as user_name FROM activities a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 20'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMembers = async (req, res) => {
    try {
        const { workspaceId } = req.query;
        let query = 'SELECT u.id, u.name, u.email, u.avatar_url, wm.role FROM users u JOIN workspace_members wm ON u.id = wm.user_id';
        let params = [];
        
        if (workspaceId) {
            query += ' WHERE wm.workspace_id = $1';
            params.push(workspaceId);
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getAchievements = (req, res) => {
    res.json([
        { id: 1, title: 'Early Bird', description: 'Complete a task before 9 AM', icon: '🌅' },
        { id: 2, title: 'Team Player', description: 'Collaborate on 5 tasks', icon: '🤝' }
    ]);
};

exports.getSchedule = (req, res) => {
    res.json([
        { id: 1, title: 'Daily Standup', time: '10:00 AM' },
        { id: 2, title: 'Product Review', time: '02:00 PM' }
    ]);
};

exports.getMessages = (req, res) => {
    res.json([
        { id: 1, from: 'Zainab', content: 'Hey, did you check the new designs?', time: '2 mins ago' },
        { id: 2, from: 'Ahmed', content: 'The PR is ready for review.', time: '1 hour ago' }
    ]);
};

exports.getSettings = async (req, res) => {
    // Mock settings as requested
    res.json({
        notifications: true,
        darkMode: false,
        language: 'en'
    });
};

exports.updateSettings = async (req, res) => {
    // For now, just return success
    res.json({ message: 'Settings updated', settings: req.body });
};
