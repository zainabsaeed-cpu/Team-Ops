import { useEffect, useState } from 'react'
import { getMessageThreads } from '../services/api.js'

export default function MessagesPage() {
  const [threads, setThreads] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    getMessageThreads()
      .then((items) => {
        if (alive) {
          setThreads(items)
        }
      })
      .catch(() => {
        if (alive) {
          setError('Could not load messages')
        }
      })

    return () => {
      alive = false
    }
  }, [])

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Messages</h2>
          <p>Team conversations and quick thread previews</p>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <ul className="notification-list" style={{ marginTop: 20 }}>
        {threads.map((thread) => (
          <li key={thread.id} className="notification-item unread">
            <div>
              <strong>{thread.from}</strong>
              <div className="muted">{thread.content}</div>
            </div>
            <small className="muted">{thread.time}</small>
          </li>
        ))}
        {threads.length === 0 && !error ? <li className="muted">No messages yet.</li> : null}
      </ul>
    </section>
  )
}
