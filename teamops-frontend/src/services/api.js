import axios from 'axios'
import { createLocalNotification, mockState } from './mockData.js'

const api = axios.create({
  baseURL: 'http://localhost:5000/api',   // hardcoded
  timeout: 4000,
})

const clone = (value) => JSON.parse(JSON.stringify(value))

async function tryBackend(request, fallback) {
  console.log('Attempting real API call...');
  const response = await request();
  console.log('API success:', response.data);
  return response.data;
}
export const loginUser = (payload) =>
  tryBackend(
    () => api.post('/auth/login', payload),
    () => ({ token: 'mock-token', user: clone(mockState.user) }),
  )

export const registerUser = (payload) =>
  tryBackend(
    () => api.post('/auth/register', payload),
    () => ({
      token: 'mock-token',
      user: {
        id: Date.now(),
        name: payload.name,
        email: payload.email,
      },
    }),
  )

export const getWorkspaces = () =>
  tryBackend(
    () => api.get('/workspaces'),
    () => clone(mockState.workspaces),
  )

export const getBoard = (boardId) =>
  tryBackend(
    () => api.get(`/boards/${boardId}`),
    () => {
      const board = mockState.boards[boardId]
      if (!board) {
        throw new Error('Board not found')
      }
      return clone(board)
    },
  )

export const moveCard = ({ boardId, cardId, toColumnId, newIndex }) =>
  tryBackend(
    () => api.patch(`/boards/${boardId}/cards/${cardId}/move`, { toColumnId, newIndex }),
    () => {
      const board = mockState.boards[boardId]
      if (!board) {
        return null
      }

      let card = null
      board.columns.forEach((column) => {
        const cardIndex = column.cards.findIndex((item) => item.id === cardId)
        if (cardIndex >= 0) {
          card = column.cards.splice(cardIndex, 1)[0]
        }
      })

      const destinationColumn = board.columns.find((column) => column.id === toColumnId)
      if (!card || !destinationColumn) {
        return null
      }

      destinationColumn.cards.splice(newIndex, 0, card)

      const notification = createLocalNotification(
        `Card moved: ${card.title} -> ${destinationColumn.title}`,
      )
      mockState.notifications.unshift(notification)
      return clone(board)
    },
  )

export const getNotifications = () =>
  tryBackend(
    () => api.get('/notifications'),
    () => clone(mockState.notifications),
  )

export const markNotificationsAsRead = () =>
  tryBackend(
    () => api.patch('/notifications/read-all'),
    () => {
      mockState.notifications = mockState.notifications.map((item) => ({
        ...item,
        is_read: true,
      }))
      return { success: true }
    },
  )

export const getAnalytics = () =>
  tryBackend(
    () => api.get('/analytics'),
    () => clone(mockState.analytics),
  )

export const getActivityFeed = () =>
  tryBackend(
    () => api.get('/activity'),
    () => clone(mockState.activityFeed),
  )

export const getMembers = () =>
  tryBackend(
    () => api.get('/members'),
    () => clone(mockState.members),
  )

export const getAchievements = () =>
  tryBackend(
    () => api.get('/achievements'),
    () => clone(mockState.achievements),
  )

export const getSchedule = () =>
  tryBackend(
    () => api.get('/schedule'),
    () => clone(mockState.schedule),
  )

export const getMessageThreads = () =>
  tryBackend(
    () => api.get('/messages'),
    () => clone(mockState.messageThreads),
  )

export const getSettings = () =>
  tryBackend(
    () => api.get('/settings'),
    () => clone(mockState.settings),
  )

export const updateSettings = (payload) =>
  tryBackend(
    () => api.patch('/settings', payload),
    () => {
      mockState.settings = {
        ...mockState.settings,
        ...payload,
      }
      return clone(mockState.settings)
    },
  )
