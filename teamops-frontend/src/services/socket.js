import { io } from 'socket.io-client'

let socketInstance = null
const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002'
let currentUserId = ''

export function getSocket(token, userId = currentUserId) {
  currentUserId = userId || currentUserId
  if (!socketInstance) {
    socketInstance = io(socketUrl, {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token },
    })
    socketInstance.on('connect', () => {
      if (currentUserId) {
        socketInstance.emit('join:user', currentUserId)
      }
    })
  } else {
    socketInstance.auth = { token }
  }

  return socketInstance
}

export const socket = getSocket()
