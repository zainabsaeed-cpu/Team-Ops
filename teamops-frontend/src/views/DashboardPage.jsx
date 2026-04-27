import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkspaces } from '../services/api.js'

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getWorkspaces()
      .then((data) => {
        if (alive) {
          setWorkspaces(data)
        }
      })
      .catch(() => {
        if (alive) {
          setError('Could not load workspaces')
        }
      })

    return () => {
      alive = false
    }
  }, [])

  const onNewWorkspaceClick = () => {
    window.dispatchEvent(
      new CustomEvent('teamops:interaction', {
        detail: { message: 'Workspace Studio is warming up. AI project templates arriving soon.' },
      }),
    )
  }

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>My Workspaces</h2>
          <p>Collaborate with your team in real-time</p>
        </div>
        <button className="btn interactive-btn" onClick={onNewWorkspaceClick}>+ New Workspace</button>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <div className="workspace-grid" style={{ marginTop: 24 }}>
        {workspaces.map((workspace) => (
          <article className="workspace-card" key={workspace.id}>
            <h3>{workspace.name}</h3>
            <span className="muted">Role: <strong>{workspace.role}</strong></span>
            <span className="muted">Members: {workspace.memberCount}</span>
            <Link className="btn interactive-btn" style={{ textAlign: 'center', textDecoration: 'none', marginTop: '8px' }} to={`/app/board/${workspace.boardId || workspace.id}`}>
              Open Board →
            </Link>
          </article>
        ))}
        {workspaces.length === 0 && !error && (
          <p className="muted">No workspaces found. Create one to get started.</p>
        )}
      </div>
    </section>
  )
}
