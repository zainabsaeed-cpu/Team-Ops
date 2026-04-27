const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../models');

exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
            [name, email, hashed]
        );
        const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ user: result.rows[0], token });
    } catch (err) {
        res.status(400).json({ error: 'Email already exists' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};