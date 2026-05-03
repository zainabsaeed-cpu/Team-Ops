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
import { createBoard, getBoards, getWorkspace, getWorkspaces } from '../services/api.js'

const boardColors = ['#7c5cfc', '#14b8a6', '#ff4d6d', '#f59e0b', '#38bdf8', '#22c55e']

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const shellRef = useRef(null)
  const [showPopover, setShowPopover] = useState(false)
  const [clickBursts, setClickBursts] = useState([])
  const [interactionNote, setInteractionNote] = useState('')
  const [workspaceId, setWorkspaceId] = useState(() => localStorage.getItem('teamops_workspace_id') || '')
  const [workspaceName, setWorkspaceName] = useState('TeamOps Workspace')
  const [boards, setBoards] = useState([])
  const [boardsLoading, setBoardsLoading] = useState(false)
  const [boardModalOpen, setBoardModalOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardColor, setNewBoardColor] = useState(boardColors[0])
  const [boardError, setBoardError] = useState('')
  const [creatingBoard, setCreatingBoard] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    return window.innerWidth > 980
  })
  const { logout, user, currentWorkspaceRole } = useAuth()
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const { theme, toggleTheme } = useTheme()
  const activeBoardId = location.pathname.match(/\/board\/([^/]+)/)?.[1] || ''

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
    let alive = true

    const loadBoards = async () => {
      setBoardsLoading(true)
      setBoardError('')
      try {
        let nextWorkspaceId = workspaceId
        if (!nextWorkspaceId) {
          const workspaces = await getWorkspaces()
          nextWorkspaceId = workspaces[0]?.id || ''
          if (nextWorkspaceId) {
            localStorage.setItem('teamops_workspace_id', nextWorkspaceId)
          }
        }

        if (!nextWorkspaceId) {
          if (alive) setBoards([])
          return
        }

        const [payload, workspacePayload] = await Promise.all([
          getBoards(nextWorkspaceId),
          getWorkspace(nextWorkspaceId).catch(() => null),
        ])
        if (!alive) return
        setWorkspaceId(nextWorkspaceId)
        setBoards(payload?.boards || [])
        if (workspacePayload?.name) setWorkspaceName(workspacePayload.name)
      } catch {
        if (alive) setBoardError('Could not load boards')
      } finally {
        if (alive) setBoardsLoading(false)
      }
    }

    loadBoards()

    return () => {
      alive = false
    }
  }, [workspaceId])

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

  const onOpenBoard = (board) => {
    localStorage.setItem('teamops_workspace_id', board.workspace_id || workspaceId)
    localStorage.setItem('teamops_board_id', board.id)
    navigate(`/board/${board.id}`)
    onNavClick()
  }

  const onCreateBoard = async (event) => {
    event.preventDefault()
    const trimmed = newBoardName.trim()
    if (!trimmed) {
      setBoardError('Board name is required')
      return
    }

    setCreatingBoard(true)
    setBoardError('')
    try {
      const payload = await createBoard({ workspaceId, name: trimmed, color: newBoardColor })
      const board = payload?.board
      if (board) {
        setBoards((current) => [...current, board])
        setBoardModalOpen(false)
        setNewBoardName('')
        setNewBoardColor(boardColors[0])
        onOpenBoard(board)
      }
    } catch (error) {
      setBoardError(error?.response?.data?.error || 'Could not create board')
    } finally {
      setCreatingBoard(false)
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
            : location.pathname.includes('/projects')
              ? 'Projects & Workspaces'
              : 'TeamOps Workspace'
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U'
  const canCreateBoard = ['owner', 'admin'].includes(currentWorkspaceRole)

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

        <div className="sidebar-workspace-chip">{workspaceName}</div>

        <p className="aside-section-label">Main</p>
        <nav className="nav-links">          <NavLink
            to="/projects"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <Sparkles size={18} className="nav-link-icon" />
            Projects
          </NavLink>          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <UserRound size={18} className="nav-link-icon" />
            Profile
          </NavLink>
          <NavLink 
            to="/dashboard" 
            end 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <LayoutDashboard size={18} className="nav-link-icon" />
            Dashboard
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <BarChart3 size={18} className="nav-link-icon" />
            Analytics
            <span className="nav-badge">3</span>
          </NavLink>
          <NavLink
            to="/activity"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <Activity size={18} className="nav-link-icon" />
            Activity
            <span className="nav-badge">5</span>
          </NavLink>
          <NavLink
            to="/members"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <Users size={18} className="nav-link-icon" />
            Members
          </NavLink>
          <NavLink 
            to="/notifications" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <Bell size={18} className="nav-link-icon" />
            Notifications
            {unreadCount > 0 ? <span className="nav-badge">{unreadCount}</span> : null}
          </NavLink>
          <NavLink
            to="/achievements"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <Award size={18} className="nav-link-icon" />
            Achievements
            <span className="nav-badge">1</span>
          </NavLink>
          <NavLink
            to="/schedule"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <CheckSquare size={18} className="nav-link-icon" />
            Schedule
          </NavLink>
          <NavLink
            to="/messages"
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
          {boards.map((board) => (
            <button
              type="button"
              key={board.id}
              className={`board-mini-item ${String(activeBoardId) === String(board.id) ? 'active' : ''}`}
              onClick={() => onOpenBoard(board)}
            >
              <span className="dot" style={{ background: board.color || boardColors[0] }} />
              {board.name || board.title}
            </button>
          ))}
          {boardsLoading ? <span className="board-mini-empty">Loading boards...</span> : null}
          {!boardsLoading && boards.length === 0 ? <span className="board-mini-empty">No boards yet.</span> : null}
          {canCreateBoard ? (
            <button type="button" className="board-mini-item board-mini-add" onClick={() => setBoardModalOpen(true)}>
              <Plus size={14} />
              New Board
            </button>
          ) : (
            <span className="board-mini-empty">Board creation requires admin access.</span>
          )}
        </div>

        <div className="sidebar-user">
          <span className="sidebar-avatar">{userInitial}</span>
          <div>
            <div className="sidebar-user-name">{user?.name || 'Member'}</div>
            <div className="sidebar-user-role">{currentWorkspaceRole || 'viewer'}</div>
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
                      <li key={item.id} className={`notification-item ${item.is_read ? '' : 'unread'}`} onClick={() => !item.is_read && markRead(item.id)}>
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
            <button className="icon-btn" type="button" onClick={() => navigate('/settings')}>
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

      {boardModalOpen ? (
        <div className="board-modal-backdrop" role="presentation" onClick={() => setBoardModalOpen(false)}>
          <form className="new-board-modal" onSubmit={onCreateBoard} onClick={(event) => event.stopPropagation()}>
            <div className="board-modal-header">
              <div>
                <p className="board-modal-kicker">New board</p>
                <h3>Create board</h3>
              </div>
              <button type="button" className="icon-btn board-modal-close" onClick={() => setBoardModalOpen(false)} aria-label="Close dialog">
                <X size={16} />
              </button>
            </div>
            {boardError ? <div className="error board-modal-error">{boardError}</div> : null}
            <label className="board-modal-field">
              <span>Board name</span>
              <input className="input" value={newBoardName} autoFocus onChange={(event) => setNewBoardName(event.target.value)} />
            </label>
            <div className="board-color-grid" aria-label="Board color">
              {boardColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`board-color-swatch ${newBoardColor === color ? 'active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setNewBoardColor(color)}
                  aria-label={`Use ${color}`}
                />
              ))}
            </div>
            <div className="board-modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setBoardModalOpen(false)} disabled={creatingBoard}>Cancel</button>
              <button type="submit" className="btn interactive-btn" disabled={creatingBoard}>{creatingBoard ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
