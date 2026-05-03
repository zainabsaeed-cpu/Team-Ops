require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { connectDB, seedDatabase, mongoose, User } = require('./models');

const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const boardRoutes = require('./routes/boards');
const cardRoutes = require('./routes/cards');
const columnRoutes = require('./routes/columns');
const activityRoutes = require('./routes/activities');
const notificationRoutes = require('./routes/notifications');
const userPageRoutes = require('./routes/userPages');

const app = express();
const server = http.createServer(app);
const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedCorsOrigins = Array.from(new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...configuredCorsOrigins,
]));
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedCorsOrigins.includes(origin) || allowedCorsOrigins.includes('*')) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin ${origin}`));
  },
  credentials: true,
};
const io = new Server(server, {
  cors: {
    origin: allowedCorsOrigins.includes('*') ? '*' : allowedCorsOrigins,
    credentials: true,
  },
});

// expose io to express app for controller access
app.set('io', io);

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user', userPageRoutes);

// Test DB
app.get('/api/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'OK', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', db: err.message });
  }
});

// Socket.io
require('./socket')(io);

const PORT = process.env.PORT || 5002;

async function seedDatabaseIfEmpty() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Seed skipped: production environment');
    return;
  }

  const hasUsers = await User.exists({});

  if (hasUsers) {
    console.log('Seed skipped: database already has users');
    return;
  }

  await seedDatabase();
}

(async () => {
  try {
    await connectDB();
    await seedDatabaseIfEmpty();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
