import { useEffect, useState } from 'react'
import { getSchedule } from '../services/api.js'

export default function SchedulePage() {
  const [schedule, setSchedule] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    getSchedule()
      .then((items) => {
        if (alive) {
          setSchedule(items)
        }
      })
      .catch(() => {
        if (alive) {
          setError('Could not load schedule')
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
          <h2>Schedule</h2>
          <p>Upcoming collaboration windows and delivery checkpoints</p>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <ul className="notification-list" style={{ marginTop: 20 }}>
        {schedule.map((event) => (
          <li key={event.id} className="notification-item">
            <div>
              <strong>{event.title}</strong>
              <div className="muted">{event.owner}</div>
            </div>
            <small className="muted">{event.time}</small>
          </li>
        ))}
        {schedule.length === 0 && !error ? <li className="muted">No events scheduled.</li> : null}
      </ul>
    </section>
  )
}
