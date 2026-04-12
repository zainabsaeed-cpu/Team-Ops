import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { useTheme } from '../state/ThemeContext.jsx'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, token } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      await register(name, email, password)
      navigate('/app')
    } catch {
      setError('Unable to register. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <button className="theme-toggle auth-theme-toggle" onClick={toggleTheme} aria-label="Toggle color mode">
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create Account</h1>
        <p>Set up your TeamOps user profile and join your workspace.</p>
        {error ? <div className="error">{error}</div> : null}

        <div className="form-grid">
          <input
            className="input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            required
          />
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
          />
          <input
            className="input"
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          <button className="btn interactive-btn" disabled={loading}>
            {loading ? 'Creating...' : 'Register'}
          </button>
          <span className="muted">
            Already registered? <Link to="/login">Back to login</Link>
          </span>
        </div>
      </form>
    </div>
  )
}
