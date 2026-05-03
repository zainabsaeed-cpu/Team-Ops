import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BadgeCheck, LockKeyhole, Mail, Moon, Sparkles, Sun } from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { useTheme } from '../state/ThemeContext.jsx'
import { requestPasswordReset, resendVerificationEmail, resetPassword, verifyEmail } from '../services/api.js'

const GOOGLE_CLIENT_ID = import.meta.env.PROD ? (import.meta.env.VITE_GOOGLE_CLIENT_ID || '') : ''
const GOOGLE_SCRIPT_ID = 'google-identity-services'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, loginWithGoogle, token, authReady } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const googleButtonRef = useRef(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [helperMode, setHelperMode] = useState('')
  const [helperToken, setHelperToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [helperMessage, setHelperMessage] = useState('')
  const redirectTo = useMemo(() => {
    const requested = searchParams.get('redirect') || '/dashboard'
    return requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard'
  }, [searchParams])

  useEffect(() => {
    let cancelled = false

    if (!GOOGLE_CLIENT_ID) {
      return () => {
        cancelled = true
      }
    }

    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) {
        return
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response?.credential) {
            return
          }

          setError('')
          setGoogleLoading(true)

          try {
            await loginWithGoogle(response.credential)
            navigate(redirectTo)
          } catch (err) {
            setError(err.response?.data?.error || 'Google sign-in failed. Please try again.')
          } finally {
            setGoogleLoading(false)
          }
        },
      })

      googleButtonRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: theme === 'dark' ? 'outline' : 'filled_blue',
        size: 'large',
        width: 340,
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
      })
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID)

    if (window.google?.accounts?.id) {
      renderGoogleButton()
      return () => {
        cancelled = true
      }
    }

    if (!existingScript) {
      const script = document.createElement('script')
      script.id = GOOGLE_SCRIPT_ID
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = renderGoogleButton
      document.head.appendChild(script)
    } else {
      existingScript.addEventListener('load', renderGoogleButton)
    }

    return () => {
      cancelled = true
      if (existingScript) {
        existingScript.removeEventListener('load', renderGoogleButton)
      }
    }
  }, [loginWithGoogle, navigate, redirectTo, theme])

  if (!authReady) {
    return null
  }

  if (token) {
    return <Navigate to={redirectTo} replace />
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
      navigate(redirectTo)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to login. Check credentials or backend connection.')
    } finally {
      setLoading(false)
    }
  }

  const onForgotPassword = async () => {
    setError('')
    setHelperMessage('')
    if (!email) {
      setError('Enter your email first, then request a reset code.')
      return
    }
    await requestPasswordReset(email.trim().toLowerCase())
    setHelperMode('reset')
    setHelperMessage('Password reset code sent if that email exists.')
  }

  const onResetPassword = async () => {
    setError('')
    await resetPassword({ email: email.trim().toLowerCase(), token: helperToken, password: newPassword })
    setPassword(newPassword)
    setHelperMode('')
    setHelperToken('')
    setNewPassword('')
    setHelperMessage('Password reset. You can sign in now.')
  }

  const onResendVerification = async () => {
    setError('')
    if (!email) {
      setError('Enter your email first, then request a verification code.')
      return
    }
    await resendVerificationEmail(email.trim().toLowerCase())
    setHelperMode('verify')
    setHelperMessage('Verification code sent.')
  }

  const onVerifyEmail = async () => {
    setError('')
    await verifyEmail(helperToken, email.trim().toLowerCase())
    setHelperMode('')
    setHelperToken('')
    setHelperMessage('Email verified. You can sign in now.')
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
                <button className="forgot-pill" type="button" onClick={onForgotPassword}>I forgot</button>
              </label>
              {validationErrors.password && <span className="validation-error">{validationErrors.password}</span>}
              <button className="btn-ghost" type="button" onClick={onResendVerification}>
                Verify email
              </button>
              {helperMessage ? <span className="success">{helperMessage}</span> : null}
              {helperMode ? (
                <div className="form-grid">
                  <input
                    className="input"
                    value={helperToken}
                    onChange={(event) => setHelperToken(event.target.value)}
                    placeholder={helperMode === 'reset' ? 'Reset code' : 'Verification code'}
                  />
                  {helperMode === 'reset' ? (
                    <input
                      className="input"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="New password"
                    />
                  ) : null}
                  <button className="btn interactive-btn" type="button" onClick={helperMode === 'reset' ? onResetPassword : onVerifyEmail}>
                    {helperMode === 'reset' ? 'Reset password' : 'Verify email'}
                  </button>
                </div>
              ) : null}

              <div className="google-signin-block">
                <div className="auth-divider"><span>or</span></div>
                {GOOGLE_CLIENT_ID ? (
                  <div ref={googleButtonRef} className="google-button-slot">
                    {googleLoading ? <span className="google-loading-text">Connecting Google account...</span> : null}
                  </div>
                ) : (
                  <div className="google-button-slot">
                    <span className="google-loading-text">Google sign-in is not configured for this environment.</span>
                  </div>
                )}
              </div>

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
