import { useEffect, useMemo, useState } from 'react'
import { changePassword, deleteWorkspace, getSettings, updateSettings } from '../services/api.js'
import { useAuth } from '../state/AuthContext.jsx'

const techOptions = ['React', 'Node', 'MongoDB', 'PostgreSQL', 'Express', 'Vue', 'Angular', 'Python', 'Django', 'other']

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

export default function SettingsPage() {
  const { user, setSession, token, logout, currentWorkspaceRole, setWorkspaceRole } = useAuth()
  const [activeTab, setActiveTab] = useState('workspace')
  const [form, setForm] = useState({
    workspaceName: '',
    workspaceDescription: '',
    techStack: [],
    inviteCode: '',
    inviteLink: '',
    displayName: user?.name || '',
    avatarBase64: user?.avatar_url || '',
    notifyEmail: true,
    notifyPush: true,
  })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const workspaceId = useMemo(() => localStorage.getItem('teamops_workspace_id') || '', [])
  const canEditWorkspace = ['owner', 'admin'].includes(currentWorkspaceRole)
  const canDeleteWorkspace = currentWorkspaceRole === 'owner'

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    let alive = true

    getSettings(workspaceId)
      .then((payload) => {
        if (!alive) return
        setForm((current) => ({
          ...current,
          workspaceName: payload.workspaceName || '',
          workspaceDescription: payload.workspaceDescription || '',
          techStack: payload.techStack || [],
          inviteCode: payload.inviteCode || '',
          inviteLink: payload.inviteLink || '',
          displayName: payload.user?.name || user?.name || '',
          avatarBase64: payload.user?.avatar_url || '',
          notifyEmail: payload.notifyEmail !== false,
          notifyPush: payload.notifyPush !== false,
        }))
        if (payload.currentUserRole) setWorkspaceRole(payload.currentUserRole)
      })
      .catch(() => {
        if (alive) setError('Could not load settings')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [setWorkspaceRole, workspaceId, user?.name])

  const toggleTech = (tech) => {
    setForm((current) => ({
      ...current,
      techStack: current.techStack.includes(tech)
        ? current.techStack.filter((item) => item !== tech)
        : [...current.techStack, tech],
    }))
  }

  const onSaveWorkspace = async () => {
    setSaving(true)
    setError('')
    setStatus('')

    try {
      const payload = await updateSettings({
        workspaceId,
        workspaceName: form.workspaceName,
        workspaceDescription: form.workspaceDescription,
        techStack: form.techStack,
        notifyEmail: form.notifyEmail,
        notifyPush: form.notifyPush,
      })
      setForm((current) => ({ ...current, ...payload }))
      setStatus('Workspace settings saved.')
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save workspace settings')
    } finally {
      setSaving(false)
    }
  }

  const onSaveProfile = async () => {
    setSaving(true)
    setError('')
    setStatus('')

    try {
      const payload = await updateSettings({
        workspaceId,
        displayName: form.displayName,
        avatarBase64: form.avatarBase64,
        notifyEmail: form.notifyEmail,
        notifyPush: form.notifyPush,
      })
      if (payload.user && token) {
        setSession({ token, user: payload.user })
      }
      setStatus('Profile settings saved.')
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save profile settings')
    } finally {
      setSaving(false)
    }
  }

  const onPasswordChange = async () => {
    setError('')
    setStatus('')

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setStatus('Password updated.')
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not update password')
    }
  }

  const onAvatarUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const base64 = await fileToBase64(file)
    update('avatarBase64', base64)
  }

  const onCopyInvite = async () => {
    if (!form.inviteCode) return
    await navigator.clipboard.writeText(form.inviteCode)
    setStatus('Invite code copied.')
  }

  const onCopyInviteLink = async () => {
    if (!form.inviteLink) return
    await navigator.clipboard.writeText(form.inviteLink)
    setStatus('Invite link copied.')
  }

  const onDeleteWorkspace = async () => {
    if (!workspaceId) return
    const confirmed = window.confirm(`Delete workspace "${form.workspaceName}"? This cannot be undone.`)
    if (!confirmed) return

    try {
      await deleteWorkspace(workspaceId)
      localStorage.removeItem('teamops_workspace_id')
      logout()
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not delete workspace')
    }
  }

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Settings</h2>
          <p>Workspace and profile controls</p>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      {status ? <div className="success">{status}</div> : null}

      <div className="settings-tabs" style={{ marginTop: 20 }}>
        <button className={`btn-ghost ${activeTab === 'workspace' ? 'active' : ''}`} onClick={() => setActiveTab('workspace')}>Workspace Settings</button>
        <button className={`btn-ghost ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Profile Settings</button>
      </div>

      {activeTab === 'workspace' ? (
        <article className="workspace-card" style={{ marginTop: 18 }}>
          {loading ? <p className="muted">Loading settings...</p> : null}
          <div className="form-grid" style={{ maxWidth: 680 }}>
            <label className="muted" htmlFor="workspace-name">Workspace name</label>
            <input id="workspace-name" className="input" value={form.workspaceName} disabled={loading || saving || !canEditWorkspace} onChange={(event) => update('workspaceName', event.target.value)} />

            <label className="muted" htmlFor="workspace-description">Description</label>
            <textarea id="workspace-description" className="input" rows={4} value={form.workspaceDescription} disabled={loading || saving || !canEditWorkspace} onChange={(event) => update('workspaceDescription', event.target.value)} />

            <span className="muted">Tech stack</span>
            <div className="workspace-tech-grid">
              {techOptions.map((tech) => (
                <button key={tech} type="button" className={`workspace-tech-pill ${form.techStack.includes(tech) ? 'active' : ''}`} disabled={!canEditWorkspace} onClick={() => toggleTech(tech)}>
                  {tech}
                </button>
              ))}
            </div>

            <span className="muted">Invite code</span>
            <div className="row" style={{ gap: 10 }}>
              <code style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>{form.inviteCode || 'No code'}</code>
              <button className="btn interactive-btn" type="button" onClick={onCopyInvite}>Copy</button>
            </div>
            <span className="muted">Invite link</span>
            <div className="row" style={{ gap: 10 }}>
              <code style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', overflowWrap: 'anywhere' }}>{form.inviteLink || 'No link'}</code>
              <button className="btn interactive-btn" type="button" onClick={onCopyInviteLink}>Copy link</button>
            </div>

            {canEditWorkspace ? <button className="btn interactive-btn" type="button" disabled={loading || saving} onClick={onSaveWorkspace}>
              {saving ? 'Saving...' : 'Save Workspace'}
            </button> : null}
          </div>

          {canDeleteWorkspace ? <div className="danger-zone" style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <h3>Danger zone</h3>
            <p className="muted">Delete this workspace, including columns, cards, and activity.</p>
            <button className="btn-ghost" type="button" onClick={onDeleteWorkspace}>Delete workspace</button>
          </div> : null}
        </article>
      ) : (
        <article className="workspace-card" style={{ marginTop: 18 }}>
          <div className="form-grid" style={{ maxWidth: 680 }}>
            <div className="row" style={{ gap: 14, alignItems: 'center' }}>
              <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, overflow: 'hidden' }}>
                {form.avatarBase64 ? <img src={form.avatarBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : form.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
              <input type="file" accept="image/*" onChange={onAvatarUpload} />
            </div>

            <label className="muted" htmlFor="display-name">Display name</label>
            <input id="display-name" className="input" value={form.displayName} onChange={(event) => update('displayName', event.target.value)} />

            <button className="btn interactive-btn" type="button" disabled={saving} onClick={onSaveProfile}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>

            <h3 style={{ marginTop: 20 }}>Change password</h3>
            <input className="input" type="password" placeholder="Current password" value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} />
            <input className="input" type="password" placeholder="New password" value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} />
            <input className="input" type="password" placeholder="Confirm new password" value={passwords.confirmPassword} onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))} />
            <button className="btn interactive-btn" type="button" onClick={onPasswordChange}>Update Password</button>
          </div>
        </article>
      )}
    </section>
  )
}
