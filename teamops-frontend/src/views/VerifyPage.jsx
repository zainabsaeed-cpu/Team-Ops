import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { verifyEmail } from '../services/api.js'
import { useAuth } from '../state/AuthContext.jsx'

export default function VerifyPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const token = searchParams.get('token')
  const [email, setEmail] = useState(location.state?.email || localStorage.getItem('teamops_pending_email') || searchParams.get('email') || '')
  const [manualToken, setManualToken] = useState('')
  const [status, setStatus] = useState(token ? 'verifying' : 'manual')
  const [message, setMessage] = useState(
    token
      ? ''
      : 'Enter the verification code from your email.',
  )

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    const doVerify = async () => {
      try {
        const payload = await verifyEmail(token)
        if (cancelled) {
          return
        }

        if (payload?.token && payload?.user) {
          setSession(payload)
        }
        setStatus('success')
        setMessage(payload?.message || 'Email verified! Redirecting to workspace setup...')
        localStorage.removeItem('teamops_pending_email')
        setTimeout(() => navigate('/create-workspace', { replace: true }), 1200)
      } catch (err) {
        if (cancelled) {
          return
        }

        setStatus('error')
        const msg = err?.response?.data?.error || 'Verification failed. The link may have expired.'
        setMessage(msg)
      }
    }

    doVerify()
    return () => {
      cancelled = true
    }
  }, [navigate, searchParams, setSession, token])

  const submitManualCode = async (event) => {
    event.preventDefault()
    setStatus('verifying')
    setMessage('')
    try {
      const payload = await verifyEmail(manualToken.trim(), email.trim().toLowerCase())
      if (payload?.token && payload?.user) {
        setSession(payload)
      }
      localStorage.removeItem('teamops_pending_email')
      navigate('/create-workspace', { replace: true })
    } catch (err) {
      setStatus('manual')
      setMessage(err?.response?.data?.error || 'Verification failed. Check the code and try again.')
    }
  }

  return (
    <div className="auth-wrap" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="auth-card" style={{ textAlign: 'center', maxWidth: 420 }}>
        {status === 'verifying' && (
          <>
            <Loader size={40} style={{ margin: '0 auto 16px', display: 'block', animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
            <h2 style={{ marginBottom: 8 }}>Verifying your email…</h2>
            <p className="muted">Please wait a moment.</p>
          </>
        )}

        {status === 'manual' && (
          <form onSubmit={submitManualCode} className="form-grid" style={{ textAlign: 'left' }}>
            <h2 style={{ marginBottom: 8, textAlign: 'center' }}>Verify Email</h2>
            <p className="muted" style={{ textAlign: 'center' }}>{message}</p>
            <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email address" />
            <input className="input" value={manualToken} onChange={(event) => setManualToken(event.target.value)} placeholder="verification code" />
            <button className="btn interactive-btn" type="submit">Verify</button>
          </form>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={40} style={{ margin: '0 auto 16px', display: 'block', color: '#22c55e' }} />
            <h2 style={{ marginBottom: 8 }}>Email Verified!</h2>
            <p className="muted">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} style={{ margin: '0 auto 16px', display: 'block', color: '#ff4d6d' }} />
            <h2 style={{ marginBottom: 8 }}>Verification Failed</h2>
            <p className="muted" style={{ marginBottom: 20 }}>{message}</p>
            <button className="btn interactive-btn" onClick={() => navigate('/register')}>
              Back to Register
            </button>
          </>
        )}
      </div>
    </div>
  )
}
