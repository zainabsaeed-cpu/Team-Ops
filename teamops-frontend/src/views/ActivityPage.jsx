import { useEffect, useState } from 'react'
import { getActivityFeed } from '../services/api.js'

export default function ActivityPage() {
  const [feed, setFeed] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    getActivityFeed()
      .then((items) => {
        if (alive) {
          setFeed(items)
        }
      })
      .catch(() => {
        if (alive) {
          setError('Could not load activity feed')
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
          <h2>Activity</h2>
          <p>Recent actions from your workspace channels</p>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <ul className="notification-list" style={{ marginTop: 20 }}>
        {feed.map((item) => (
          <li key={item.id} className="notification-item unread">
            <div>{item.message}</div>
            <small className="muted">{item.time}</small>
          </li>
        ))}
        {feed.length === 0 && !error ? <li className="muted">No activity yet.</li> : null}
      </ul>
    </section>
  )
}
