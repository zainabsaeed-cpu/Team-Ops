require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB, seedDatabase, mongoose, User } = require('./models');
const csrfProtection = require('./middleware/csrf');

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
app.set('trust proxy', 1);
const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedCorsOrigins = Array.from(new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...configuredCorsOrigins,
]));
const isDevLocalOrigin = (origin) => (
  process.env.NODE_ENV !== 'production'
  && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
);
const corsOptions = {
  origin(origin, callback) {
    // Allow if no origin (server-to-server or same-site), or explicitly allowed,
    // or running locally in dev. Also accept Vercel preview domains ("*.vercel.app").
    const isVercelPreview = typeof origin === 'string' && origin.includes('.vercel.app');
    if (!origin || allowedCorsOrigins.includes(origin) || allowedCorsOrigins.includes('*') || isDevLocalOrigin(origin) || isVercelPreview) {
      return callback(null, true);
    }

    console.warn(`CORS blocked for origin ${origin}`);
    return callback(new Error(`CORS blocked for origin ${origin}`));
  },
  credentials: true,
};
const io = new Server(server, {
  cors: corsOptions,
});

// expose io to express app for controller access
app.set('io', io);

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(csrfProtection);

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
