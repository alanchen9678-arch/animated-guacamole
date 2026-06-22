export const dashboardSnapshot = {
  nextCheckIn: 'Today at 8:00 PM',
  energyScore: 74,
  journalPrompts: [
    'What helped you feel grounded today?',
    'Where did you notice pressure building?',
    'What would make tomorrow gentler?',
  ],
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

function getAuthHeaders() {
  const token = localStorage.getItem('aurora_token')
  return token ? { Authorization: `Token ${token}` } : {}
}

export async function sendChatMessage(message) {
  const response = await fetch(`${API_BASE_URL}/api/chat/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ message }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || data.detail || 'Chat request failed.')
  }

  return data.reply
}
