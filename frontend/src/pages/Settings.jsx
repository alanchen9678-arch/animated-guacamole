import { useState } from 'react'
import { useUser } from '../context/UserContext.jsx'

const MOODS = ['calm', 'anxious', 'sad', 'happy', 'stressed', 'grateful', 'tired', 'hopeful']

export default function Settings() {
  const { user, updateProfile, logout } = useUser()
  const [mood, setMood] = useState(user?.mood || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveMood(selected) {
    setMood(selected)
    setSaving(true)
    setSaved(false)
    try {
      await updateProfile({ mood: selected })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page">
      <style>{`
        .mood-grid {
          display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px;
        }
        .mood-chip {
          padding: 8px 16px; border-radius: 999px;
          border: 1.5px solid var(--line);
          background: transparent; color: var(--ink);
          font-size: 0.86rem; font-weight: 600;
          cursor: pointer; transition: border-color 140ms, background 140ms, color 140ms;
          text-transform: capitalize;
        }
        .mood-chip:hover { border-color: var(--accent); background: var(--accent-soft); }
        .mood-chip.selected {
          border-color: var(--accent); background: var(--accent); color: #fff;
        }
        .save-status {
          font-size: 0.82rem; color: var(--accent); font-weight: 600;
          height: 20px; margin-top: 10px;
          transition: opacity 300ms;
        }
        .account-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 0; border-bottom: 1px solid var(--line);
          font-size: 0.92rem;
        }
        .account-row:last-child { border-bottom: none; }
        .account-row .key { color: var(--muted); font-weight: 600; font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; }
        .account-row .val { color: var(--ink); font-weight: 500; }
        .plan-badge {
          display: inline-block; padding: 3px 12px; border-radius: 999px;
          background: var(--accent-soft); color: var(--accent);
          font-size: 0.76rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .danger-btn {
          padding: 10px 20px; border-radius: 999px;
          border: 1.5px solid #f5b7b7; background: transparent; color: #b91c1c;
          font-size: 0.86rem; font-weight: 600; cursor: pointer;
          transition: background 140ms, color 140ms;
        }
        .danger-btn:hover { background: #fde8e8; }
      `}</style>

      <header className="page-header">
        <h2>Settings</h2>
        <p>Manage your account, mood, and app preferences.</p>
      </header>

      <div className="grid">
        {/* Account info */}
        <article className="card span-6">
          <h3>Account</h3>
          <div className="account-row">
            <span className="key">Username</span>
            <span className="val">{user?.username}</span>
          </div>
          <div className="account-row">
            <span className="key">Name</span>
            <span className="val">{user?.firstName || '—'}</span>
          </div>
          <div className="account-row">
            <span className="key">Email</span>
            <span className="val">{user?.email || '—'}</span>
          </div>
          <div className="account-row">
            <span className="key">Plan</span>
            <span className="plan-badge">{user?.plan || 'Free'}</span>
          </div>
          <div className="account-row">
            <span className="key">Streak</span>
            <span className="val">{user?.streak ?? 0} days</span>
          </div>
        </article>

        {/* Mood picker */}
        <article className="card span-6">
          <h3>How are you feeling?</h3>
          <p style={{ marginTop: 0, marginBottom: 12 }}>
            Set your current mood — it shows on your home dashboard.
          </p>
          <div className="mood-grid">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                className={`mood-chip${mood === m ? ' selected' : ''}`}
                onClick={() => saveMood(m)}
                disabled={saving}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="save-status" style={{ opacity: saved ? 1 : 0 }}>
            Mood saved ✓
          </div>
        </article>

        {/* Preferences */}
        <article className="card span-8">
          <h3>Preferences</h3>
          <div className="settings-list">
            <div className="settings-row">
              <div>
                <strong>Evening check-in reminders</strong>
                <p>Receive a soft prompt at the end of the day.</p>
              </div>
              <div className="toggle" aria-hidden="true" />
            </div>
            <div className="settings-row">
              <div>
                <strong>Low-stimulation mode</strong>
                <p>Reduce visual intensity during stressful periods.</p>
              </div>
              <div className="toggle" aria-hidden="true" />
            </div>
          </div>
        </article>

        {/* Sign out */}
        <article className="card span-4">
          <h3>Session</h3>
          <p style={{ marginTop: 0 }}>You are signed in as <strong>{user?.username}</strong>.</p>
          <button className="danger-btn" onClick={logout}>Sign out</button>
        </article>
      </div>
    </section>
  )
}
