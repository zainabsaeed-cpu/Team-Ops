import { useEffect, useState } from 'react'
import { getMembers } from '../services/api.js'

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    getMembers()
      .then((items) => {
        if (alive) {
          setMembers(items)
        }
      })
      .catch(() => {
        if (alive) {
          setError('Could not load members')
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
          <h2>Members</h2>
          <p>Team directory and workspace role visibility</p>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <div className="workspace-grid" style={{ marginTop: 24 }}>
        {members.map((member) => (
          <article className="workspace-card" key={member.id}>
            <h3>{member.name}</h3>
            <span className="muted">Role: <strong>{member.role}</strong></span>
            <span className="muted">Status: {member.status}</span>
          </article>
        ))}
        {members.length === 0 && !error ? <p className="muted">No members found.</p> : null}
      </div>
    </section>
  )
}
