import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('jwt_token'))
  const [user, setUser]   = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (username, password) => {
    // Demo credentials — works without the Spring Boot backend
    const DEMO_USERS = {
      'superadmin':    { password: 'Admin@1234', roles: ['ROLE_SUPERADMIN'] },
      'analyst_priya': { password: 'Admin@1234', roles: ['ROLE_ANALYST'] },
      'analyst_rahul': { password: 'Admin@1234', roles: ['ROLE_ANALYST'] },
    }

    let accessToken, uname, roles

    try {
      const res = await axios.post(`${API_BASE}/api/v1/auth/admin/login`, { username, password })
      ;({ accessToken, username: uname, roles } = res.data)
    } catch {
      // Backend unavailable — verify against demo credentials
      const demo = DEMO_USERS[username]
      if (!demo || demo.password !== password) {
        throw new Error('Invalid credentials')
      }
      accessToken = `demo-jwt-${btoa(username)}-${Date.now()}`
      uname = username
      roles = demo.roles
    }

    localStorage.setItem('jwt_token', accessToken)
    localStorage.setItem('user', JSON.stringify({ username: uname, roles }))
    setToken(accessToken)
    setUser({ username: uname, roles })
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    return { accessToken, username: uname, roles }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('jwt_token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }, [])

  // Set auth header on mount if token exists
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
