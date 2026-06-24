import { useState } from 'react'
import { useUser } from '../context/UserContext.jsx'

const MOODS = ['calm', 'anxious', 'sad', 'happy', 'stressed', 'grateful', 'tired', 'hopeful']
const AVATAR_COLORS = ['#4d6b58', '#3a6898', '#b45309', '#15803d', '#be185d', '#0891b2', '#9333ea', '#c2410c']

export default function Settings() {
  const { user, updateProfile, logout } = useUser()

  const [mood, setMood]               = useState(user?.mood || '')
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio]                 = useState(user?.bio || '')
  const [email, setEmail]             = useState(user?.email || '')
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || '#4d6b58')

  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState(null)

  async function save(fields) {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await updateProfile(fields)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveProfile(e) {
    e.preventDefault()
    await save({ displayName, bio, email, avatarColor })
  }

  async function saveMood(selected) {
    setMood(selected)
    await save({ mood: selected })
  }

  const initials = (user?.displayName || user?.firstName || user?.username || '?').slice(0, 2).toUpperCase()

  return (
    <section className="page">
      <style>{`
        .mood-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
        .mood-chip {
          padding: 8px 16px; border-radius: 999px; border: 1.5px solid var(--line);
          background: transparent; color: var(--ink);
          font-size: 0.86rem; font-weight: 600; cursor: pointer;
          transition: border-color 140ms, background 140ms, color 140ms; text-transform: capitalize;
        }
        .mood-chip:hover { border-color: var(--accent); background: var(--accent-soft); }
        .mood-chip.selected { border-color: var(--accent); background: var(--accent); color: #fff; }

        .color-swatches { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
        .color-swatch {
          width: 36px; height: 36px; border-radius: 50%; border: 3px solid transparent;
          cursor: pointer; transition: transform 140ms;
        }
        .color-swatch:hover { transform: scale(1.12); }
        .color-swatch.selected { border-color: var(--ink); }

        .account-card {
          display: grid;
          gap: 10px;
          align-content: start;
        }
        .account-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          padding: 14px 16px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: rgba(255,255,255,0.52);
          font-size: 0.92rem;
        }
        .account-row--stack {
          align-items: flex-start;
          flex-direction: column;
          gap: 8px;
        }
        .account-row .key {
          color: var(--muted);
          font-weight: 600;
          font-size: 0.76rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .account-row .val {
          color: var(--ink);
          font-weight: 600;
          text-align: left;
        }
        .plan-badge {
          display: inline-block; padding: 3px 12px; border-radius: 999px;
          background: var(--accent-soft); color: var(--accent);
          font-size: 0.76rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .anon-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px; border-radius: 999px;
          background: rgba(58,104,152,0.08); border: 1px solid rgba(58,104,152,0.18);
          font-size: 0.82rem; font-weight: 700; color: #3a6898;
        }
        .settings-field { display: grid; gap: 6px; }
        .settings-field label { font-size: 0.8rem; font-weight: 600; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; }
        .settings-input {
          width: 100%; padding: 10px 14px; border-radius: 12px;
          border: 1.5px solid var(--line); background: rgba(255,255,255,0.7);
          color: var(--ink); font-size: 0.92rem; outline: none;
          transition: border-color 140ms, box-shadow 140ms;
          box-sizing: border-box;
        }
        .settings-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
        .settings-textarea { min-height: 80px; resize: vertical; }
        .save-row { display: flex; align-items: center; gap: 14px; margin-top: 4px; }
        .save-btn {
          padding: 10px 24px; border-radius: 999px; border: none;
          background: var(--accent); color: #fff; font-size: 0.9rem; font-weight: 700;
          transition: opacity 140ms; cursor: pointer;
        }
        .save-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .save-status { font-size: 0.82rem; color: var(--accent); font-weight: 600; }
        .save-error  { font-size: 0.82rem; color: #dc2626; font-weight: 600; }
        .danger-btn {
          padding: 10px 20px; border-radius: 999px;
          border: 1.5px solid #f5b7b7; background: transparent; color: #b91c1c;
          font-size: 0.86rem; font-weight: 600; cursor: pointer;
          transition: background 140ms, color 140ms;
        }
        .danger-btn:hover { background: #fde8e8; }
        .avatar-preview {
          width: 64px; height: 64px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1.4rem; font-weight: 800; margin-bottom: 10px;
          transition: background 200ms;
        }
      `}</style>

      <header className="page-header">
        <h2>Settings</h2>
        <p>Manage your account, profile, and mood.</p>
      </header>

      <div className="grid">

        {/* Profile editor */}
        <article className="card span-8">
          <h3>Profile</h3>
          <div style={{ marginBottom: 16 }}>
            <div className="avatar-preview" style={{ background: avatarColor }}>{initials}</div>
            <div className="color-swatches">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${avatarColor === c ? ' selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setAvatarColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <form onSubmit={saveProfile} style={{ display: 'grid', gap: 14 }}>
            <div className="settings-field">
              <label>Display name</label>
              <input
                className="settings-input"
                placeholder={user?.firstName || user?.username || 'Your name'}
                value={displayName}
                maxLength={50}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>
            <div className="settings-field">
              <label>Email</label>
              <input
                className="settings-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="settings-field">
              <label>Bio <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — shared with your therapist if privacy allows)</span></label>
              <textarea
                className="settings-input settings-textarea"
                placeholder="A little about yourself..."
                value={bio}
                maxLength={500}
                onChange={e => setBio(e.target.value)}
              />
            </div>
            <div className="save-row">
              <button className="save-btn" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save profile'}
              </button>
              {saved  && <span className="save-status">Saved ✓</span>}
              {error  && <span className="save-error">{error}</span>}
            </div>
          </form>
        </article>

        {/* Account info */}
        <article className="card span-4 account-card">
          <h3>Account</h3>
          <div className="account-row">
            <span className="key">Username</span>
            <span className="val">{user?.username}</span>
          </div>
          <div className="account-row">
            <span className="key">Plan</span>
            <span className="plan-badge">{user?.plan || 'Free'}</span>
          </div>
          <div className="account-row">
            <span className="key">Streak</span>
            <span className="val">{user?.streak ?? 0} weeks</span>
          </div>
          {user?.anonymousName && (
            <div className="account-row account-row--stack">
              <span className="key">Peer identity</span>
              <span className="anon-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
                {user.anonymousName}
              </span>
            </div>
          )}
        </article>

        {/* Mood picker */}
        <article className="card span-12">
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
          {saved && <div className="save-status" style={{ marginTop: 10 }}>Saved ✓</div>}
        </article>

        {/* Sign out */}
        <article className="card span-12">
          <h3>Session</h3>
          <p style={{ marginTop: 0 }}>You are signed in as <strong>{user?.username}</strong>.</p>
          <button className="danger-btn" onClick={logout}>Sign out</button>
        </article>

      </div>
    </section>
  )
}
