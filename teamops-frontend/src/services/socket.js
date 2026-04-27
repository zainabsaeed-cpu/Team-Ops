import { io } from 'socket.io-client'

let socketInstance = null

export function getSocket(token) {
  if (!socketInstance) {
    socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token },
    })
  } else {
    socketInstance.auth = { token }
  }

  return socketInstance
}
