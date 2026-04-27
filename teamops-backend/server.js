require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pool = require('./models');

const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const boardRoutes = require('./routes/boards');
const notificationRoutes = require('./routes/notifications');
const userPageRoutes = require('./routes/userPages');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user', userPageRoutes);

// Test DB
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'OK', db: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', db: err.message });
    }
});

// Socket.io
require('./socket')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});