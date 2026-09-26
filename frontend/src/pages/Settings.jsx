import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useUser } from '../context/UserContext.jsx'
import { AsyncButton, FeedbackNotice } from '../components/ui/feedback.jsx'
import { AvatarSymbol, USER_AVATAR_SYMBOLS } from '../components/ui/avatar-symbols.jsx'
import './Settings.css'

const MOODS = ['calm', 'anxious', 'sad', 'happy', 'stressed', 'grateful', 'tired', 'hopeful']

const AVATAR_COLORS = [
  { value: '#4d6b58', label: 'Forest sage' },
  { value: '#5c6f68', label: 'Eucalyptus' },
  { value: '#55707a', label: 'Blue grey' },
  { value: '#6a7482', label: 'Slate' },
  { value: '#6d6578', label: 'Muted plum' },
  { value: '#7b665f', label: 'Soft clay' },
  { value: '#7a6f63', label: 'Warm taupe' },
  { value: '#756a52', label: 'Quiet olive' },
]

function getStreakLabel(streak) {
  const count = streak ?? 0
  return `${count} ${count === 1 ? 'week' : 'weeks'}`
}

export default function Settings() {
  const { user, updateProfile, logout } = useUser()
  const location = useLocation()

  const [mood, setMood] = useState(user?.mood || '')
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [email, setEmail] = useState(user?.email || '')
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || '#4d6b58')
  const [avatarSymbol, setAvatarSymbol] = useState(user?.avatarSymbol || 'user-horizon')

  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [moodSaving, setMoodSaving] = useState(false)
  const [moodSaved, setMoodSaved] = useState(false)
  const [moodError, setMoodError] = useState(null)
  const [failedMood, setFailedMood] = useState(null)

  const profileFeedbackTimer = useRef(null)
  const moodFeedbackTimer = useRef(null)
  const moodControlRef = useRef(null)

  useEffect(() => {
    if (location.hash !== '#mood') return
    const frame = window.requestAnimationFrame(() => {
      moodControlRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' })
      const selected = moodControlRef.current?.querySelector('input:checked')
        || moodControlRef.current?.querySelector('input')
      selected?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash])

  useEffect(() => () => {
    window.clearTimeout(profileFeedbackTimer.current)
    window.clearTimeout(moodFeedbackTimer.current)
  }, [])

  const profileDirty = (
    displayName !== (user?.displayName || '')
    || bio !== (user?.bio || '')
    || email !== (user?.email || '')
    || avatarColor !== (user?.avatarColor || '#4d6b58')
    || avatarSymbol !== (user?.avatarSymbol || 'user-horizon')
  )

  const avatarColors = AVATAR_COLORS.some(({ value }) => value === avatarColor)
    ? AVATAR_COLORS
    : [{ value: avatarColor, label: 'Current color' }, ...AVATAR_COLORS]

  async function saveProfile(event) {
    event?.preventDefault()
    setProfileSaving(true)
    setProfileSaved(false)
    setProfileError(null)
    window.clearTimeout(profileFeedbackTimer.current)

    try {
      const updated = await updateProfile({ displayName, bio, email, avatarColor, avatarSymbol })
      setDisplayName(updated?.displayName ?? displayName)
      setBio(updated?.bio ?? bio)
      setEmail(updated?.email ?? email)
      setAvatarColor(updated?.avatarColor ?? avatarColor)
      setAvatarSymbol(updated?.avatarSymbol ?? avatarSymbol)
      setProfileSaved(true)
      profileFeedbackTimer.current = window.setTimeout(() => setProfileSaved(false), 2500)
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setProfileSaving(false)
    }
  }

  async function saveMood(selectedMood) {
    const previousMood = mood
    setMood(selectedMood)
    setMoodSaving(true)
    setMoodSaved(false)
    setMoodError(null)
    setFailedMood(null)
    window.clearTimeout(moodFeedbackTimer.current)

    try {
      await updateProfile({ mood: selectedMood })
      setMoodSaved(true)
      moodFeedbackTimer.current = window.setTimeout(() => setMoodSaved(false), 2500)
    } catch (error) {
      setMood(previousMood)
      setFailedMood(selectedMood)
      setMoodError(error.message)
    } finally {
      setMoodSaving(false)
    }
  }

  return (
    <section className="page settings-page">
      <header className="page-header settings-page-header">
        <h2>Settings</h2>
        <p>Manage your account, profile, and mood.</p>
      </header>

      <div className="settings-layout">
        <article className="settings-section settings-profile" aria-labelledby="settings-profile-heading">
          <header className="settings-section-header">
            <h3 id="settings-profile-heading">Profile</h3>
            <p>Choose how your name and profile appear across Dawn Harbor.</p>
          </header>

          <form className="settings-profile-form" onSubmit={saveProfile}>
            <fieldset className="settings-avatar-fieldset" disabled={profileSaving} aria-busy={profileSaving || undefined}>
              <legend>Profile mark</legend>
              <div className="settings-avatar-control">
                <div
                  className="settings-avatar-preview"
                  style={{ backgroundColor: avatarColor }}
                >
                  <AvatarSymbol
                    symbol={avatarSymbol}
                    size={30}
                    title={`${USER_AVATAR_SYMBOLS.find(({ id }) => id === avatarSymbol)?.label || 'Selected'} profile mark`}
                  />
                </div>
                <div className="settings-avatar-options">
                  <span className="settings-avatar-option-label">Symbol</span>
                  <div className="settings-symbol-options">
                    {USER_AVATAR_SYMBOLS.map(({ id: symbolId, label }) => {
                      const id = `settings-symbol-${symbolId}`
                      return (
                        <span className="settings-symbol-choice" key={symbolId}>
                          <input
                            className="settings-visually-hidden"
                            id={id}
                            name="avatarSymbol"
                            type="radio"
                            value={symbolId}
                            checked={avatarSymbol === symbolId}
                            onChange={() => setAvatarSymbol(symbolId)}
                          />
                          <label className="settings-symbol-button" htmlFor={id} title={label}>
                            <AvatarSymbol symbol={symbolId} size={20} />
                            <span className="settings-visually-hidden">{label}</span>
                          </label>
                        </span>
                      )
                    })}
                  </div>
                  <span className="settings-avatar-option-label">Color</span>
                  <div className="settings-color-swatches">
                    {avatarColors.map(({ value, label }) => {
                      const id = `settings-avatar-${value.slice(1)}`
                      return (
                        <span className="settings-color-choice" key={value}>
                          <input
                            className="settings-visually-hidden"
                            id={id}
                            name="avatarColor"
                            type="radio"
                            value={value}
                            checked={avatarColor === value}
                            onChange={() => setAvatarColor(value)}
                          />
                          <label
                            className="settings-color-swatch"
                            htmlFor={id}
                            style={{ '--settings-swatch': value }}
                            title={label}
                          >
                            <span className="settings-visually-hidden">{label}</span>
                          </label>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </fieldset>

            <div className="settings-field">
              <label htmlFor="settings-display-name">Display name</label>
              <input
                className="settings-input"
                id="settings-display-name"
                name="displayName"
                placeholder={user?.firstName || user?.username || 'Your name'}
                value={displayName}
                maxLength={50}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="settings-email">Email</label>
              <input
                className="settings-input"
                id="settings-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="settings-bio">Bio</label>
              <p className="settings-field-help" id="settings-bio-help">
                Optional profile note. It is not shown to peers.
              </p>
              <textarea
                className="settings-input settings-textarea"
                id="settings-bio"
                name="bio"
                aria-describedby="settings-bio-help"
                placeholder="A little about yourself..."
                value={bio}
                maxLength={500}
                onChange={(event) => setBio(event.target.value)}
              />
            </div>

            <div className="settings-save-row">
              <AsyncButton
                className="save-btn settings-save-button"
                type="submit"
                pending={profileSaving}
                pendingLabel="Saving..."
                disabled={profileSaving || !profileDirty}
              >
                Save profile
              </AsyncButton>
              {!profileDirty && !profileSaving && !profileSaved && !profileError && (
                <span className="settings-save-hint">Your profile is up to date.</span>
              )}
            </div>

            <div className="settings-feedback-slot">
              {profileSaved && (
                <FeedbackNotice variant="success" message="Your changes were saved." compact />
              )}
              {profileError && (
                <FeedbackNotice
                  variant="error"
                  title="Could not save changes"
                  message={profileError}
                  onRetry={saveProfile}
                  compact
                />
              )}
            </div>
          </form>
        </article>

        <aside className="settings-rail" aria-label="Account and session">
          <section className="settings-section settings-account" aria-labelledby="settings-account-heading">
            <header className="settings-section-header">
              <h3 id="settings-account-heading">Account</h3>
              <p>Your Dawn Harbor account details.</p>
            </header>
            <dl className="settings-account-list">
              <div className="settings-account-row">
                <dt>Username</dt>
                <dd>{user?.username}</dd>
              </div>
              <div className="settings-account-row">
                <dt>Plan</dt>
                <dd>{user?.plan || 'Free'}</dd>
              </div>
              <div className="settings-account-row">
                <dt>Streak</dt>
                <dd>{getStreakLabel(user?.streak)}</dd>
              </div>
              {user?.anonymousName && (
                <div className="settings-account-row">
                  <dt>Peer identity</dt>
                  <dd className="settings-peer-name">{user.anonymousName}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="settings-section settings-session" aria-labelledby="settings-session-heading">
            <header className="settings-section-header">
              <h3 id="settings-session-heading">Session</h3>
            </header>
            <p className="settings-session-copy">
              Signed in as <strong>{user?.username}</strong>.
            </p>
            <button className="settings-signout-button" type="button" onClick={logout}>
              Sign out
            </button>
          </section>
        </aside>

        <article className="settings-section settings-mood" aria-labelledby="settings-mood-heading">
          <header className="settings-section-header settings-mood-header">
            <h3 id="settings-mood-heading">How are you feeling?</h3>
            <p id="settings-mood-help">Set your current mood. It appears on your home dashboard.</p>
          </header>

          <fieldset
            id="mood" ref={moodControlRef} className="settings-mood-fieldset"
            aria-labelledby="settings-mood-heading"
            aria-describedby="settings-mood-help"
            aria-busy={moodSaving || undefined}
            disabled={moodSaving}
          >
            <legend className="settings-visually-hidden">Current mood</legend>
            <div className="settings-mood-grid">
              {MOODS.map((moodOption) => {
                const id = `settings-mood-${moodOption}`
                return (
                  <span className="settings-mood-choice" key={moodOption}>
                    <input
                      className="settings-visually-hidden"
                      id={id}
                      name="currentMood"
                      type="radio"
                      value={moodOption}
                      checked={mood === moodOption}
                      onChange={() => saveMood(moodOption)}
                    />
                    <label htmlFor={id}>{moodOption}</label>
                  </span>
                )
              })}
            </div>
          </fieldset>

          <div className="settings-feedback-slot settings-mood-feedback">
            {moodSaving && <FeedbackNotice message="Saving your mood..." compact />}
            {moodSaved && <FeedbackNotice variant="success" message="Your mood was saved." compact />}
            {moodError && (
              <FeedbackNotice
                variant="error"
                title="Could not save your mood"
                message={moodError}
                onRetry={() => saveMood(failedMood)}
                compact
              />
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
