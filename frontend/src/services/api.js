import { API_BASE_URL } from './config'

function getAuthHeaders() {
  const token = localStorage.getItem('aurora_token')
  return token ? { Authorization: `Token ${token}` } : {}
}

function getErrorMessage(data) {
  if (typeof data?.error === 'string') return data.error
  if (typeof data?.detail === 'string') return data.detail
  for (const value of Object.values(data ?? {})) {
    if (typeof value === 'string') return value
    if (Array.isArray(value) && value.length) return String(value[0])
  }
  return 'Request failed.'
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
  if (!res.ok) {
    const error = new Error(getErrorMessage(data))
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}

// Chat

export async function fetchChatHistory() {
  const data = await apiFetch('/api/chat/')
  return data.messages ?? []
}

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

export async function fetchJournalPrivacy() {
  return apiFetch('/api/journal/privacy/')
}

export async function updateJournalPrivacy(payload) {
  return apiFetch('/api/journal/privacy/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

// Library

export async function fetchLibraryProgress() {
  return apiFetch('/api/library/progress/')
}

export async function completeLibraryQuiz() {
  return apiFetch('/api/library/progress/', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

// Therapist

export async function fetchTherapistMatches() {
  return apiFetch('/api/therapist/matches/')
}

export async function saveTherapistMatch(therapistId) {
  return apiFetch('/api/therapist/matches/', {
    method: 'POST',
    body: JSON.stringify({ therapistId }),
  })
}

export async function fetchTherapistMessages(matchId) {
  const data = await apiFetch(`/api/therapist/matches/${matchId}/messages/`)
  return data.messages ?? []
}

export async function sendTherapistMessage(matchId, message) {
  return apiFetch(`/api/therapist/matches/${matchId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export async function fetchTherapistBookings(matchId) {
  const data = await apiFetch(`/api/therapist/matches/${matchId}/bookings/`)
  return data.bookings ?? []
}

export async function createTherapistBooking(matchId, payload) {
  return apiFetch(`/api/therapist/matches/${matchId}/bookings/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function cancelTherapistBooking(matchId, bookingId) {
  return apiFetch(`/api/therapist/matches/${matchId}/bookings/${bookingId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'cancelled' }),
  })
}

export async function fetchTherapistAppointments(matchId) {
  const data = await apiFetch(`/api/therapist/matches/${matchId}/appointments/`)
  return data.appointments ?? []
}

export async function createTherapistAppointment(matchId, payload) {
  return apiFetch(`/api/therapist/matches/${matchId}/appointments/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateTherapistAppointment(matchId, appointmentId, payload) {
  return apiFetch(`/api/therapist/matches/${matchId}/appointments/${appointmentId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function cancelTherapistAppointment(matchId, appointmentId) {
  return updateTherapistAppointment(matchId, appointmentId, { status: 'cancelled' })
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
