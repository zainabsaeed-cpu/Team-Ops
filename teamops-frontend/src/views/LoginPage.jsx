import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowRight, BadgeCheck, LockKeyhole, Mail, Moon, Sparkles, Sun } from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { useTheme } from '../state/ThemeContext.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, token, authReady } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  if (!authReady) {
    return null
  }

  if (token) {
    return <Navigate to="/app" replace />
  }

  const validateForm = () => {
    const errors = {}
    
    if (!email || email.trim() === '') {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!password || password.trim() === '') {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)

    try {
      await login(email, password)
      navigate('/app')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to login. Check credentials or backend connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap auth-showcase">
      <button className="theme-toggle auth-theme-toggle" onClick={toggleTheme} aria-label="Toggle color mode">
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <div className="auth-scene">
        <div className="glass-orb orb-one" />
        <div className="glass-orb orb-two" />
        <div className="glass-orb orb-three" />

        <section className="auth-glass-grid">
          <form className="auth-card login-glass-card" onSubmit={onSubmit}>
            <div className="login-card-top">
              <span className="login-brand">TeamOps Lab</span>
              <Link to="/register" className="login-signup-link">Sign up</Link>
            </div>

            <h1>Log in</h1>
            <p>Access your live workspace, projects, and team updates in one place.</p>
            {error ? <div className="error">{error}</div> : null}

            <div className="form-grid">
              <label className="login-input-row">
                <span className="input-icon"><Mail size={14} /></span>
                <input
                  className={`input ${validationErrors.email ? 'error-input' : ''}`}
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setValidationErrors({...validationErrors, email: ''})
                  }}
                  placeholder="e-mail address"
                  onBlur={() => {
                    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                      setValidationErrors({...validationErrors, email: 'Invalid email format'})
                    }
                  }}
                />
              </label>
              {validationErrors.email && <span className="validation-error">{validationErrors.email}</span>}

              <label className="login-input-row">
                <span className="input-icon"><LockKeyhole size={14} /></span>
                <input
                  className={`input ${validationErrors.password ? 'error-input' : ''}`}
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setValidationErrors({...validationErrors, password: ''})
                  }}
                  placeholder="password"
                  onBlur={() => {
                    if (password && password.length < 6) {
                      setValidationErrors({...validationErrors, password: 'Password must be at least 6 characters'})
                    }
                  }}
                />
                <span className="forgot-pill">I forgot</span>
              </label>
              {validationErrors.password && <span className="validation-error">{validationErrors.password}</span>}

              <div className="login-actions-row">
                <span className="auth-legal-text">
                  For team use only. Secure access is required to continue.
                </span>
                <button className="auth-go-btn" disabled={loading} aria-label="Sign in">
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            <div className="login-card-bottom-note">Built for high-velocity product teams.</div>
          </form>

          <aside className="demo-glass-card event-glass-card">
            <div className="demo-summary-panel">
              <div className="demo-chip">
                <Sparkles size={14} />
                Demo ready
              </div>
              <h2>Open the seeded workspace in one login.</h2>
              <p>
                The backend is seeded, MongoDB is connected, and the board is preloaded so the
                walkthrough feels live from the first click.
              </p>

              <div className="demo-credential-card">
                <BadgeCheck size={16} />
                <div>
                  <span>Seeded account</span>
                  <strong>zainab@teamops.dev</strong>
                  <small>Password: 123456</small>
                </div>
              </div>
            </div>

            <div className="demo-stack-panel">
              <div className="demo-stat">
                <span>Live board</span>
                <strong>Kanban + drag-and-drop</strong>
              </div>
              <div className="demo-stat">
                <span>Realtime</span>
                <strong>Socket.io events</strong>
              </div>
              <div className="demo-stat">
                <span>Data layer</span>
                <strong>MongoDB seeded demo</strong>
              </div>
              <div className="demo-callout">
                Everything you need for the final demo is already live.
              </div>
            </div>
          </aside>
        </section>

        <article className="discover-card demo-footer-card">
          <div>
            <h3>Final demo flow</h3>
            <p>Log in, open the workspace board, and move a card to show the live update loop.</p>
          </div>
          <button type="button" className="discover-link">Ready to go</button>
        </article>
      </div>
    </div>
  )
}
