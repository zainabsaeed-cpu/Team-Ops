import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
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

  if (!authReady) {
    return null
  }

  if (token) {
    return <Navigate to="/app" replace />
  }

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
      await register(name, email, password)
      navigate('/app')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to register. Please try again.')
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
            className={`input ${validationErrors.name ? 'error-input' : ''}`}
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setValidationErrors({...validationErrors, name: ''})
            }}
            placeholder="Full name"
          />
          {validationErrors.name && <span className="validation-error">{validationErrors.name}</span>}
          
          <input
            className={`input ${validationErrors.email ? 'error-input' : ''}`}
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setValidationErrors({...validationErrors, email: ''})
            }}
            placeholder="Email"
            onBlur={() => {
              if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setValidationErrors({...validationErrors, email: 'Invalid email format'})
              }
            }}
          />
          {validationErrors.email && <span className="validation-error">{validationErrors.email}</span>}
          
          <input
            className={`input ${validationErrors.password ? 'error-input' : ''}`}
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setValidationErrors({...validationErrors, password: ''})
            }}
            placeholder="Password (minimum 6 characters)"
            onBlur={() => {
              if (password && password.length < 6) {
                setValidationErrors({...validationErrors, password: 'Password must be at least 6 characters'})
              }
            }}
          />
          {validationErrors.password && <span className="validation-error">{validationErrors.password}</span>}
          
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
