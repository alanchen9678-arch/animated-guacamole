import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { API_BASE_URL } from '../services/config'
import { SESSION_EXPIRED_EVENT, SESSION_EXPIRED_MESSAGE } from '../services/api.js'

const API = `${API_BASE_URL}/api/auth`
const TOKEN_STORAGE_KEY = 'dawn-harbor_token'
const LEGACY_SENSITIVE_KEYS = ['dawn-harbor.journal.entries', 'dawn-harbor.journal.moods']
const SESSION_DRAFT_PREFIXES = [
  'dawn-harbor.checkin.draft.',
  'dawn-harbor.journal.draft.',
  'dawn-harbor.therapist-prefs.',
]

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

function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

function clearSessionData() {
  clearAuthToken()
  LEGACY_SENSITIVE_KEYS.forEach((key) => localStorage.removeItem(key))
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index)
    if (SESSION_DRAFT_PREFIXES.some((prefix) => key?.startsWith(prefix))) {
      sessionStorage.removeItem(key)
    }
  }
}

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(getInitialToken)
  const [loading, setLoading] = useState(() => Boolean(sessionStorage.getItem(TOKEN_STORAGE_KEY)))
  const [sessionExpired, setSessionExpired] = useState('')

  const expireSession = useCallback((message = SESSION_EXPIRED_MESSAGE) => {
    clearAuthToken()
    setToken(null)
    setUser(null)
    setSessionExpired(message)
  }, [])

  const refreshUser = useCallback(async (tokenOverride = token) => {
    if (!tokenOverride) {
      setUser(null)
      return null
    }

    const res = await fetch(`${API}/me/`, { headers: { Authorization: `Token ${tokenOverride}` } })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 401) {
        expireSession()
        throw new Error(SESSION_EXPIRED_MESSAGE)
      }
      throw new Error(data.error || data.detail || 'Unable to load user.')
    }

    setUser(data)
    return data
  }, [expireSession, token])

  useEffect(() => {
    function handleSessionExpired(event) {
      expireSession(event.detail?.message || SESSION_EXPIRED_MESSAGE)
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [expireSession])

  useEffect(() => {
    if (!token) { setLoading(false); return }
    refreshUser(token)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, refreshUser])

  const _persist = (tok, userData) => {
    clearAuthToken()
    sessionStorage.setItem(TOKEN_STORAGE_KEY, tok)
    setToken(tok)
    setUser(userData)
    setSessionExpired('')
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
    setSessionExpired('')
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
    if (!res.ok) {
      if (res.status === 401) expireSession()
      throw new Error(res.status === 401 ? SESSION_EXPIRED_MESSAGE : data.error || 'Update failed.')
    }
    setUser(data)
    return data
  }, [expireSession])

  return (
    <UserContext.Provider value={{ user, token, loading, sessionExpired, login, register, logout, updateProfile, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
