const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

function getAuthHeaders() {
  const token = localStorage.getItem('aurora_token')
  return token ? { Authorization: `Token ${token}` } : {}
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...opts.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.detail || 'Request failed.')
  return data
}

// Chat

export async function sendChatMessage(message) {
  const data = await apiFetch('/api/chat/', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
  return data.reply
}

// Check-ins

export async function fetchCheckIns() {
  return apiFetch('/api/checkins/')
}

export async function submitCheckIn(payload) {
  return apiFetch('/api/checkins/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// Journal

export async function fetchJournalEntries() {
  return apiFetch('/api/journal/')
}

export async function saveJournalEntry(payload) {
  return apiFetch('/api/journal/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// Peer

export async function fetchPeerProfile() {
  return apiFetch('/api/peer/profile/')
}

export async function completePeerOnboarding() {
  return apiFetch('/api/peer/profile/', { method: 'POST', body: JSON.stringify({}) })
}

export async function fetchPeerRooms() {
  return apiFetch('/api/peer/rooms/')
}

export async function fetchRoomMessages(roomId, sinceId) {
  const qs = sinceId ? `?since=${sinceId}` : ''
  return apiFetch(`/api/peer/rooms/${roomId}/messages/${qs}`)
}

export async function sendRoomMessage(roomId, content) {
  return apiFetch(`/api/peer/rooms/${roomId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function fetchPeers() {
  return apiFetch('/api/peer/peers/')
}

export async function connectPeer(userId) {
  return apiFetch(`/api/peer/connect/${userId}/`, { method: 'POST', body: JSON.stringify({}) })
}

export async function fetchDMs(userId, sinceId) {
  const qs = sinceId ? `?since=${sinceId}` : ''
  return apiFetch(`/api/peer/dm/${userId}/${qs}`)
}

export async function sendDM(userId, content) {
  return apiFetch(`/api/peer/dm/${userId}/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}
