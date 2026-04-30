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
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteCode: { type: String, required: true, unique: true },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const columnSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
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
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
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
const Workspace = mongoose.models.Workspace || mongoose.model('Workspace', workspaceSchema)
const Column = mongoose.models.Column || mongoose.model('Column', columnSchema)
const Card = mongoose.models.Card || mongoose.model('Card', cardSchema)
const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema)
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)

const toId = (value) => {
  if (!value) {
    return null
  }

  return typeof value === 'string' ? value : value.toString()
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
  created_at: user.createdAt,
})

const formatWorkspace = (workspace, role, memberCount) => ({
  id: toId(workspace._id),
  name: workspace.name,
  role,
  memberCount,
  boardId: toId(workspace._id),
})

const formatColumn = (column) => ({
  id: toId(column._id),
  workspace_id: toId(column.workspace),
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
  action: activity.action,
  created_at: activity.createdAt,
})

const formatActivityFeed = (activity) => ({
  id: toId(activity._id),
  message: activity.action,
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

  const userCount = await User.countDocuments()
  if (userCount > 0) {
    return
  }

  const passwordHash = await bcrypt.hash('123456', 10)
  const [zainab, ahmed, zunairah, hassan] = await User.insertMany([
    { name: 'Zainab Saeed', email: 'zainab@teamops.dev', passwordHash },
    { name: 'Ahmed Khan', email: 'ahmed@teamops.dev', passwordHash },
    { name: 'Zunairah Sarwar', email: 'zunairah@teamops.dev', passwordHash },
    { name: 'Hassan Ali', email: 'hassan@teamops.dev', passwordHash },
  ])

  const [workspaceOne, workspaceTwo] = await Workspace.insertMany([
    {
      name: 'Web Technologies Project',
      owner: zainab._id,
      inviteCode: 'teamops1',
      members: [
        { user: zainab._id, role: 'owner' },
        { user: ahmed._id, role: 'admin' },
        { user: zunairah._id, role: 'member' },
        { user: hassan._id, role: 'member' },
      ],
    },
    {
      name: 'Final Demo Sprint',
      owner: ahmed._id,
      inviteCode: 'teamops2',
      members: [
        { user: ahmed._id, role: 'owner' },
        { user: zainab._id, role: 'admin' },
        { user: zunairah._id, role: 'member' },
      ],
    },
  ])

  const columns = await Column.insertMany([
    { workspace: workspaceOne._id, title: 'To Do', position: 0 },
    { workspace: workspaceOne._id, title: 'In Progress', position: 1 },
    { workspace: workspaceOne._id, title: 'Review', position: 2 },
    { workspace: workspaceOne._id, title: 'Done', position: 3 },
    { workspace: workspaceTwo._id, title: 'To Do', position: 0 },
    { workspace: workspaceTwo._id, title: 'In Progress', position: 1 },
    { workspace: workspaceTwo._id, title: 'Done', position: 2 },
  ])

  const [todo, inProgress, review, done, demoTodo, demoProgress, demoDone] = columns

  await Card.insertMany([
    {
      column: todo._id,
      title: 'Create login/register UI',
      description: 'Build responsive auth pages for TeamOps',
      priority: 'high',
      assignee: zainab._id,
      dueDate: new Date('2026-04-14'),
      position: 0,
    },
    {
      column: todo._id,
      title: 'Integrate socket events',
      description: 'Sync card moves in real-time',
      priority: 'medium',
      assignee: zunairah._id,
      dueDate: new Date('2026-04-15'),
      position: 1,
    },
    {
      column: inProgress._id,
      title: 'Build kanban drag-and-drop',
      description: 'Use dnd-kit for sortable cards',
      priority: 'high',
      assignee: zainab._id,
      dueDate: new Date('2026-04-12'),
      position: 0,
    },
    {
      column: review._id,
      title: 'Activity log sidebar',
      description: 'Live stream board actions',
      priority: 'medium',
      assignee: hassan._id,
      dueDate: new Date('2026-04-16'),
      position: 0,
    },
    {
      column: done._id,
      title: 'Set up backend project',
      description: 'Create Node API and install dependencies',
      priority: 'low',
      assignee: zainab._id,
      dueDate: new Date('2026-04-10'),
      position: 0,
    },
    {
      column: demoTodo._id,
      title: 'Finalize demo checklist',
      description: 'Prepare the final project walkthrough',
      priority: 'medium',
      assignee: ahmed._id,
      dueDate: new Date('2026-04-20'),
      position: 0,
    },
    {
      column: demoProgress._id,
      title: 'Record demo narration',
      description: 'Capture short explanation clips',
      priority: 'medium',
      assignee: zainab._id,
      dueDate: new Date('2026-04-21'),
      position: 0,
    },
    {
      column: demoDone._id,
      title: 'Approve final slide deck',
      description: 'Lock the submission materials',
      priority: 'low',
      assignee: ahmed._id,
      dueDate: new Date('2026-04-18'),
      position: 0,
    },
  ])

  await Activity.insertMany([
    {
      workspace: workspaceOne._id,
      user: zainab._id,
      action: 'Zainab moved "Set up backend project" to Done',
    },
    {
      workspace: workspaceOne._id,
      user: ahmed._id,
      action: 'Ahmed added a new socket integration task',
    },
    {
      workspace: workspaceTwo._id,
      user: zunairah._id,
      action: 'Zunairah finished the demo narration script',
    },
  ])

  await Notification.insertMany([
    {
      user: zainab._id,
      message: 'You were assigned to "Build kanban drag-and-drop"',
      is_read: false,
    },
    {
      user: zainab._id,
      message: 'Ahmed commented on the demo checklist',
      is_read: false,
    },
    {
      user: ahmed._id,
      message: 'Final Demo Sprint is ready for review',
      is_read: true,
    },
  ])
}

module.exports = {
  Types,
  mongoose,
  connectDB,
  seedDatabase,
  User,
  Workspace,
  Column,
  Card,
  Activity,
  Notification,
  formatUser,
  formatWorkspace,
  formatColumn,
  formatCard,
  formatActivityLog,
  formatActivityFeed,
  formatNotification,
}
