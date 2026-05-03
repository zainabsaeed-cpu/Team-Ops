import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Plus, Users } from 'lucide-react'
import {
  createWorkspace,
  getBoard,
  getWorkspaces,
  inviteWorkspaceMember,
} from '../services/api.js'
import { useAuth } from '../state/AuthContext.jsx'

const cardStyle = {
  background: 'var(--white)',
  border: '1px solid var(--border2)',
  borderRadius: '12px',
  padding: '20px',
}

export default function ProjectsPage() {
  const { currentWorkspaceRole } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [inviteState, setInviteState] = useState({})
  const [progressByWorkspace, setProgressByWorkspace] = useState({})
  const canCreateProject = ['owner', 'admin'].includes(currentWorkspaceRole)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getWorkspaces()
      const nextWorkspaces = Array.isArray(data) ? data : []
      setWorkspaces(nextWorkspaces)

      // Track progress from real board data (Done cards / total cards).
      const progressEntries = await Promise.all(
        nextWorkspaces.map(async (workspace) => {
          try {
            const board = await getBoard(workspace.boardId || workspace.id)
            const columns = board?.columns || []
            const totalCards = columns.reduce((sum, column) => sum + (column.cards?.length || 0), 0)
            const doneCards = columns
              .filter((column) => /done/i.test(column.title))
              .reduce((sum, column) => sum + (column.cards?.length || 0), 0)
            const progress = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0
            return [workspace.id, { totalCards, doneCards, progress }]
          } catch {
            return [workspace.id, { totalCards: 0, doneCards: 0, progress: 0 }]
          }
        }),
      )
      setProgressByWorkspace(Object.fromEntries(progressEntries))
    } catch (err) {
      setError('Failed to load projects')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const activeProjects = workspaces.length
  const totalContributors = useMemo(
    () => workspaces.reduce((sum, workspace) => sum + (workspace.memberCount || 0), 0),
    [workspaces],
  )
  const averageCompletion = useMemo(() => {
    if (!workspaces.length) {
      return 0
    }

    const total = workspaces.reduce(
      (sum, workspace) => sum + (progressByWorkspace[workspace.id]?.progress || 0),
      0,
    )
    return Math.round(total / workspaces.length)
  }, [progressByWorkspace, workspaces])

  const onCreateProject = async (event) => {
    event.preventDefault()
    const trimmed = createName.trim()
    if (!trimmed) {
      setError('Project name is required.')
      return
    }

    try {
      setCreating(true)
      setError('')
      setNotice('')
      await createWorkspace({ name: trimmed })
      setCreateName('')
      setNotice(`Project "${trimmed}" created successfully.`)
      await loadProjects()
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to create project.')
    } finally {
      setCreating(false)
    }
  }

  const updateInvite = (workspaceId, patch) => {
    setInviteState((current) => ({
      ...current,
      [workspaceId]: {
        ...(current[workspaceId] || { email: '', role: 'member', busy: false }),
        ...patch,
      },
    }))
  }

  const onInvite = async (event, workspaceId) => {
    event.preventDefault()
    const current = inviteState[workspaceId] || { email: '', role: 'member' }
    const email = current.email?.trim().toLowerCase()
    const role = current.role || 'member'

    if (!email) {
      setError('Invite email is required.')
      return
    }

    try {
      setError('')
      setNotice('')
      updateInvite(workspaceId, { busy: true })
      await inviteWorkspaceMember({ workspaceId, email, role })
      updateInvite(workspaceId, { email: '', role, busy: false })
      setNotice(`Invitation added: ${email}`)
      await loadProjects()
    } catch (err) {
      updateInvite(workspaceId, { busy: false })
      setError(err?.response?.data?.error || 'Unable to invite member.')
    }
  }

  return (
    <section style={{ padding: '24px' }}>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <h2>Projects & Workspaces</h2>
          <p>Create projects, invite teammates, and track real completion from board progress.</p>
        </div>
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}
      {notice ? <div style={{ marginBottom: 12, color: 'var(--teal)', fontWeight: 600 }}>{notice}</div> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={cardStyle}>
          <div className="muted" style={{ fontSize: 12 }}>Active Projects</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{activeProjects}</div>
        </div>
        <div style={cardStyle}>
          <div className="muted" style={{ fontSize: 12 }}>Contributors</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totalContributors}</div>
        </div>
        <div style={cardStyle}>
          <div className="muted" style={{ fontSize: 12 }}>Average Completion</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{averageCompletion}%</div>
        </div>
      </div>

      {canCreateProject ? <form
        onSubmit={onCreateProject}
        style={{
          ...cardStyle,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Briefcase size={18} style={{ color: 'var(--muted2)' }} />
        <input
          value={createName}
          onChange={(event) => setCreateName(event.target.value)}
          placeholder="New project name"
          style={{
            flex: 1,
            border: '1px solid var(--border2)',
            borderRadius: 8,
            padding: '10px 12px',
            fontFamily: 'inherit',
            fontSize: 14,
          }}
        />
        <button className="btn interactive-btn" type="submit" disabled={creating}>
          <Plus size={15} />
          {creating ? 'Creating...' : 'Add Project'}
        </button>
      </form> : null}

      {loading ? (
        <p className="muted">Loading projects...</p>
      ) : workspaces.length === 0 ? (
        <p className="muted">No projects yet. Add your first project above.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {workspaces.map((workspace) => {
            const invite = inviteState[workspace.id] || { email: '', role: 'member', busy: false }
            const progressData = progressByWorkspace[workspace.id] || { totalCards: 0, doneCards: 0, progress: 0 }
            const canInvite = ['owner', 'admin'].includes(workspace.role)

            return (
              <article key={workspace.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ marginBottom: 4 }}>{workspace.name}</h3>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Role: {workspace.role} • Members: {workspace.memberCount}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: 'var(--violet-soft)',
                      color: 'var(--violet)',
                      borderRadius: 999,
                      padding: '4px 10px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Workspace
                  </span>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                    Real Progress: {progressData.progress}% ({progressData.doneCards}/{progressData.totalCards} done)
                  </div>
                  <div style={{ height: 8, background: 'var(--border2)', borderRadius: 6, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${progressData.progress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--violet), var(--teal))',
                      }}
                    />
                  </div>
                </div>

                {canInvite ? <form onSubmit={(event) => onInvite(event, workspace.id)}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Invite Member</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8 }}>
                    <input
                      type="email"
                      value={invite.email}
                      onChange={(event) => updateInvite(workspace.id, { email: event.target.value })}
                      placeholder="teammate@email.com"
                      style={{
                        border: '1px solid var(--border2)',
                        borderRadius: 8,
                        padding: '9px 10px',
                        fontFamily: 'inherit',
                        fontSize: 13,
                      }}
                    />
                    <select
                      value={invite.role}
                      onChange={(event) => updateInvite(workspace.id, { role: event.target.value })}
                      style={{
                        border: '1px solid var(--border2)',
                        borderRadius: 8,
                        padding: '9px 8px',
                        fontFamily: 'inherit',
                        fontSize: 13,
                      }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button className="btn interactive-btn" type="submit" disabled={invite.busy}>
                      <Users size={14} />
                      {invite.busy ? 'Sending...' : 'Invite'}
                    </button>
                  </div>
                </form> : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
