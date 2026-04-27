/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import { loginUser, registerUser } from '../services/api.js'

const AuthContext = createContext(null)
const TOKEN_KEY = 'teamops_token'
const USER_KEY = 'teamops_user'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })

  const login = async (email, password) => {
    const payload = await loginUser({ email, password })
    setToken(payload.token)
    setUser(payload.user)
    localStorage.setItem(TOKEN_KEY, payload.token)
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
    return payload
  }

  const register = async (name, email, password) => {
    const payload = await registerUser({ name, email, password })
    setToken(payload.token)
    setUser(payload.user)
    localStorage.setItem(TOKEN_KEY, payload.token)
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
    return payload
  }

  const logout = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const value = useMemo(
    () => ({ token, user, login, logout, register }),
    [token, user],
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
