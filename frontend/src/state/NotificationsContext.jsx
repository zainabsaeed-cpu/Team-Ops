/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  getNotifications,
  markNotificationsAsRead,
} from '../services/api.js'
import { getSocket } from '../services/socket.js'
import { useAuth } from './AuthContext.jsx'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const { token } = useAuth()
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
    const handleIncoming = (payload) => {
      setNotifications((current) => [payload, ...current])
    }

    socket.on('notification:new', handleIncoming)

    return () => {
      socket.off('notification:new', handleIncoming)
    }
  }, [token])

  const markAllRead = async () => {
    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true })),
    )
    await markNotificationsAsRead()
  }

  const addNotification = (payload) => {
    setNotifications((current) => [payload, ...current])
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length

  const value = useMemo(
    () => ({ notifications, unreadCount, markAllRead, addNotification }),
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
