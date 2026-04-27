const pool = require('../models');

exports.getCards = async (req, res) => {
    const { columnId } = req.params;
    const result = await pool.query('SELECT * FROM cards WHERE column_id = $1 ORDER BY position', [columnId]);
    res.json(result.rows);
};

exports.createCard = async (req, res) => {
    const { columnId } = req.params;
    const { title, description, priority, assignee_id, due_date, position } = req.body;
    const result = await pool.query(
        `INSERT INTO cards (column_id, title, description, priority, assignee_id, due_date, position) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [columnId, title, description, priority, assignee_id, due_date, position]
    );
    res.status(201).json(result.rows[0]);
};

exports.moveCard = async (req, res) => {
    const { cardId } = req.params;
    const { newColumnId, newPosition } = req.body;
    await pool.query(
        'UPDATE cards SET column_id = $1, position = $2, updated_at = NOW() WHERE id = $3',
        [newColumnId, newPosition, cardId]
    );
    res.json({ message: 'Card moved' });
};