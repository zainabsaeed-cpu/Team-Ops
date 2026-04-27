const pool = require('../models');
const crypto = require('crypto');

exports.createWorkspace = async (req, res) => {
    const { name } = req.body;
    const ownerId = req.userId;
    const inviteCode = crypto.randomBytes(4).toString('hex');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const wsResult = await client.query(
            'INSERT INTO workspaces (name, owner_id, invite_code) VALUES ($1, $2, $3) RETURNING *',
            [name, ownerId, inviteCode]
        );
        await client.query(
            'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
            [wsResult.rows[0].id, ownerId, 'owner']
        );
        // Default columns
        const defaultColumns = ['To Do', 'In Progress', 'Done'];
        for (let i = 0; i < defaultColumns.length; i++) {
            await client.query(
                'INSERT INTO columns (workspace_id, title, position) VALUES ($1, $2, $3)',
                [wsResult.rows[0].id, defaultColumns[i], i]
            );
        }
        await client.query('COMMIT');
        res.status(201).json(wsResult.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

exports.getUserWorkspaces = async (req, res) => {
    const result = await pool.query(
        `SELECT w.* FROM workspaces w 
         JOIN workspace_members wm ON w.id = wm.workspace_id 
         WHERE wm.user_id = $1`,
        [req.userId]
    );
    res.json(result.rows);
};

exports.getWorkspaceById = async (req, res) => {
    const { workspaceId } = req.params;
    const result = await pool.query('SELECT * FROM workspaces WHERE id = $1', [workspaceId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Workspace not found' });
    res.json(result.rows[0]);
};

exports.addMember = async (req, res) => {
    const { workspaceId } = req.params;
    const { email, role } = req.body;
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    await pool.query(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [workspaceId, userResult.rows[0].id, role || 'member']
    );
    res.status(201).json({ message: 'Member added' });
};