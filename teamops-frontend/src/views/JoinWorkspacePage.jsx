import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Link2, Moon, Sun } from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { useTheme } from '../state/ThemeContext.jsx'
import { joinWorkspaceByCode } from '../services/api.js'

export default function JoinWorkspacePage() {
  const navigate = useNavigate()
  const { code: routeCode } = useParams()
  const { token, authReady } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [code, setCode] = useState(routeCode || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!authReady) {
    return null
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  const onSubmit = async (event) => {
    event.preventDefault()

    const inviteCode = code.trim().toUpperCase()
    if (!inviteCode) {
      setError('Invite code is required.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const payload = await joinWorkspaceByCode({ inviteCode })
      const workspace = payload?.workspace || payload
      const boardId = workspace?.boardId || workspace?.id
      const workspaceId = workspace?.id || boardId

      if (boardId) {
        localStorage.setItem('teamops_workspace_id', workspaceId)
        localStorage.setItem('teamops_board_id', boardId)
        navigate(`/board/${boardId}`, { replace: true })
        return
      }

      setError('Workspace joined, but no board was returned.')
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to join workspace.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap auth-showcase">
      <button className="theme-toggle auth-theme-toggle" onClick={toggleTheme} aria-label="Toggle color mode">
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="auth-scene" style={{ width: '100%', maxWidth: 760 }}>
        <div className="glass-orb orb-one" />
        <div className="glass-orb orb-two" />
        <div className="glass-orb orb-three" />

        <section className="auth-glass-grid" style={{ gridTemplateColumns: '1fr' }}>
          <form className="auth-card login-glass-card" onSubmit={onSubmit}>
            <div className="login-card-top">
              <span className="login-brand">TeamOps Lab</span>
              <span className="demo-chip">
                <Link2 size={14} />
                Join workspace
              </span>
            </div>

            <h1>Join a workspace</h1>
            <p>Enter the invite code shared by your team to open the workspace board.</p>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-grid">
              <label className="auth-input-row">
                <span className="input-icon"><Link2 size={14} /></span>
                <input
                  className="input"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="TEAM-XK92"
                  autoComplete="off"
                  spellCheck="false"
                />
              </label>

              <button className="auth-go-btn auth-register-btn" type="submit" disabled={loading} aria-label="Join workspace">
                {loading ? <span className="auth-go-spinner" /> : <ArrowRight size={15} />}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
