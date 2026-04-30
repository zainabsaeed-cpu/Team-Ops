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
          <p>Seeded demo workspaces are ready for the final walkthrough.</p>
        </div>
        <button className="btn interactive-btn" onClick={onNewWorkspaceClick}>+ New Workspace</button>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <div className="workspace-grid" style={{ marginTop: 24 }}>
        {workspaces.map((workspace) => (
          <article className="workspace-card workspace-card-polished" key={workspace.id}>
            <div className="workspace-card-top">
              <span className="workspace-card-chip">{workspace.role}</span>
              <span className="workspace-card-count">{workspace.memberCount} members</span>
            </div>
            <h3>{workspace.name}</h3>
            <p className="workspace-card-copy">
              Open the live board, move cards, and show the socket updates without any extra setup.
            </p>
            <div className="workspace-card-foot">
              <span className="workspace-card-live">MongoDB seeded</span>
              <Link className="btn interactive-btn workspace-open-btn" to={`/app/board/${workspace.boardId || workspace.id}`}>
                Open Board →
              </Link>
            </div>
          </article>
        ))}
        {workspaces.length === 0 && !error && (
          <p className="muted">No workspaces found. Create one to get started.</p>
        )}
      </div>
    </section>
  )
}
