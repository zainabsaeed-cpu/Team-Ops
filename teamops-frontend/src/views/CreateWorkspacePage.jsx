import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Layers3, Moon, Sparkles, Sun } from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { useTheme } from '../state/ThemeContext.jsx'
import { createWorkspace } from '../services/api.js'

const techOptions = [
  'React',
  'Node',
  'MongoDB',
  'PostgreSQL',
  'Express',
  'Vue',
  'Angular',
  'Python',
  'Django',
  'other',
]

export default function CreateWorkspacePage() {
  const navigate = useNavigate()
  const { user, authReady } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTech, setSelectedTech] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!authReady) return null

  const toggleTech = (tech) => {
    setSelectedTech((current) => (
      current.includes(tech)
        ? current.filter((item) => item !== tech)
        : [...current, tech]
    ))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()

    if (!trimmedName) {
      setError('Workspace name is required.')
      return
    }

    if (selectedTech.length === 0) {
      setError('Select at least one tech stack tag.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const workspace = await createWorkspace({
        name: trimmedName,
        description: trimmedDescription,
        techStack: selectedTech,
      })

      const boardId = workspace.boardId
      const workspaceId = workspace.id
      if (!boardId) {
        setError('Workspace created, but no board was returned.')
        return
      }

      localStorage.setItem('teamops_workspace_id', workspaceId || boardId)
      localStorage.setItem('teamops_board_id', boardId)

      navigate(`/board/${boardId}`, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to create workspace.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap auth-showcase workspace-setup-wrap">
      <button className="theme-toggle auth-theme-toggle" onClick={toggleTheme} aria-label="Toggle color mode">
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="auth-scene workspace-setup-scene">
        <div className="glass-orb orb-one" />
        <div className="glass-orb orb-two" />
        <div className="glass-orb orb-three" />

        <section className="auth-glass-grid workspace-setup-grid">
          <form onSubmit={onSubmit} className="auth-card login-glass-card workspace-glass-card">
            <div className="login-card-top">
              <span className="login-brand">TeamOps Lab</span>
              <div className="workspace-step-chip">
                <Sparkles size={13} />
                Step 2 of 2
              </div>
            </div>

            <h1>Create your workspace</h1>
            <p>
              Welcome{user?.name ? `, ${user.name}` : ''}. Give your team space a name, add a description, and pick the stack tags that fit your setup.
            </p>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-grid workspace-form-grid">
              <label className="auth-input-row">
                <span className="input-icon"><Layers3 size={14} /></span>
                <input
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Workspace name"
                  required
                />
              </label>

              <label className="workspace-textarea-field">
                <span className="muted workspace-field-label">Description</span>
                <textarea
                  className="input workspace-textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What is this workspace for?"
                  rows={5}
                />
              </label>

              <div>
                <div className="row" style={{ alignItems: 'end', marginBottom: 10 }}>
                  <label className="muted workspace-field-label">Tech stack tags *</label>
                  <div className="workspace-tag-count">{selectedTech.length} selected</div>
                </div>

                <div className="workspace-tech-grid">
                  {techOptions.map((tech) => {
                    const active = selectedTech.includes(tech)

                    return (
                      <button
                        key={tech}
                        type="button"
                        className={`workspace-tech-pill ${active ? 'active' : ''}`}
                        onClick={() => toggleTech(tech)}
                        aria-pressed={active}
                      >
                        {active ? <CheckCircle2 size={13} /> : null}
                        <span>{tech}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="workspace-actions">
                <button className="btn interactive-btn" type="submit" disabled={loading}>
                  {loading ? 'Creating workspace...' : 'Create workspace'}
                  <ArrowRight size={16} />
                </button>
                <button type="button" onClick={() => navigate('/dashboard')} className="btn-ghost workspace-skip-btn">
                  Skip for now
                </button>
              </div>
            </div>
          </form>

          <aside className="event-glass-card workspace-side-card">
            <div className="demo-summary-panel">
              <div className="demo-chip">
                <Sparkles size={14} />
                Workspace ready
              </div>
              <h2>We create the board immediately after submit.</h2>
              <p>
                The workspace is stored in MongoDB, the creator is assigned the Owner role, and the board opens as soon as the setup finishes.
              </p>

              <div className="workspace-flow-card">
                <div className="workspace-flow-step">
                  <strong>Owner access</strong>
                  <span>The creator is inserted into the members list as Owner.</span>
                </div>
                <div className="workspace-flow-step">
                  <strong>Default board</strong>
                  <span>Starter Kanban columns are provisioned server-side.</span>
                </div>
                <div className="workspace-flow-step">
                  <strong>Live redirect</strong>
                  <span>You land on the board page once creation succeeds.</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
