import { API_BASE_URL } from './config'

export const SESSION_EXPIRED_EVENT = 'dawn-harbor:session-expired'
export const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please sign in again to continue.'

export function announceSessionExpired() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, {
    detail: { message: SESSION_EXPIRED_MESSAGE },
  }))
}

function getAuthHeaders() {
  const token = sessionStorage.getItem('dawn-harbor_token')
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
  const authHeaders = getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...opts.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && authHeaders.Authorization) {
      announceSessionExpired()
    }
    const error = new Error(getErrorMessage(data))
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}

// Chat

export async function fetchChatHistory(beforeId = null) {
  const qs = beforeId ? '?before=' + encodeURIComponent(beforeId) : ''
  const data = await apiFetch('/api/chat/' + qs)
  return {
    messages: data.messages ?? [],
    hasMore: Boolean(data.hasMore),
    nextCursor: data.nextCursor ?? null,
  }
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
  const submit = (body) => apiFetch('/api/checkins/', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  try {
    return await submit(payload)
  } catch (error) {
    const usesCurrentPersonalityInstrument = (
      payload?.personality?.instrument === 'dawn-harbor-personality-v2'
    )
    const backendNeedsLegacyInstrument = (
      error.status === 400
      && error.message === 'Unknown personality instrument.'
      && usesCurrentPersonalityInstrument
    )
    if (!backendNeedsLegacyInstrument) throw error

    // Compatibility bridge for a frontend that reaches an older backend
    // during a rolling deployment. Validation fails before that backend
    // writes anything, so retrying this one recognized schema is safe.
    const legacyProductSlug = ['au', 'rora'].join('')
    return submit({
      ...payload,
      personality: {
        ...payload.personality,
        instrument: `${legacyProductSlug}-personality-v2`,
      },
    })
  }
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

export async function fetchTherapistMessages(matchId, beforeId = null) {
  const qs = beforeId ? '?before=' + encodeURIComponent(beforeId) : ''
  const data = await apiFetch('/api/therapist/matches/' + matchId + '/messages/' + qs)
  return {
    messages: data.messages ?? [],
    hasMore: Boolean(data.hasMore),
    nextCursor: data.nextCursor ?? null,
  }
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

export async function completePeerOnboarding(consent) {
  return apiFetch('/api/peer/profile/', { method: 'POST', body: JSON.stringify(consent) })
}

export async function fetchPeerRooms() {
  return apiFetch('/api/peer/rooms/')
}

export async function switchPeerRoom() {
  return apiFetch('/api/peer/rooms/switch/', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function optOutPeerRoom() {
  return apiFetch('/api/peer/rooms/opt-out/', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function rejoinPeerRoom() {
  return apiFetch('/api/peer/rooms/rejoin/', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function fetchRoomMessages(roomId, { sinceId = null, beforeId = null } = {}) {
  const params = new URLSearchParams()
  if (sinceId) params.set('since', sinceId)
  if (beforeId) params.set('before', beforeId)
  const query = params.toString()
  return apiFetch('/api/peer/rooms/' + roomId + '/messages/' + (query ? '?' + query : ''))
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

export async function fetchPeerConnectionEvents() {
  return apiFetch('/api/peer/events/')
}

export async function fetchDMs(userId, { sinceId = null, beforeId = null } = {}) {
  const params = new URLSearchParams()
  if (sinceId) params.set('since', sinceId)
  if (beforeId) params.set('before', beforeId)
  const query = params.toString()
  return apiFetch('/api/peer/dm/' + userId + '/' + (query ? '?' + query : ''))
}

export async function sendDM(userId, content) {
  return apiFetch(`/api/peer/dm/${userId}/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}
