const pool = require('../models');

exports.getColumns = async (req, res) => {
    const { workspaceId } = req.params;
    const result = await pool.query('SELECT * FROM columns WHERE workspace_id = $1 ORDER BY position', [workspaceId]);
    res.json(result.rows);
};

exports.createColumn = async (req, res) => {
    const { workspaceId } = req.params;
    const { title, position } = req.body;
    const result = await pool.query(
        'INSERT INTO columns (workspace_id, title, position) VALUES ($1, $2, $3) RETURNING *',
        [workspaceId, title, position]
    );
    res.status(201).json(result.rows[0]);
};