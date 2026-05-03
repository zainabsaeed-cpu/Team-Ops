import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getWorkspaces, joinWorkspaceByCode } from '../services/api.js'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState([])
  const [error, setError] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

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
              <Link className="btn interactive-btn workspace-open-btn" to={`/board/${workspace.boardId || workspace.id}`}>
                Open Board →
              </Link>
            </div>
          </article>
        ))}
        {workspaces.length === 0 && !error && (
          <p className="muted">No workspaces found. Create one to get started.</p>
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        <h3>Join a workspace</h3>
        <form onSubmit={async (e) => {
          e.preventDefault()
          setJoinError('')
          if (!joinCode || joinCode.trim().length < 3) { setJoinError('Enter a valid invite code'); return }
          setJoining(true)
          try {
            const response = await joinWorkspaceByCode({ inviteCode: joinCode.trim() })
            window.dispatchEvent(new CustomEvent('teamops:interaction', { detail: { message: response.message || 'Joined workspace' } }))
            setJoinCode('')
            const workspace = response?.workspace || response
            const boardId = workspace?.boardId || workspace?.id
            const workspaceId = workspace?.id || boardId
            if (boardId) {
              localStorage.setItem('teamops_workspace_id', workspaceId)
              localStorage.setItem('teamops_board_id', boardId)
              navigate(`/board/${boardId}`)
            } else {
              const data = await getWorkspaces()
              setWorkspaces(data)
            }
          } catch (err) {
            setJoinError(err?.response?.data?.error || 'Failed to join workspace')
          } finally { setJoining(false) }
        }}>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input className="input" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Invite code" />
            <button className="btn interactive-btn" disabled={joining}>{joining ? 'Joining...' : 'Join'}</button>
          </div>
          {joinError ? <div className="error" style={{ marginTop: 8 }}>{joinError}</div> : null}
        </form>
      </div>
    </section>
  )
}
