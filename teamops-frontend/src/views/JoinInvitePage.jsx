import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BadgeCheck, CircleAlert } from 'lucide-react'
import { joinWorkspaceByInviteToken } from '../services/api.js'
import { useAuth } from '../state/AuthContext.jsx'

export default function JoinInvitePage() {
  const { token: authToken, authReady } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = useState('Checking invite...')
  const [error, setError] = useState('')

  const inviteToken = useMemo(() => searchParams.get('token') || '', [searchParams])

  useEffect(() => {
    if (!authReady) return

    const returnTo = `${location.pathname}${location.search}`
    if (!authToken) {
      navigate(`/login?redirect=${encodeURIComponent(returnTo)}`, { replace: true })
      return
    }

    if (!inviteToken) {
      setStatus('')
      setError('Invite token is missing.')
      return
    }

    let cancelled = false

    const acceptInvite = async () => {
      try {
        setStatus('Accepting invite...')
        setError('')
        const payload = await joinWorkspaceByInviteToken(inviteToken)
        const workspace = payload?.workspace
        if (!workspace?.id) {
          throw new Error('Workspace was not returned by the server.')
        }

        localStorage.setItem('teamops_workspace_id', workspace.id)
        if (!cancelled) {
          setStatus(`Joined ${workspace.name}. Opening board...`)
          window.setTimeout(() => {
            localStorage.setItem('teamops_board_id', workspace.boardId || workspace.id)
            navigate(`/board/${workspace.boardId || workspace.id}`, { replace: true })
          }, 900)
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('')
          setError(err?.response?.data?.error || err.message || 'Could not accept invite.')
        }
      }
    }

    acceptInvite()

    return () => {
      cancelled = true
    }
  }, [authReady, authToken, inviteToken, location.pathname, location.search, navigate])

  return (
    <main className="auth-wrap" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section className="workspace-card" style={{ width: 'min(460px, 100%)', textAlign: 'center' }}>
        {error ? (
          <>
            <CircleAlert size={34} style={{ color: 'var(--danger)', marginBottom: 12 }} />
            <h1 style={{ marginTop: 0 }}>Invite unavailable</h1>
            <p className="muted">{error}</p>
            <Link className="btn interactive-btn" to="/dashboard">
              Go to workspace
            </Link>
          </>
        ) : (
          <>
            <BadgeCheck size={34} style={{ color: 'var(--success)', marginBottom: 12 }} />
            <h1 style={{ marginTop: 0 }}>Joining workspace</h1>
            <p className="muted">{status}</p>
          </>
        )}
      </section>
    </main>
  )
}
