const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
require('dotenv').config()

mongoose.set('strictQuery', true)

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teamops'
let connectPromise = null

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!connectPromise) {
    connectPromise = mongoose.connect(mongoUri)
  }

  return connectPromise
}

const { Schema, Types } = mongoose

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
    verified: { type: Boolean, default: false },
    notifyEmail: { type: Boolean, default: true },
    notifyPush: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const verificationTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const workspaceInviteTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    techStack: { type: [String], default: [] },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteCode: { type: String, required: true, unique: true },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const boardSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true },
    color: { type: String, default: '#7c5cfc' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const columnSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    board: { type: Schema.Types.ObjectId, ref: 'Board', default: null, index: true },
    title: { type: String, required: true },
    position: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const cardSchema = new Schema(
  {
    column: { type: Schema.Types.ObjectId, ref: 'Column', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    assignee: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    dueDate: { type: Date, default: null },
    position: { type: Number, required: true },
  },
  { timestamps: true },
)

const activitySchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    action: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const User = mongoose.models.User || mongoose.model('User', userSchema)
const VerificationToken = mongoose.models.VerificationToken || mongoose.model('VerificationToken', verificationTokenSchema)
const WorkspaceInviteToken = mongoose.models.WorkspaceInviteToken || mongoose.model('WorkspaceInviteToken', workspaceInviteTokenSchema)
const Workspace = mongoose.models.Workspace || mongoose.model('Workspace', workspaceSchema)
const Board = mongoose.models.Board || mongoose.model('Board', boardSchema)
const Column = mongoose.models.Column || mongoose.model('Column', columnSchema)
const Card = mongoose.models.Card || mongoose.model('Card', cardSchema)
const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema)
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)

const toId = (value) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  if (value._id) {
    return value._id.toString()
  }

  return value.toString()
}

const formatDate = (value) => {
  if (!value) {
    return null
  }

  return new Date(value).toISOString().slice(0, 10)
}

const formatUser = (user) => ({
  id: toId(user._id),
  name: user.name,
  email: user.email,
  avatar_url: user.avatarUrl || null,
  avatarUrl: user.avatarUrl || null,
  auth_provider: user.authProvider || 'email',
  created_at: user.createdAt,
})

const formatWorkspace = (workspace, role, memberCount) => ({
  id: toId(workspace._id),
  name: workspace.name,
  description: workspace.description || '',
  tech_stack: Array.isArray(workspace.techStack) ? workspace.techStack : [],
  role,
  memberCount,
  inviteCode: workspace.inviteCode,
  inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?inviteCode=${encodeURIComponent(workspace.inviteCode || '')}`,
  boardId: toId(workspace._id),
})

const formatBoard = (board) => ({
  id: toId(board._id),
  workspace_id: toId(board.workspaceId),
  name: board.name,
  title: board.name,
  color: board.color || '#7c5cfc',
  created_at: board.createdAt,
})

const formatColumn = (column) => ({
  id: toId(column._id),
  workspace_id: toId(column.workspace),
  board_id: toId(column.board),
  title: column.title,
  position: column.position,
  created_at: column.createdAt,
})

const formatCard = (card) => ({
  id: toId(card._id),
  column_id: toId(card.column),
  title: card.title,
  description: card.description,
  priority: card.priority,
  assignee_id: toId(card.assignee),
  due_date: formatDate(card.dueDate),
  position: card.position,
  created_at: card.createdAt,
  updated_at: card.updatedAt,
})

const formatActivityLog = (activity) => ({
  id: toId(activity._id),
  user_id: toId(activity.userId || activity.user),
  workspace_id: toId(activity.workspaceId || activity.workspace),
  board_id: toId(activity.boardId || activity.board || activity.workspace),
  action: activity.action,
  message: activity.action,
  created_at: activity.createdAt,
})

const formatActivityFeed = (activity) => ({
  id: toId(activity._id),
  user_id: toId(activity.userId || activity.user),
  user_name: activity.user?.name || activity.userName || '',
  userName: activity.user?.name || activity.userName || '',
  workspace_id: toId(activity.workspaceId || activity.workspace),
  board_id: toId(activity.boardId || activity.board || activity.workspace),
  message: activity.action,
  action: activity.action,
  created_at: activity.createdAt,
  time: new Date(activity.createdAt).toLocaleString(),
})

const formatNotification = (notification) => ({
  id: toId(notification._id),
  message: notification.message,
  is_read: notification.is_read,
  created_at: notification.createdAt,
})

async function seedDatabase() {
  await connectDB()

  const existingUsers = await User.countDocuments()
  if (existingUsers > 0) {
    console.log('Database already seeded')
    return
  }

  const plainPassword = '123456'
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(plainPassword, salt)

  const usersToCreate = [
    { name: 'Zainab', email: 'zainab@teamops.dev', passwordHash, verified: true },
    { name: 'Ahmed', email: 'ahmed@teamops.dev', passwordHash, verified: true },
    { name: 'Zunairah', email: 'zunairah@teamops.dev', passwordHash, verified: true },
    { name: 'Hassan', email: 'hassan@teamops.dev', passwordHash, verified: true },
  ]

  const users = await User.insertMany(usersToCreate)

  const owner = users[0]
  const inviteCode = `TEAM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  const workspace = await Workspace.create({
    name: 'TeamOps Workspace',
    owner: owner._id,
    inviteCode,
    members: users.map((u) => ({ user: u._id, role: u._id.equals(owner._id) ? 'owner' : 'member' })),
  })

  const board = await Board.create({
    workspaceId: workspace._id,
    name: 'Sprint 4',
    color: '#7c5cfc',
  })

  const columnsToCreate = [
    { workspace: workspace._id, board: board._id, title: 'To Do', position: 0 },
    { workspace: workspace._id, board: board._id, title: 'In Progress', position: 1 },
    { workspace: workspace._id, board: board._id, title: 'In Review', position: 2 },
    { workspace: workspace._id, board: board._id, title: 'Done', position: 3 },
  ]

  const columns = await Column.insertMany(columnsToCreate)

  const cardsToCreate = [
    { column: columns[0]._id, title: 'Welcome to TeamOps', description: 'This is your first card', position: 0 },
    { column: columns[0]._id, title: 'Invite teammates', description: 'Try inviting others via email or join code', position: 1 },
    { column: columns[1]._id, title: 'Start collaborating', description: 'Move cards between columns to track progress', position: 0 },
  ]

  await Card.insertMany(cardsToCreate)

  await Activity.create({ workspace: workspace._id, board: board._id, user: owner._id, userId: owner._id, workspaceId: workspace._id, boardId: board._id, action: 'Seeded initial workspace and sample data' })

  console.log('Database seeded with sample users, workspace, columns, and cards')
}

module.exports = {
  Types,
  mongoose,
  connectDB,
  seedDatabase,
  User,
  VerificationToken,
  WorkspaceInviteToken,
  Workspace,
  Board,
  Column,
  Card,
  Activity,
  Notification,
  formatUser,
  formatWorkspace,
  formatBoard,
  formatColumn,
  formatCard,
  formatActivityLog,
  formatActivityFeed,
  formatNotification,
}
