/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, getWorkspaces, loginUser, loginWithGoogle, registerUser, setAuthToken } from '../services/api.js'

const AuthContext = createContext(null)
const TOKEN_KEY = 'teamops_token'
const USER_KEY = 'teamops_user'
const ROLE_KEY = 'teamops_workspace_role'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [authReady, setAuthReady] = useState(false)
  const [currentWorkspaceRole, setCurrentWorkspaceRole] = useState(localStorage.getItem(ROLE_KEY) || 'viewer')

  const setWorkspaceRole = useCallback((role = 'viewer') => {
    setCurrentWorkspaceRole(role)
    localStorage.setItem(ROLE_KEY, role)
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setAuthToken('')
        setAuthReady(true)
        return
      }

      try {
        setAuthToken(token)
        const payload = await getCurrentUser()
        setUser(payload.user)
        localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
        const workspaces = await getWorkspaces().catch(() => [])
        const storedWorkspaceId = localStorage.getItem('teamops_workspace_id') || ''
        const workspace = workspaces.find((item) => String(item.id) === String(storedWorkspaceId)) || workspaces[0]
        if (workspace?.role) setWorkspaceRole(workspace.role)
      } catch {
        setToken('')
        setUser(null)
        setAuthToken('')
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } finally {
        setAuthReady(true)
      }
    }

    initAuth()
  }, [setWorkspaceRole, token])

  const login = useCallback(async (email, password) => {
    const payload = await loginUser({ email, password })
    setToken(payload.token)
    setUser(payload.user)
    setAuthToken(payload.token)
    localStorage.setItem(TOKEN_KEY, payload.token)
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
    const workspaces = await getWorkspaces().catch(() => [])
    const workspace = workspaces[0]
    if (workspace?.id) localStorage.setItem('teamops_workspace_id', workspace.id)
    if (workspace?.boardId) localStorage.setItem('teamops_board_id', workspace.boardId)
    if (workspace?.role) setWorkspaceRole(workspace.role)
    return payload
  }, [setWorkspaceRole])

  const register = async (name, email, password) => {
    const payload = await registerUser({ name, email, password })
    return payload
  }

  const loginWithGoogleAccount = useCallback(async (credential) => {
    const payload = await loginWithGoogle({ credential })
    setToken(payload.token)
    setUser(payload.user)
    setAuthToken(payload.token)
    localStorage.setItem(TOKEN_KEY, payload.token)
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
    const workspaces = await getWorkspaces().catch(() => [])
    const workspace = workspaces[0]
    if (workspace?.id) localStorage.setItem('teamops_workspace_id', workspace.id)
    if (workspace?.boardId) localStorage.setItem('teamops_board_id', workspace.boardId)
    if (workspace?.role) setWorkspaceRole(workspace.role)
    return payload
  }, [setWorkspaceRole])

  const setSession = (payload) => {
    setToken(payload.token)
    setUser(payload.user)
    setAuthToken(payload.token)
    localStorage.setItem(TOKEN_KEY, payload.token)
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
  }

  const updateCurrentUser = useCallback((nextUser) => {
    setUser(nextUser)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
  }, [])

  const logout = () => {
    setToken('')
    setUser(null)
    setAuthToken('')
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(ROLE_KEY)
  }

  const value = useMemo(
    () => ({ token, user, currentWorkspaceRole, setWorkspaceRole, login, loginWithGoogle: loginWithGoogleAccount, logout, register, authReady, setSession, updateCurrentUser }),
    [token, user, currentWorkspaceRole, setWorkspaceRole, login, authReady, loginWithGoogleAccount, updateCurrentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
