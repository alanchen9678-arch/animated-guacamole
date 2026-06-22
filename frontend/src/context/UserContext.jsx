import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const API = 'http://localhost:8000/api/auth'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('aurora_token'))
  const [loading, setLoading] = useState(!!localStorage.getItem('aurora_token'))

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`${API}/me/`, { headers: { Authorization: `Token ${token}` } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setUser(data))
      .catch(() => { localStorage.removeItem('aurora_token'); setToken(null) })
      .finally(() => setLoading(false))
  }, [token])

  const _persist = (tok, userData) => {
    localStorage.setItem('aurora_token', tok)
    setToken(tok)
    setUser(userData)
  }

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed.')
    _persist(data.token, data.user)
  }, [])

  const register = useCallback(async (username, email, password, firstName) => {
    const res = await fetch(`${API}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, firstName }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed.')
    _persist(data.token, data.user)
  }, [])

  const logout = useCallback(async () => {
    if (token) {
      await fetch(`${API}/logout/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
      }).catch(() => {})
    }
    localStorage.removeItem('aurora_token')
    setToken(null)
    setUser(null)
  }, [token])

  return (
    <UserContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
