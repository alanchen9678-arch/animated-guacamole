import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { API_BASE_URL } from '../services/config'

const API = `${API_BASE_URL}/api/auth`
const TOKEN_STORAGE_KEY = 'aurora_token'
const LEGACY_SENSITIVE_KEYS = ['aurora.journal.entries', 'aurora.journal.moods']

function getInitialToken() {
  const sessionToken = sessionStorage.getItem(TOKEN_STORAGE_KEY)
  const legacyToken = localStorage.getItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  LEGACY_SENSITIVE_KEYS.forEach((key) => localStorage.removeItem(key))
  if (!sessionToken && legacyToken) {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, legacyToken)
    return legacyToken
  }
  return sessionToken
}

function clearSessionData() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  LEGACY_SENSITIVE_KEYS.forEach((key) => localStorage.removeItem(key))
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index)
    if (key?.startsWith('aurora.checkin.draft.')) sessionStorage.removeItem(key)
  }
}

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(getInitialToken)
  const [loading, setLoading] = useState(() => Boolean(sessionStorage.getItem(TOKEN_STORAGE_KEY)))

  const refreshUser = useCallback(async (tokenOverride = token) => {
    if (!tokenOverride) {
      setUser(null)
      return null
    }

    const res = await fetch(`${API}/me/`, { headers: { Authorization: `Token ${tokenOverride}` } })
    if (!res.ok) {
      clearSessionData()
      setToken(null)
      setUser(null)
      throw new Error('Unable to load user.')
    }

    const data = await res.json()
    setUser(data)
    return data
  }, [token])

  useEffect(() => {
    if (!token) { setLoading(false); return }
    refreshUser(token)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, refreshUser])

  const _persist = (tok, userData) => {
    clearSessionData()
    sessionStorage.setItem(TOKEN_STORAGE_KEY, tok)
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
    clearSessionData()
    setToken(null)
    setUser(null)
  }, [token])

  const updateProfile = useCallback(async (fields) => {
    const currentToken = sessionStorage.getItem(TOKEN_STORAGE_KEY)
    const res = await fetch(`${API}/me/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${currentToken}`,
      },
      body: JSON.stringify(fields),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Update failed.')
    setUser(data)
    return data
  }, [])

  return (
    <UserContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
