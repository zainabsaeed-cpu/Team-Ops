import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5002/api',
  timeout: 15000,
})

const storedToken = typeof localStorage === 'undefined' ? '' : localStorage.getItem('teamops_token')
if (storedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${storedToken}`
}

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

const data = (request) => request.then((response) => response.data)

export const loginUser = (payload) => data(api.post('/auth/login', payload))
export const loginWithGoogle = (payload) => data(api.post('/auth/google', payload))
export const registerUser = (payload) => data(api.post('/auth/register', payload))
export const getCurrentUser = () => data(api.get('/auth/me'))
export const verifyEmail = (token, email) => data(api.post('/auth/verify', { token, email }))
export const resendVerificationEmail = (email) => data(api.post('/auth/resend-verification', { email }))
export const requestPasswordReset = (email) => data(api.post('/auth/forgot-password', { email }))
export const resetPassword = ({ email, token, password }) => data(api.post('/auth/reset-password', { email, token, password }))

export const getWorkspaces = () => data(api.get('/workspaces'))
export const createWorkspace = (payload) => data(api.post('/workspaces', payload))
export const getWorkspace = (workspaceId) => data(api.get(`/workspaces/${workspaceId}`))
export const updateWorkspace = ({ workspaceId, name, description, techStack }) =>
  data(api.patch(`/workspaces/${workspaceId}`, { name, description, techStack }))
export const deleteWorkspace = (workspaceId) => data(api.delete(`/workspaces/${workspaceId}`))
export const joinWorkspaceByCode = (payload) => {
  const inviteCode = typeof payload === 'string' ? payload : payload?.inviteCode
  return data(api.get(`/workspaces/join/${encodeURIComponent(inviteCode || '')}`))
}
export const joinWorkspaceByInviteToken = (token) => data(api.get('/workspaces/join/invite', { params: { token } }))
export const inviteWorkspaceMember = ({ workspaceId, email, role = 'member' }) =>
  data(api.post(`/workspaces/${workspaceId}/members`, { email, role }))
export const inviteWorkspaceMemberByEmail = ({ workspaceId, email, role = 'member' }) =>
  data(api.post(`/workspaces/${workspaceId}/invite-email`, { email, role }))
export const getWorkspaceMembers = (workspaceId) => data(api.get(`/workspaces/${workspaceId}/members`))
export const updateWorkspaceMemberRole = ({ workspaceId, memberId, role }) =>
  data(api.patch(`/workspaces/${workspaceId}/members/${memberId}/role`, { role }))
export const removeWorkspaceMember = ({ workspaceId, memberId }) =>
  data(api.delete(`/workspaces/${workspaceId}/members/${memberId}`))

export const getBoards = (workspaceId) => data(api.get(`/workspaces/${workspaceId}/boards`))
export const createBoard = ({ workspaceId, name, color }) => data(api.post(`/workspaces/${workspaceId}/boards`, { name, color }))
export const updateBoard = ({ boardId, name, color }) => data(api.patch(`/boards/${boardId}`, { name, color }))
export const deleteBoard = (boardId) => data(api.delete(`/boards/${boardId}`))
export const getBoard = (boardId) => data(api.get(`/boards/${boardId}`))
export const getBoardAnalytics = (boardId) => data(api.get(`/boards/${boardId}/analytics`))

export const createColumn = ({ boardId, title }) => data(api.post(`/boards/${boardId}/columns`, { title }))
export const updateColumn = ({ boardId, columnId, title }) => data(api.patch(`/boards/${boardId}/columns/${columnId}`, { title }))
export const deleteColumn = ({ boardId, columnId }) => data(api.delete(`/boards/${boardId}/columns/${columnId}`))

export const createCard = ({ boardId, columnId, title, description, priority, assigneeId, dueDate }) =>
  data(api.post(`/boards/${boardId}/cards`, { columnId, title, description, priority, assigneeId, dueDate }))
export const updateCard = ({ boardId, cardId, title, description, priority, assigneeId, dueDate }) =>
  data(api.patch(`/boards/${boardId}/cards/${cardId}`, { title, description, priority, assigneeId, dueDate }))
export const deleteCard = ({ boardId, cardId }) => data(api.delete(`/boards/${boardId}/cards/${cardId}`))
export const moveCard = ({ boardId, cardId, toColumnId, newIndex }) =>
  data(api.patch(`/boards/${boardId}/cards/${cardId}/move`, { toColumnId, newIndex }))

export const getNotifications = () => data(api.get('/notifications'))
export const markNotificationsAsRead = () => data(api.patch('/notifications/read-all'))
export const markNotificationRead = (id) => data(api.patch(`/notifications/${id}/read`))

export const getBoardActivities = (boardId) => data(api.get(`/activities/${boardId}`))
export const getActivityFeed = () => data(api.get('/user/activity'))
export const getAnalytics = () => data(api.get('/user/analytics'))
export const getMembers = () => data(api.get('/user/members'))
export const getAchievements = () => data(api.get('/user/achievements'))
export const getSchedule = () => data(api.get('/user/schedule'))
export const getMessageThreads = () => data(api.get('/user/messages'))
export const getSettings = (workspaceId) => data(api.get('/user/settings', { params: workspaceId ? { workspaceId } : {} }))
export const updateSettings = (payload) => data(api.patch('/user/settings', payload))
export const changePassword = (payload) => data(api.patch('/user/password', payload))
export const getUserProfile = () => data(api.get('/user/profile'))
export const updateUserProfile = (payload) => data(api.patch('/user/profile', payload))
export const getMyCards = () => data(api.get('/user/my-cards'))

export default api
