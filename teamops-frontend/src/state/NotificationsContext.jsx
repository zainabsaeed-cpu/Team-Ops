/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  getNotifications,
  markNotificationsAsRead,
  markNotificationRead,
} from '../services/api.js'
import { getSocket } from '../services/socket.js'
import { useAuth } from './AuthContext.jsx'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const { token, user } = useAuth()
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    let alive = true
    if (!token) {
      return undefined
    }

    getNotifications()
      .then((items) => {
        if (alive) {
          setNotifications(items)
        }
      })
      .catch(() => {
        if (alive) {
          setNotifications([])
        }
      })

    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      return undefined
    }

    const socket = getSocket(token)
    socket.connect()
    if (user?.id) {
      socket.emit('join:user', user.id)
    }
    const handleIncoming = (payload) => {
      setNotifications((current) => [payload, ...current])
    }

    socket.on('notification:new', handleIncoming)

    return () => {
      socket.off('notification:new', handleIncoming)
      if (user?.id) {
        socket.emit('leave:user', user.id)
      }
    }
  }, [token, user?.id])

  const markAllRead = async () => {
    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true })),
    )
    await markNotificationsAsRead()
  }

  const markRead = async (id) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    )
    await markNotificationRead(id)
  }

  const addNotification = (payload) => {
    setNotifications((current) => [payload, ...current])
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length

  const value = useMemo(
    () => ({ notifications, unreadCount, markAllRead, markRead, addNotification }),
    [notifications, unreadCount],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationsProvider')
  }

  return context
}
