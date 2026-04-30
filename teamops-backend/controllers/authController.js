const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Workspace, Column, formatUser } = require('../models');
const jwtSecret = process.env.JWT_SECRET || 'teamops-dev-secret';

const createStarterWorkspace = async (userId) => {
    const workspace = await Workspace.create({
        name: 'My Workspace',
        owner: userId,
        inviteCode: `invite-${Date.now().toString(36)}`,
        members: [{ user: userId, role: 'owner' }],
    });

    await Column.insertMany([
        { workspace: workspace._id, title: 'To Do', position: 0 },
        { workspace: workspace._id, title: 'In Progress', position: 1 },
        { workspace: workspace._id, title: 'Done', position: 2 },
    ]);

    return workspace;
};

exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, passwordHash: hashed });
        await createStarterWorkspace(user._id);

        const token = jwt.sign({ userId: user._id.toString() }, jwtSecret, { expiresIn: '7d' });
        res.status(201).json({ user: formatUser(user), token });
    } catch (err) {
        res.status(400).json({ error: 'Email already exists' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id.toString() }, jwtSecret, { expiresIn: '7d' });
        res.json({ user: formatUser(user), token });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};