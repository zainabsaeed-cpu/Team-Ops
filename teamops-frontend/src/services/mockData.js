const uid = () => Math.random().toString(36).slice(2, 10)

export const mockState = {
  user: {
    id: 1,
    name: 'Zainab Saeed',
    email: 'zainab@teamops.dev',
  },
  workspaces: [
    {
      id: 101,
      name: 'Web Technologies Project',
      role: 'owner',
      memberCount: 6,
      boardId: 501,
    },
    {
      id: 102,
      name: 'Final Demo Sprint',
      role: 'admin',
      memberCount: 4,
      boardId: 502,
    },
  ],
  boards: {
    501: {
      id: 501,
      title: 'TeamOps Board',
      columns: [
        {
          id: 'todo',
          title: 'To Do',
          position: 1,
          cards: [
            {
              id: 'c1',
              title: 'Create login/register UI',
              description: 'Build responsive auth pages for TeamOps',
              priority: 'high',
              assignee: 'Zainab',
              due_date: '2026-04-14',
            },
            {
              id: 'c2',
              title: 'Integrate socket events',
              description: 'Sync card moves in real-time',
              priority: 'medium',
              assignee: 'Zunairah',
              due_date: '2026-04-15',
            },
          ],
        },
        {
          id: 'in-progress',
          title: 'In Progress',
          position: 2,
          cards: [
            {
              id: 'c3',
              title: 'Build kanban drag-and-drop',
              description: 'Use dnd-kit for sortable cards',
              priority: 'high',
              assignee: 'Zainab',
              due_date: '2026-04-12',
            },
          ],
        },
        {
          id: 'in-review',
          title: 'In Review',
          position: 3,
          cards: [
            {
              id: 'c4',
              title: 'Activity log sidebar',
              description: 'Live stream board actions',
              priority: 'medium',
              assignee: 'Ali',
              due_date: '2026-04-16',
            },
          ],
        },
        {
          id: 'done',
          title: 'Done',
          position: 4,
          cards: [
            {
              id: 'c5',
              title: 'Set up React project',
              description: 'Create Vite app and install dependencies',
              priority: 'low',
              assignee: 'Zainab',
              due_date: '2026-04-10',
            },
          ],
        },
      ],
      activityLogs: [
        {
          id: uid(),
          action: 'Zainab moved "Set up React project" to Done',
          created_at: new Date().toISOString(),
        },
      ],
    },
    502: {
      id: 502,
      title: 'Demo Board',
      columns: [
        { id: 'todo', title: 'To Do', position: 1, cards: [] },
        { id: 'in-progress', title: 'In Progress', position: 2, cards: [] },
        { id: 'done', title: 'Done', position: 3, cards: [] },
      ],
      activityLogs: [],
    },
  },
  notifications: [
    {
      id: uid(),
      message: 'You were assigned to "Build kanban drag-and-drop"',
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ],
  analytics: {
    metrics: [
      { label: 'Velocity', value: '42 pts', note: '+12% vs last sprint' },
      { label: 'Cycle Time', value: '2.8 days', note: '-0.6 days improvement' },
      { label: 'Completion Rate', value: '86%', note: '18 cards done this week' },
      { label: 'Risk Alerts', value: '3', note: '2 high-priority blockers' },
    ],
    trend: [
      { sprint: 'Sprint 1', done: 52 },
      { sprint: 'Sprint 2', done: 64 },
      { sprint: 'Sprint 3', done: 71 },
      { sprint: 'Sprint 4', done: 86 },
    ],
  },
  activityFeed: [
    { id: uid(), message: 'Zainab moved API schema review to Done', time: '3m ago' },
    { id: uid(), message: 'Ahmed added a new card in Backend API', time: '14m ago' },
    { id: uid(), message: 'Design QA checklist marked complete', time: '28m ago' },
    { id: uid(), message: 'Deployment notes updated for release-4.2', time: '1h ago' },
    { id: uid(), message: 'Sprint planning comments resolved', time: '2h ago' },
  ],
  members: [
    { id: 1, name: 'Zainab Saeed', role: 'Owner', status: 'Online' },
    { id: 2, name: 'Ahmed Khan', role: 'Admin', status: 'Online' },
    { id: 3, name: 'Zunairah Sarwar', role: 'Member', status: 'Away' },
    { id: 4, name: 'Hassan Ali', role: 'Member', status: 'Offline' },
  ],
  achievements: [
    { id: 1, title: 'Sprint Finisher', detail: 'Closed 25 tasks in a sprint', unlocked: true },
    { id: 2, title: 'Collaboration Pro', detail: '50 comments resolved', unlocked: true },
    { id: 3, title: 'Quality Guardian', detail: 'Zero reopen rate for 2 weeks', unlocked: false },
    { id: 4, title: 'Velocity Master', detail: 'Beat velocity target by 20%', unlocked: false },
  ],
  schedule: [
    { id: 1, title: 'Sprint planning', time: 'Mon 10:00 AM', owner: 'Product Team' },
    { id: 2, title: 'Backend review', time: 'Tue 3:30 PM', owner: 'API Squad' },
    { id: 3, title: 'Design critique', time: 'Wed 12:00 PM', owner: 'UI/UX Team' },
    { id: 4, title: 'Release sync', time: 'Fri 5:00 PM', owner: 'All Hands' },
  ],
  messageThreads: [
    { id: 1, from: 'Ahmed', preview: 'Can we finalize API field mapping today?', at: '11:02' },
    { id: 2, from: 'Zunairah', preview: 'Updated flow for login and register screens.', at: '10:24' },
    { id: 3, from: 'Hassan', preview: 'Deployment check passed on staging.', at: '09:41' },
  ],
  settings: {
    workspaceName: 'Alpha Workspace',
    notifyEmail: true,
    notifyPush: true,
  },
}

export const createLocalNotification = (message) => ({
  id: uid(),
  message,
  is_read: false,
  created_at: new Date().toISOString(),
})
