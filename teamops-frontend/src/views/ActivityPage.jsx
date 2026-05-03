import { useEffect, useMemo, useState } from 'react'
import { getBoardActivities } from '../services/api.js'
import { getSocket } from '../services/socket.js'
import { useAuth } from '../state/AuthContext.jsx'

export default function ActivityPage() {
  const { token } = useAuth()
  const [feed, setFeed] = useState([])
  const [error, setError] = useState('')
  const boardId = useMemo(() => localStorage.getItem('teamops_board_id') || '', [])

  useEffect(() => {
    let alive = true

    if (!boardId) {
      return undefined
    }

    getBoardActivities(boardId)
      .then((items) => {
        if (alive) setFeed(items)
      })
      .catch(() => {
        if (alive) setError('Could not load activity feed')
      })

    return () => {
      alive = false
    }
  }, [boardId])

  useEffect(() => {
    if (!token || !boardId) return undefined

    const socket = getSocket(token)
    socket.connect()
    socket.emit('join:board', boardId)

    const handleActivity = (payload) => {
      if (payload.board_id && String(payload.board_id) !== String(boardId)) return
      setFeed((current) => [payload, ...current.filter((item) => item.id !== payload.id)].slice(0, 50))
    }

    socket.on('activity:new', handleActivity)

    return () => {
      socket.off('activity:new', handleActivity)
      socket.emit('leave:board', boardId)
    }
  }, [boardId, token])

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Activity</h2>
          <p>Last 50 board events, updated in real time</p>
        </div>
      </div>
      {!boardId ? <div className="error">Open a board before viewing activity.</div> : null}
      {error ? <div className="error">{error}</div> : null}

      <ul className="notification-list" style={{ marginTop: 20 }}>
        {feed.map((item) => (
          <li key={item.id} className="notification-item unread">
            {item.user_name || item.userName ? <strong>{item.user_name || item.userName}</strong> : null}
            <div>{item.message || item.action}</div>
            <small className="muted">
              {item.created_at ? new Date(item.created_at).toLocaleString() : item.time}
            </small>
          </li>
        ))}
        {feed.length === 0 && !error ? <li className="muted">No activity yet.</li> : null}
      </ul>
    </section>
  )
}
