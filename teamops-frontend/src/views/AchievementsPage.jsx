import { useEffect, useState } from 'react'
import { getAchievements } from '../services/api.js'

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    getAchievements()
      .then((items) => {
        if (alive) {
          setAchievements(items)
        }
      })
      .catch(() => {
        if (alive) {
          setError('Could not load achievements')
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
          <h2>Achievements</h2>
          <p>Milestones unlocked by your team and personal progress</p>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <div className="workspace-grid" style={{ marginTop: 24 }}>
        {achievements.map((item) => (
          <article className="workspace-card" key={item.id}>
            <h3>{item.icon} {item.title}</h3>
            <span className="muted">{item.description}</span>
          </article>
        ))}
        {achievements.length === 0 && !error ? <p className="muted">No achievements yet.</p> : null}
      </div>
    </section>
  )
}
