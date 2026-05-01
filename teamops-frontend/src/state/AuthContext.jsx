/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, loginUser, registerUser, setAuthToken } from '../services/api.js'

const AuthContext = createContext(null)
const TOKEN_KEY = 'teamops_token'
const USER_KEY = 'teamops_user'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [authReady, setAuthReady] = useState(false)

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
  }, [token])

  const login = async (email, password) => {
    const payload = await loginUser({ email, password })
    setToken(payload.token)
    setUser(payload.user)
    setAuthToken(payload.token)
    localStorage.setItem(TOKEN_KEY, payload.token)
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
    return payload
  }

  const register = async (name, email, password) => {
    const payload = await registerUser({ name, email, password })
    setToken(payload.token)
    setUser(payload.user)
    setAuthToken(payload.token)
    localStorage.setItem(TOKEN_KEY, payload.token)
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
    return payload
  }

  const logout = () => {
    setToken('')
    setUser(null)
    setAuthToken('')
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const value = useMemo(
    () => ({ token, user, login, logout, register, authReady }),
    [token, user, authReady],
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
