import { useEffect, useRef, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { AsyncButton, FeedbackNotice } from '../components/ui/feedback.jsx'
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

function getInitials(displayName, user) {
  const source = displayName.trim() || user?.firstName || user?.username || '?'
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function getStreakLabel(streak) {
  const count = streak ?? 0
  return `${count} ${count === 1 ? 'week' : 'weeks'}`
}

export default function Settings() {
  const { user, updateProfile, logout } = useUser()

  const [mood, setMood] = useState(user?.mood || '')
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [email, setEmail] = useState(user?.email || '')
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || '#4d6b58')

  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [moodSaving, setMoodSaving] = useState(false)
  const [moodSaved, setMoodSaved] = useState(false)
  const [moodError, setMoodError] = useState(null)
  const [failedMood, setFailedMood] = useState(null)

  const profileFeedbackTimer = useRef(null)
  const moodFeedbackTimer = useRef(null)

  useEffect(() => () => {
    window.clearTimeout(profileFeedbackTimer.current)
    window.clearTimeout(moodFeedbackTimer.current)
  }, [])

  const initials = getInitials(displayName, user)
  const profileDirty = (
    displayName !== (user?.displayName || '')
    || bio !== (user?.bio || '')
    || email !== (user?.email || '')
    || avatarColor !== (user?.avatarColor || '#4d6b58')
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
      const updated = await updateProfile({ displayName, bio, email, avatarColor })
      setDisplayName(updated?.displayName ?? displayName)
      setBio(updated?.bio ?? bio)
      setEmail(updated?.email ?? email)
      setAvatarColor(updated?.avatarColor ?? avatarColor)
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
            <p>Choose how your name and profile appear across Aurora.</p>
          </header>

          <form className="settings-profile-form" onSubmit={saveProfile}>
            <fieldset className="settings-avatar-fieldset">
              <legend>Avatar color</legend>
              <div className="settings-avatar-control">
                <div
                  className="settings-avatar-preview"
                  style={{ backgroundColor: avatarColor }}
                  aria-hidden="true"
                >
                  {initials}
                </div>
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
                Optional. Shared with your therapist if privacy allows.
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
              <p>Your Aurora account details.</p>
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
            className="settings-mood-fieldset"
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
