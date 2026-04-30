import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  CheckSquare,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { useNotifications } from '../state/NotificationsContext.jsx'
import { useTheme } from '../state/ThemeContext.jsx'

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const shellRef = useRef(null)
  const [showPopover, setShowPopover] = useState(false)
  const [clickBursts, setClickBursts] = useState([])
  const [interactionNote, setInteractionNote] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    return window.innerWidth > 980
  })
  const { logout, user } = useAuth()
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const shell = shellRef.current

    if (!shell) {
      return undefined
    }

    const onMove = (event) => {
      const rect = shell.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      shell.style.setProperty('--mouse-x', `${x}px`)
      shell.style.setProperty('--mouse-y', `${y}px`)
    }

    shell.addEventListener('pointermove', onMove)

    return () => {
      shell.removeEventListener('pointermove', onMove)
    }
  }, [])

  useEffect(() => {
    const handleInteractionMessage = (event) => {
      const text = event?.detail?.message
      if (!text) {
        return
      }
      setInteractionNote(text)
      window.clearTimeout(handleInteractionMessage.timeoutId)
      handleInteractionMessage.timeoutId = window.setTimeout(() => setInteractionNote(''), 2200)
    }

    window.addEventListener('teamops:interaction', handleInteractionMessage)

    return () => {
      window.removeEventListener('teamops:interaction', handleInteractionMessage)
      window.clearTimeout(handleInteractionMessage.timeoutId)
    }
  }, [])

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  const onNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 980) {
      setSidebarOpen(false)
    }
  }

  const onCreateBurst = (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    if (target.closest('button, a, .card, .workspace-card')) {
      const hostRect = shellRef.current?.getBoundingClientRect()
      if (!hostRect) {
        return
      }

      const id = `${Date.now()}-${Math.random()}`
      const next = {
        id,
        x: event.clientX - hostRect.left,
        y: event.clientY - hostRect.top,
      }

      setClickBursts((current) => [...current, next])
      window.setTimeout(() => {
        setClickBursts((current) => current.filter((burst) => burst.id !== id))
      }, 650)
    }
  }

  const boardTitle = location.pathname.includes('/board/')
    ? 'Sprint 4 - TeamOps'
    : location.pathname.includes('/profile')
      ? 'Profile'
      : location.pathname.includes('/analytics')
        ? 'Analytics'
        : location.pathname.includes('/activity')
          ? 'Activity'
          : location.pathname.includes('/members')
            ? 'Members'
            : location.pathname.includes('/notifications')
              ? 'Notifications'
              : location.pathname.includes('/achievements')
                ? 'Achievements'
                : location.pathname.includes('/schedule')
                  ? 'Schedule'
                  : location.pathname.includes('/messages')
                    ? 'Messages'
                    : location.pathname.includes('/settings')
                      ? 'Settings'
      : 'TeamOps Workspace'
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div className="page-shell" ref={shellRef} onPointerDown={onCreateBurst}>
      {clickBursts.map((burst) => (
        <span
          key={burst.id}
          className="click-burst"
          style={{ left: `${burst.x}px`, top: `${burst.y}px` }}
        />
      ))}

      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="brand app-brand">
          <span className="brand-dot" />
          TeamOps
        </div>

        <div className="sidebar-workspace-chip">Demo ready</div>

        <p className="aside-section-label">Main</p>
        <nav className="nav-links">
          <NavLink
            to="/app/profile"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <UserRound size={18} className="nav-link-icon" />
            Profile
          </NavLink>
          <NavLink 
            to="/app" 
            end 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <LayoutDashboard size={18} className="nav-link-icon" />
            Dashboard
          </NavLink>
          <NavLink
            to="/app/analytics"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <BarChart3 size={18} className="nav-link-icon" />
            Analytics
            <span className="nav-badge">3</span>
          </NavLink>
          <NavLink
            to="/app/activity"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <Activity size={18} className="nav-link-icon" />
            Activity
            <span className="nav-badge">5</span>
          </NavLink>
          <NavLink
            to="/app/members"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <Users size={18} className="nav-link-icon" />
            Members
          </NavLink>
          <NavLink 
            to="/app/notifications" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <Bell size={18} className="nav-link-icon" />
            Notifications
            {unreadCount > 0 ? <span className="nav-badge">{unreadCount}</span> : null}
          </NavLink>
          <NavLink
            to="/app/achievements"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <Award size={18} className="nav-link-icon" />
            Achievements
            <span className="nav-badge">1</span>
          </NavLink>
          <NavLink
            to="/app/schedule"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <CheckSquare size={18} className="nav-link-icon" />
            Schedule
          </NavLink>
          <NavLink
            to="/app/messages"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <MessageSquare size={18} className="nav-link-icon" />
            Messages
            <span className="nav-badge">1</span>
          </NavLink>
        </nav>

        <p className="aside-section-label">Boards</p>
        <div className="board-mini-list">
          <button type="button" className="board-mini-item active"><span className="dot violet" />Sprint 4</button>
          <button type="button" className="board-mini-item"><span className="dot green" />Backend API</button>
          <button type="button" className="board-mini-item"><span className="dot pink" />UI/UX Sprint</button>
          <button type="button" className="board-mini-item"><span className="dot amber" />DB Migrations</button>
        </div>

        <div className="sidebar-user">
          <span className="sidebar-avatar">{userInitial}</span>
          <div>
            <div className="sidebar-user-name">{user?.name || 'Member'}</div>
            <div className="sidebar-user-role">Owner</div>
          </div>
        </div>
      </aside>

      <div className={`content-wrapper ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className="topbar">
          <div className="topbar-meta">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <h2 className="topbar-title">{boardTitle}</h2>
            <span className="live-chip"><span className="live-dot" />Live</span>
          </div>

          <div className="topbar-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle color mode">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="top-search">
              <Search size={14} />
              <input placeholder="Search cards..." />
            </div>
            <div className="relative">
              <button 
                className="icon-btn" 
                onClick={() => setShowPopover((value) => !value)}
                style={{ position: 'relative' }}
                aria-label="Open notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 ? <span className="notif-pip" /> : null}
              </button>
              {showPopover ? (
                <div className="popover">
                  <div className="row" style={{ marginBottom: 10 }}>
                    <strong>Live Notifications</strong>
                    <button className="btn-ghost" onClick={markAllRead}>Mark all read</button>
                  </div>
                  <ul className="notification-list">
                    {notifications.slice(0, 5).map((item) => (
                      <li key={item.id} className={`notification-item ${item.is_read ? '' : 'unread'}`}>
                        <div>{item.message}</div>
                        <small className="muted">
                          {new Date(item.created_at).toLocaleString()}
                        </small>
                      </li>
                    ))}
                    {notifications.length === 0 ? <li className="muted">No notifications yet.</li> : null}
                  </ul>
                </div>
              ) : null}
            </div>
            <button className="icon-btn" type="button" onClick={() => navigate('/app/settings')}>
              <Settings size={16} />
            </button>
            <button
              className="btn interactive-btn"
              onClick={() => setInteractionNote('New card composer is preparing.')}
            >
              <Plus size={16} />
              New Card
            </button>
            <button className="profile-chip" type="button" onClick={onLogout} aria-label="Logout">
              {userInitial}
            </button>
          </div>
        </header>

        {interactionNote ? <div className="interaction-note">{interactionNote}</div> : null}

        <main className="main-wrap">
          <Outlet />
        </main>
      </div>

      {sidebarOpen ? <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" /> : null}
    </div>
  )
}
