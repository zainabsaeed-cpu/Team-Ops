import { io } from 'socket.io-client'

let socketInstance = null
const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002'

export function getSocket(token) {
  if (!socketInstance) {
    socketInstance = io(socketUrl, {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token },
    })
  } else {
    socketInstance.auth = { token }
  }

  return socketInstance
}

export const socket = getSocket()
