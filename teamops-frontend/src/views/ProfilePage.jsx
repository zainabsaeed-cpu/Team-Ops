import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, LockKeyhole, Mail, Upload, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { changePassword, getMyCards, getUserProfile, updateUserProfile } from '../services/api.js'
import { useAuth } from '../state/AuthContext.jsx'

const formatDate = (value) => {
  if (!value) return 'No date'
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const isOverdue = (date) => {
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(date) < today
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateCurrentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState(user)
  const [name, setName] = useState(user?.name || '')
  const [avatar, setAvatar] = useState(user?.avatar_url || user?.avatarUrl || '')
  const [cards, setCards] = useState([])
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true

    Promise.all([getUserProfile(), getMyCards()])
      .then(([profilePayload, cardsPayload]) => {
        if (!alive) return
        const nextUser = profilePayload?.user || user
        setProfile(nextUser)
        setName(nextUser?.name || '')
        setAvatar(nextUser?.avatar_url || nextUser?.avatarUrl || '')
        setCards(cardsPayload?.cards || [])
      })
      .catch(() => {
        if (alive) setError('Could not load profile')
      })

    return () => {
      alive = false
    }
  }, [user])

  const groupedCards = useMemo(() => {
    return cards.reduce((groups, card) => {
      const key = card.workspace_id || card.workspace_name || 'workspace'
      if (!groups[key]) {
        groups[key] = { name: card.workspace_name || 'Workspace', cards: [] }
      }
      groups[key].cards.push(card)
      return groups
    }, {})
  }, [cards])

  const onAvatarUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setAvatar(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  const onSaveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = await updateUserProfile({ name, avatar })
      const nextUser = { ...profile, ...payload.user }
      setProfile(nextUser)
      updateCurrentUser(nextUser)
      setMessage('Profile saved')
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  const onChangePassword = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    try {
      await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage('Password updated')
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not update password')
    }
  }

  const userInitial = (profile?.name || profile?.email || 'U').charAt(0).toUpperCase()
  const memberSince = formatDate(profile?.created_at || profile?.createdAt)

  return (
    <section className="profile-page">
      <div className="settings-tabs profile-tabs">
        <button className={`btn-ghost ${activeTab === 'profile' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('profile')}>Profile</button>
        <button className={`btn-ghost ${activeTab === 'work' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('work')}>My Work</button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      {activeTab === 'profile' ? (
        <div className="profile-grid">
          <form className="profile-main-card profile-form-card" onSubmit={onSaveProfile}>
            <label className="profile-avatar-upload">
              {avatar ? <img className="profile-avatar" src={avatar} alt={profile?.name || 'User'} /> : <span className="profile-avatar profile-avatar-fallback">{userInitial}</span>}
              <input type="file" accept="image/*" onChange={onAvatarUpload} />
              <span><Upload size={14} /> Upload avatar</span>
            </label>

            <label className="board-modal-field">
              <span>Name</span>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="board-modal-field">
              <span>Email</span>
              <input className="input" value={profile?.email || ''} readOnly />
            </label>
            <p className="profile-meta-line"><CalendarDays size={14} /> Member since {memberSince}</p>
            <button className="btn interactive-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </form>

          <form className="workspace-card profile-password-card" onSubmit={onChangePassword}>
            <h3><LockKeyhole size={16} /> Change Password</h3>
            <input className="input" type="password" placeholder="Current password" value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} />
            <input className="input" type="password" placeholder="New password" value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} />
            <input className="input" type="password" placeholder="Confirm new password" value={passwords.confirmPassword} onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))} />
            <button className="btn interactive-btn" type="submit">Update password</button>
          </form>
        </div>
      ) : (
        <div className="my-work-list">
          {Object.entries(groupedCards).map(([workspaceId, group]) => (
            <section key={workspaceId} className="workspace-card my-work-group">
              <h3>{group.name}</h3>
              {group.cards.map((card) => (
                <button
                  type="button"
                  key={card.id}
                  className={`my-work-card ${isOverdue(card.due_date) ? 'overdue' : ''}`}
                  onClick={() => navigate(`/board/${card.board_id}?card=${card.id}`)}
                >
                  <span className="my-work-title">{card.title}</span>
                  <span>{card.board_name}</span>
                  <span className={`priority ${card.priority || 'medium'}`}>{(card.priority || 'medium').toUpperCase()}</span>
                  <span><CalendarDays size={13} /> {formatDate(card.due_date)}</span>
                </button>
              ))}
            </section>
          ))}
          {cards.length === 0 ? (
            <article className="workspace-card empty-work-card">
              <UserRound size={20} />
              <h3>No assigned cards</h3>
              <p className="muted"><Mail size={13} /> Cards assigned to you will appear here.</p>
            </article>
          ) : null}
        </div>
      )}
    </section>
  )
}
