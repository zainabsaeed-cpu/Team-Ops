import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowRight, LockKeyhole, Mail, Moon, Sparkles, Sun } from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { useTheme } from '../state/ThemeContext.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, token } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('zainab@teamops.dev')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) {
    return <Navigate to="/app" replace />
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/app')
    } catch {
      setError('Unable to login. Check credentials or backend connection.')
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
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="e-mail address"
                  required
                />
              </label>

              <label className="login-input-row">
                <span className="input-icon"><LockKeyhole size={14} /></span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="password"
                  required
                />
                <span className="forgot-pill">I forgot</span>
              </label>

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

          <aside className="event-glass-card">
            <div className="event-column">
              <h2>
                Thu
                <span>24th</span>
              </h2>
              <p>18 PM</p>
              <p>Kerkstraat 12B</p>
              <p>Amsterdam</p>
              <div className="event-chip">
                <Sparkles size={14} />
                C.Lab
              </div>
            </div>
            <div className="event-body">
              <p>Grand opening</p>
              <strong>New store</strong>
              <div className="event-sun" />
              <button type="button" className="event-join-btn">Join in</button>
            </div>
          </aside>
        </section>

        <article className="discover-card">
          <div>
            <h3>New in</h3>
            <p>TeamOps V3 release notes and collaborative updates.</p>
          </div>
          <button type="button" className="discover-link">Discover</button>
        </article>
      </div>
    </div>
  )
}
