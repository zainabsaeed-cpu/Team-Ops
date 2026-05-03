import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowRight, LockKeyhole, Mail, Moon, Sparkles, Sun, UserRound } from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { useTheme } from '../state/ThemeContext.jsx'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, token, authReady } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  if (!authReady) return null
  if (token) return <Navigate to="/dashboard" replace />

  const validateForm = () => {
    const errors = {}

    if (!name || name.trim() === '') {
      errors.name = 'Full name is required'
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters'
    }

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
      await register(name.trim(), email.trim().toLowerCase(), password)
      localStorage.setItem('teamops_pending_email', email.trim().toLowerCase())
      navigate('/verify', { replace: true, state: { email: email.trim().toLowerCase() } })
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to create your account. Please try again.')
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
          <form className="auth-card login-glass-card register-glass-card" onSubmit={onSubmit}>
            <div className="login-card-top">
              <span className="login-brand">TeamOps Lab</span>
              <Link to="/login" className="login-signup-link">Log in</Link>
            </div>

            <h1>Create account</h1>
            <p>
              Create your TeamOps account first, then verify your email and continue to workspace setup.
            </p>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-grid">
              <label className="auth-input-row">
                <span className="input-icon"><UserRound size={14} /></span>
                <input
                  className={`input ${validationErrors.name ? 'error-input' : ''}`}
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setValidationErrors((current) => ({ ...current, name: '' }))
                  }}
                  placeholder="full name"
                />
              </label>
              {validationErrors.name ? <span className="validation-error">{validationErrors.name}</span> : null}

              <label className="auth-input-row">
                <span className="input-icon"><Mail size={14} /></span>
                <input
                  className={`input ${validationErrors.email ? 'error-input' : ''}`}
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setValidationErrors((current) => ({ ...current, email: '' }))
                  }}
                  placeholder="email address"
                  onBlur={() => {
                    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                      setValidationErrors((current) => ({ ...current, email: 'Invalid email format' }))
                    }
                  }}
                />
              </label>
              {validationErrors.email ? <span className="validation-error">{validationErrors.email}</span> : null}

              <label className="auth-input-row">
                <span className="input-icon"><LockKeyhole size={14} /></span>
                <input
                  className={`input ${validationErrors.password ? 'error-input' : ''}`}
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setValidationErrors((current) => ({ ...current, password: '' }))
                  }}
                  placeholder="password"
                  onBlur={() => {
                    if (password && password.length < 6) {
                      setValidationErrors((current) => ({ ...current, password: 'Password must be at least 6 characters' }))
                    }
                  }}
                />
              </label>
              {validationErrors.password ? <span className="validation-error">{validationErrors.password}</span> : null}
              <button className="auth-go-btn auth-register-btn" type="submit" disabled={loading} aria-label="Create account">
                {loading ? <span className="auth-go-spinner" /> : <ArrowRight size={15} />}
              </button>

              <span className="muted auth-footer-link">
                Already registered? <Link to="/login">Back to login</Link>
              </span>
            </div>
          </form>

          <aside className="event-glass-card register-side-card">
            <div className="demo-summary-panel">
              <div className="demo-chip">
                <Sparkles size={14} />
                Two-step setup
              </div>
              <h2>Register once, then create your workspace.</h2>
              <p>
                Your account is stored in MongoDB with a hashed password, your JWT is saved in the browser, and the next screen creates the board space.
              </p>

              <div className="workspace-flow-card">
                <div className="workspace-flow-step">
                  <strong>1. Account created</strong>
                  <span>Token saved to localStorage immediately.</span>
                </div>
                <div className="workspace-flow-step">
                  <strong>2. Workspace setup</strong>
                  <span>Name, description, and stack tags.</span>
                </div>
                <div className="workspace-flow-step">
                  <strong>3. Board opens</strong>
                  <span>Creator becomes Owner and lands on the board.</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
