import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Mail, Send, ShieldCheck, Trash2 } from 'lucide-react'
import { getWorkspaceMembers, inviteWorkspaceMemberByEmail, removeWorkspaceMember, updateWorkspaceMemberRole } from '../services/api.js'
import { useAuth } from '../state/AuthContext.jsx'

const roleLabel = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

const roleBadgeStyle = {
  owner: { color: '#7c3aed', background: 'rgba(124, 58, 237, 0.12)' },
  admin: { color: '#0369a1', background: 'rgba(14, 165, 233, 0.14)' },
  member: { color: '#166534', background: 'rgba(34, 197, 94, 0.14)' },
  viewer: { color: '#4b5563', background: 'rgba(107, 114, 128, 0.14)' },
}

export default function MembersPage() {
  const { user, setWorkspaceRole } = useAuth()
  const [members, setMembers] = useState([])
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('member')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteSending, setInviteSending] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const workspaceId = useMemo(() => localStorage.getItem('teamops_workspace_id') || '', [])
  const isOwner = currentUserRole === 'owner'
  const isAdmin = currentUserRole === 'admin'
  const canInvite = ['owner', 'admin'].includes(currentUserRole)

  const loadMembers = useCallback(async () => {
    if (!workspaceId) {
      setError('Open a workspace before viewing members.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const payload = await getWorkspaceMembers(workspaceId)
      setMembers(payload?.members || [])
      setInviteCode(payload?.inviteCode || '')
      setInviteLink(payload?.inviteLink || '')
      setCurrentUserRole(payload?.currentUserRole || 'member')
      setWorkspaceRole(payload?.currentUserRole || 'member')
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not load members')
    } finally {
      setLoading(false)
    }
  }, [setWorkspaceRole, workspaceId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const copyInviteCode = async () => {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setStatus('Invite code copied.')
    window.setTimeout(() => setStatus(''), 1800)
  }

  const copyInviteLink = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setStatus('Invite link copied.')
    window.setTimeout(() => setStatus(''), 1800)
  }

  const onRoleChange = async (memberId, role) => {
    try {
      await updateWorkspaceMemberRole({ workspaceId, memberId, role })
      setMembers((current) => current.map((member) => (
        member.id === memberId ? { ...member, role } : member
      )))
      setStatus('Role updated.')
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not update role')
    }
  }

  const getRoleOptions = (member) => {
    if (isOwner && member.id !== user?.id && member.role !== 'owner') {
      return ['admin', 'member', 'viewer']
    }

    if (isAdmin && ['member', 'viewer'].includes(member.role)) {
      return ['member', 'viewer']
    }

    return []
  }

  const onRemove = async (memberId) => {
    try {
      await removeWorkspaceMember({ workspaceId, memberId })
      setMembers((current) => current.filter((member) => member.id !== memberId))
      setStatus('Member removed.')
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not remove member')
    }
  }

  const onSendInvite = async (event) => {
    event.preventDefault()
    setError('')
    setStatus('')

    if (!inviteEmail.trim()) {
      setError('Invite email is required.')
      return
    }

    try {
      setInviteSending(true)
      await inviteWorkspaceMemberByEmail({
        workspaceId,
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      setInviteEmail('')
      setStatus('Invite email sent.')
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not send invite email')
    } finally {
      setInviteSending(false)
    }
  }

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Members</h2>
          <p>Workspace roster, roles, and invite code</p>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {status ? <div className="success">{status}</div> : null}

      <div className="workspace-card" style={{ marginTop: 24 }}>
        <span className="muted">Invite code and link</span>
        <div className="row" style={{ gap: 10, marginTop: 8, alignItems: 'center' }}>
          <code style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            {inviteCode || 'Loading...'}
          </code>
          <button className="btn interactive-btn" type="button" onClick={copyInviteCode} disabled={!inviteCode}>
            <Copy size={16} />
            Copy code
          </button>
        </div>
        <div className="row" style={{ gap: 10, marginTop: 8, alignItems: 'center' }}>
          <code style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', overflowWrap: 'anywhere' }}>
            {inviteLink || 'Loading...'}
          </code>
          <button className="btn interactive-btn" type="button" onClick={copyInviteLink} disabled={!inviteLink}>
            <Copy size={16} />
            Copy link
          </button>
        </div>
      </div>

      {canInvite ? (
        <form className="workspace-card" style={{ marginTop: 24 }} onSubmit={onSendInvite}>
          <span className="muted">Invite by Email</span>
          <div className="row" style={{ gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 260px', position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teammate@example.com"
                style={{ paddingLeft: 36 }}
                disabled={inviteSending}
              />
            </label>
            <select
              className="input"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              style={{ flex: '0 1 160px' }}
              disabled={inviteSending}
              aria-label="Invite role"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn interactive-btn" type="submit" disabled={inviteSending || !workspaceId}>
              <Send size={16} />
              {inviteSending ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="workspace-grid" style={{ marginTop: 24 }}>
        {members.map((member) => {
          const isSelf = member.id === user?.id
          const roleOptions = getRoleOptions(member)
          const canManageMember = roleOptions.length > 0
          const canRemoveMember = !isSelf && (
            (isOwner && member.role !== 'owner')
            || (isAdmin && ['member', 'viewer'].includes(member.role))
          )

          return (
            <article className="workspace-card" key={member.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                  {member.name?.charAt(0)?.toUpperCase() || 'M'}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ margin: 0 }}>{member.name}</h3>
                  <span className="muted" style={{ fontSize: 12 }}>{member.email}</span>
                </div>
                <span className={`role-badge role-${member.role}`} style={roleBadgeStyle[member.role] || roleBadgeStyle.viewer}>
                  <ShieldCheck size={13} />
                  {roleLabel[member.role] || 'Member'}
                </span>
              </div>

              {canManageMember || canRemoveMember ? (
                <div className="row" style={{ gap: 10, marginTop: 16 }}>
                  {canManageMember ? (
                    <select
                      className="input"
                      value={member.role}
                      onChange={(event) => onRoleChange(member.id, event.target.value)}
                      aria-label={`Change ${member.name}'s role`}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{roleLabel[role]}</option>
                      ))}
                    </select>
                  ) : null}
                  {canRemoveMember ? (
                    <button className="btn-ghost" type="button" onClick={() => onRemove(member.id)}>
                      <Trash2 size={15} />
                      Remove
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          )
        })}

        {loading ? <p className="muted">Loading members...</p> : null}
        {!loading && members.length === 0 && !error ? <p className="muted">No members found.</p> : null}
      </div>
    </section>
  )
}
