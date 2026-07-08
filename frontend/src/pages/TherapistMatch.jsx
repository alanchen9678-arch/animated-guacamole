import { useState, useRef, useEffect } from 'react'
import { AuroraDropdown } from '../components/ui/heroui-dropdown.jsx'
import { ChatInput, ChatInputSubmit, ChatInputTextArea } from '../components/ui/chat-input.jsx'
import { useUser } from '../context/UserContext.jsx'
import {
  fetchTherapistMatches,
  fetchTherapistMessages,
  saveTherapistMatch,
  sendTherapistMessage,
} from '../services/api.js'

// ─── mock data ─────────────────────────────────────────────────────────────────

const PROFILE = {
  userId: '124324234',
  updated: 'Jun 15, 2026 · 9:14 AM',
  sources: { checkins: 5, chatbot: 12, journal: 8 },
  concerns: {
    anxiety:       78,
    stress:        71,
    burnout:       62,
    loneliness:    45,
    lowConfidence: 38,
    grief:         20,
  },
  overall: 52,
}

const CONCERN_LABEL = {
  anxiety: 'Anxiety', stress: 'Stress', burnout: 'Burnout',
  loneliness: 'Loneliness', lowConfidence: 'Low Confidence', grief: 'Grief',
}

function formatNeedsProfile(rawProfile) {
  if (!rawProfile?.concerns) return null

  const updated = rawProfile.updated ? new Date(rawProfile.updated) : null
  const updatedLabel = updated && !Number.isNaN(updated.getTime())
    ? updated.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Recently'

  return {
    ...rawProfile,
    updatedLabel,
  }
}

const ACTIVE_THERAPIST_CHATS_KEY = 'aurora.therapistMatch.activeChats'

const CORE_THERAPISTS = [
  {
    id: 1, initials: 'PS', color: '#3a6898',
    name: 'Dr. Priya Sharma',
    credentials: { license: 'PhD, LMFT', state: 'CA', location: 'San Francisco, CA' },
    expertise: ['anxiety', 'stress', 'burnout'],
    insurance: ['Aetna', 'BlueCross BlueShield', 'United Healthcare'],
    priceRange: '$120–140 / session',
    languages: ['English', 'Hindi'],
    mode: ['online', 'in-person'],
    rating: 4.9, reviews: 48, yearsExp: 12,
    availability: 'Next available: Tomorrow',
    bio: 'Dr. Sharma specializes in cognitive-behavioral therapy (CBT) for anxiety and burnout, with 12 years of experience helping high-achieving professionals find sustainable balance. Her approach is warm but direct — she will tell you what you need to hear.',
  },
  {
    id: 2, initials: 'JW', color: '#4d6b58',
    name: 'Dr. James Walker',
    credentials: { license: 'LCSW', state: 'CA', location: 'Los Angeles, CA' },
    expertise: ['loneliness', 'grief', 'anxiety'],
    insurance: ['United Healthcare', 'Cigna', 'Self-pay / Out-of-pocket'],
    priceRange: '$95–115 / session',
    languages: ['English'],
    mode: ['in-person'],
    rating: 4.7, reviews: 31, yearsExp: 9,
    availability: 'Next available: Mon Jun 17',
    bio: 'Dr. Walker brings a compassionate, relationship-focused lens to grief and social isolation. With a background in attachment theory, he helps clients build genuine connection and process loss at their own pace.',
  },
  {
    id: 3, initials: 'MR', color: '#b45309',
    name: 'Dr. Maria Rodriguez',
    credentials: { license: 'PsyD', state: 'CA', location: 'San Diego, CA' },
    expertise: ['stress', 'burnout', 'lowConfidence'],
    insurance: ['Aetna', 'BlueCross BlueShield', 'Humana'],
    priceRange: '$110–130 / session',
    languages: ['English', 'Spanish'],
    mode: ['online'],
    rating: 4.8, reviews: 62, yearsExp: 15,
    availability: 'Next available: Today',
    bio: 'Dr. Rodriguez focuses on building resilience and self-efficacy in clients navigating chronic stress and career burnout. Fluent in Spanish and English, she sees clients across California via telehealth.',
  },
  {
    id: 4, initials: 'KC', color: '#1d4ed8',
    name: 'Dr. Kevin Chen',
    credentials: { license: 'PhD', state: 'NY', location: 'New York, NY' },
    expertise: ['anxiety', 'loneliness', 'stress'],
    insurance: ['BlueCross BlueShield', 'United Healthcare', 'Cigna'],
    priceRange: '$150–175 / session',
    languages: ['English', 'Mandarin'],
    mode: ['online', 'in-person'],
    rating: 4.9, reviews: 87, yearsExp: 11,
    availability: 'Next available: Wed Jun 18',
    bio: 'Dr. Chen is a bilingual therapist (English / Mandarin) specializing in anxiety disorders and social isolation. He uses an integrative approach combining CBT, ACT, and mindfulness-based techniques.',
  },
  {
    id: 5, initials: 'AJ', color: '#be185d',
    name: 'Dr. Aisha Johnson',
    credentials: { license: 'LCSW', state: 'NY', location: 'Brooklyn, NY' },
    expertise: ['grief', 'burnout', 'stress'],
    insurance: ['Aetna', 'Cigna', 'Self-pay / Out-of-pocket'],
    priceRange: '$130–150 / session',
    languages: ['English'],
    mode: ['in-person', 'online'],
    rating: 4.8, reviews: 54, yearsExp: 14,
    availability: 'Next available: Thu Jun 19',
    bio: 'Dr. Johnson draws on narrative therapy and somatic approaches to help clients process grief and professional burnout. She is known for holding difficult emotions with exceptional warmth and steadiness.',
  },
  {
    id: 6, initials: 'TB', color: '#15803d',
    name: 'Dr. Thomas Brown',
    credentials: { license: 'LPC', state: 'TX', location: 'Austin, TX' },
    expertise: ['anxiety', 'stress', 'lowConfidence'],
    insurance: ['United Healthcare', 'BlueCross BlueShield', 'Humana'],
    priceRange: '$90–110 / session',
    languages: ['English', 'Spanish'],
    mode: ['online'],
    rating: 4.6, reviews: 29, yearsExp: 7,
    availability: 'Next available: Tomorrow',
    bio: 'Dr. Brown helps clients break free from anxiety-driven avoidance patterns using evidence-based exposure therapy and motivational enhancement techniques. Available exclusively online across Texas.',
  },
  {
    id: 7, initials: 'LP', color: '#9333ea',
    name: 'Dr. Lisa Park',
    credentials: { license: 'PhD, LMFT', state: 'TX', location: 'Houston, TX' },
    expertise: ['burnout', 'lowConfidence', 'loneliness'],
    insurance: ['Aetna', 'Cigna', 'Self-pay / Out-of-pocket'],
    priceRange: '$85–105 / session',
    languages: ['English'],
    mode: ['in-person', 'online'],
    rating: 4.7, reviews: 41, yearsExp: 10,
    availability: 'Next available: Mon Jun 17',
    bio: 'Dr. Park specializes in helping clients rediscover their sense of identity after burnout and build genuine self-worth. Her practice is warm, structured, and goal-oriented with clear milestones.',
  },
  {
    id: 8, initials: 'RG', color: '#0891b2',
    name: 'Dr. Rachel Green',
    credentials: { license: 'LCSW', state: 'FL', location: 'Miami, FL' },
    expertise: ['grief', 'anxiety', 'loneliness'],
    insurance: ['BlueCross BlueShield', 'United Healthcare', 'Humana'],
    priceRange: '$100–120 / session',
    languages: ['English', 'Spanish'],
    mode: ['online'],
    rating: 4.8, reviews: 36, yearsExp: 8,
    availability: 'Next available: Today',
    bio: 'Dr. Green is a grief specialist and anxiety therapist practising in Florida. Her telehealth practice makes high-quality care accessible statewide. She is known for creating an immediately safe and non-judgmental space.',
  },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]
const LANGUAGES = ['English','Spanish','French','Mandarin','Hindi','Arabic','Portuguese']
const INSURERS  = ['Aetna','BlueCross BlueShield','United Healthcare','Cigna','Humana','Self-pay / Out-of-pocket']
const STATE_OPTIONS = US_STATES.map((stateCode) => ({ value: stateCode, label: stateCode }))
const INSURER_OPTIONS = INSURERS.map((insurer) => ({ value: insurer, label: insurer }))

const STATE_MARKETS = {
  AL: 'Birmingham', AK: 'Anchorage', AZ: 'Phoenix', AR: 'Little Rock', CA: 'Los Angeles',
  CO: 'Denver', CT: 'Hartford', DE: 'Wilmington', FL: 'Miami', GA: 'Atlanta',
  HI: 'Honolulu', ID: 'Boise', IL: 'Chicago', IN: 'Indianapolis', IA: 'Des Moines',
  KS: 'Wichita', KY: 'Louisville', LA: 'New Orleans', ME: 'Portland', MD: 'Baltimore',
  MA: 'Boston', MI: 'Detroit', MN: 'Minneapolis', MS: 'Jackson', MO: 'St. Louis',
  MT: 'Billings', NE: 'Omaha', NV: 'Las Vegas', NH: 'Manchester', NJ: 'Newark',
  NM: 'Albuquerque', NY: 'New York', NC: 'Charlotte', ND: 'Fargo', OH: 'Columbus',
  OK: 'Oklahoma City', OR: 'Portland', PA: 'Philadelphia', RI: 'Providence', SC: 'Charleston',
  SD: 'Sioux Falls', TN: 'Nashville', TX: 'Austin', UT: 'Salt Lake City', VT: 'Burlington',
  VA: 'Richmond', WA: 'Seattle', WV: 'Charleston', WI: 'Milwaukee', WY: 'Cheyenne',
}

const FIRST_NAMES = [
  'Avery', 'Jordan', 'Morgan', 'Taylor', 'Riley', 'Cameron', 'Skyler', 'Quinn', 'Rowan', 'Parker',
  'Reese', 'Sage', 'Devon', 'Casey', 'Harper', 'Emerson', 'Finley', 'Hayden', 'Kendall', 'Logan',
  'Micah', 'Noel', 'Payton', 'Shiloh', 'Tatum', 'Adrian', 'Bailey', 'Dakota', 'Elliot', 'Jamie',
]

const LAST_NAMES = [
  'Bennett', 'Carter', 'Delgado', 'Foster', 'Griffin', 'Hayes', 'Kim', 'Lopez', 'Morgan', 'Nguyen',
  'Patel', 'Rivera', 'Sullivan', 'Turner', 'Wright', 'Brooks', 'Chavez', 'Ellis', 'Flores', 'Jenkins',
]

const COLOR_PALETTE = ['#3a6898', '#4d6b58', '#b45309', '#1d4ed8', '#be185d', '#15803d', '#9333ea', '#0891b2', '#c2410c', '#0f766e']
const AVAILABILITY_OPTIONS = [
  'Next available: Today',
  'Next available: Tomorrow',
  'Next available: This week',
  'Next available: Within 3 days',
  'Next available: Accepting new clients now',
]

const THERAPIST_ARCHETYPES = [
  {
    license: 'PhD, LMFT',
    expertise: ['anxiety', 'stress', 'burnout'],
    insurance: ['Aetna', 'BlueCross BlueShield', 'United Healthcare'],
    mode: ['online', 'in-person'],
    priceRange: '$115-$145 / session',
    languageSets: [['English'], ['English', 'Hindi'], ['English', 'Arabic']],
    ratingBase: 4.7,
    reviewBase: 24,
    yearsExpBase: 8,
    bio:
      'specializes in practical support for anxiety, overload, and burnout using structured coping tools, nervous-system regulation, and steady goal-setting.',
  },
  {
    license: 'LCSW',
    expertise: ['loneliness', 'grief', 'anxiety'],
    insurance: ['United Healthcare', 'Cigna', 'Self-pay / Out-of-pocket'],
    mode: ['in-person', 'online'],
    priceRange: '$95-$125 / session',
    languageSets: [['English'], ['English', 'Spanish'], ['English', 'French']],
    ratingBase: 4.6,
    reviewBase: 18,
    yearsExpBase: 6,
    bio:
      'focuses on grief, disconnection, and major life transitions with a calm, relational style that helps clients rebuild closeness and emotional safety.',
  },
  {
    license: 'PsyD',
    expertise: ['stress', 'burnout', 'lowConfidence'],
    insurance: ['Aetna', 'Humana', 'BlueCross BlueShield'],
    mode: ['online'],
    priceRange: '$105-$135 / session',
    languageSets: [['English'], ['English', 'Spanish'], ['English', 'Portuguese']],
    ratingBase: 4.8,
    reviewBase: 30,
    yearsExpBase: 10,
    bio:
      'helps clients navigate pressure, burnout, and self-doubt with a blend of evidence-based skills, identity work, and strengths-based reflection.',
  },
  {
    license: 'LPC',
    expertise: ['anxiety', 'lowConfidence', 'loneliness'],
    insurance: ['Humana', 'Cigna', 'United Healthcare'],
    mode: ['online', 'in-person'],
    priceRange: '$90-$120 / session',
    languageSets: [['English'], ['English', 'Mandarin'], ['English', 'Arabic']],
    ratingBase: 4.5,
    reviewBase: 16,
    yearsExpBase: 5,
    bio:
      'works especially well with young adults who need support building confidence, reducing social avoidance, and feeling more secure in relationships.',
  },
  {
    license: 'LMFT',
    expertise: ['grief', 'burnout', 'stress'],
    insurance: ['Aetna', 'Self-pay / Out-of-pocket', 'BlueCross BlueShield'],
    mode: ['in-person', 'online'],
    priceRange: '$110-$140 / session',
    languageSets: [['English'], ['English', 'Spanish'], ['English', 'French']],
    ratingBase: 4.7,
    reviewBase: 22,
    yearsExpBase: 9,
    bio:
      'brings a warm, steady approach to grief, caregiver fatigue, and emotional exhaustion, balancing validation with practical next steps.',
  },
]

const DEFAULT_GENERATED_THERAPISTS_PER_STATE = THERAPIST_ARCHETYPES.length
const GENERATED_THERAPIST_COUNT_BY_STATE = {
  TX: 25,
}

function getGeneratedName(index) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length]
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]
  return `${firstName} ${lastName}`
}

function getInitials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function buildGeneratedTherapists() {
  let generatedIndex = 0

  return US_STATES.flatMap((stateCode, stateIndex) => {
    const therapistCount = GENERATED_THERAPIST_COUNT_BY_STATE[stateCode] ?? DEFAULT_GENERATED_THERAPISTS_PER_STATE

    return Array.from({ length: therapistCount }, (_, therapistSlotIndex) => {
      const archetype = THERAPIST_ARCHETYPES[therapistSlotIndex % THERAPIST_ARCHETYPES.length]
      const currentGeneratedIndex = generatedIndex
      generatedIndex += 1
      const rawName = getGeneratedName(currentGeneratedIndex)
      const name = `Dr. ${rawName}`
      const city = STATE_MARKETS[stateCode] ?? stateCode
      const languageSet = archetype.languageSets[(stateIndex + therapistSlotIndex) % archetype.languageSets.length]
      const rating = Number(
        Math.min(4.9, archetype.ratingBase + ((stateIndex + therapistSlotIndex) % 3) * 0.1).toFixed(1),
      )
      const reviews = archetype.reviewBase + stateIndex * 4 + therapistSlotIndex * 9
      const yearsExp = archetype.yearsExpBase + ((stateIndex + therapistSlotIndex) % 6)
      const availability = AVAILABILITY_OPTIONS[(stateIndex + therapistSlotIndex) % AVAILABILITY_OPTIONS.length]

      return {
        id: CORE_THERAPISTS.length + currentGeneratedIndex + 1,
        initials: getInitials(rawName),
        color: COLOR_PALETTE[currentGeneratedIndex % COLOR_PALETTE.length],
        name,
        credentials: {
          license: archetype.license,
          state: stateCode,
          location: archetype.mode.includes('in-person') ? `${city}, ${stateCode}` : `Telehealth in ${stateCode}`,
        },
        expertise: archetype.expertise,
        insurance: archetype.insurance,
        priceRange: archetype.priceRange,
        languages: languageSet,
        mode: archetype.mode,
        rating,
        reviews,
        yearsExp,
        availability,
        bio: `${name} ${archetype.bio} They currently serve clients based in ${stateCode}${archetype.mode.includes('in-person') ? `, with appointments centered in ${city}` : ''}.`,
      }
    })
  })
}

const THERAPISTS = [...CORE_THERAPISTS, ...buildGeneratedTherapists()]

function hydrateTherapistsByIds(ids) {
  return ids
    .map((id) => THERAPISTS.find((therapist) => therapist.id === id))
    .filter(Boolean)
}

function hydrateTherapistChatsFromMatches(matches) {
  return matches
    .map((match) => {
      const therapist = THERAPISTS.find((item) => item.id === match.therapistId)
      if (!therapist) return null
      return { ...therapist, matchId: match.id }
    })
    .filter(Boolean)
}

function loadLegacyActiveTherapistChats() {
  try {
    const stored = window.localStorage.getItem(ACTIVE_THERAPIST_CHATS_KEY)
    const ids = stored ? JSON.parse(stored) : []
    if (!Array.isArray(ids)) return []

    return hydrateTherapistsByIds(ids)
  } catch {
    return []
  }
}

function saveLegacyActiveTherapistChats(chats) {
  try {
    window.localStorage.setItem(
      ACTIVE_THERAPIST_CHATS_KEY,
      JSON.stringify(chats.map(t => t.id)),
    )
  } catch {
    // Storage can be unavailable in some private browsing modes.
  }
}

function clearLegacyActiveTherapistChats() {
  try {
    window.localStorage.removeItem(ACTIVE_THERAPIST_CHATS_KEY)
  } catch {
    // Storage can be unavailable in some private browsing modes.
  }
}

const THERAPIST_MESSAGES = [
  "Hello! I've reviewed your Aurora profile. I can see some real patterns worth working through together — I'm glad you reached out. How are you feeling today?",
  "That makes complete sense. Based on your profile, I'd like us to start by mapping out what's driving the stress peaks before we try to address them. Does that feel right?",
  "I hear you. We'll move at a pace that feels safe. There's no pressure to get through everything at once.",
  "I want to be direct with you — that pattern you're describing is very workable. A lot of my clients have been in exactly that spot. Let's talk about what's underneath it.",
  "I'll also send over some brief exercises to try between sessions. Small experiments, not homework. Does that sound okay?",
  "I'm noticing that what you're sharing connects strongly to what I see in your check-in data. Can you tell me more about what a typical morning looks like for you?",
]

// ─── scoring ──────────────────────────────────────────────────────────────────

function getTop3(concerns) {
  return Object.entries(concerns).sort(([,a],[,b]) => b - a).slice(0, 3)
}

function scoreTherapist(t, profile, prefs) {
  if (t.credentials.state !== prefs.state) return null
  if (!prefs.languages.some(l => t.languages.includes(l))) return null

  let score = 0
  for (const [concern, severity] of getTop3(profile.concerns)) {
    if (t.expertise.includes(concern)) score += severity / 10
  }
  if (t.insurance.includes(prefs.insurance)) score += 10
  if (prefs.mode === 'either' || t.mode.includes(prefs.mode)) score += 5

  return { ...t, score: Math.round(score * 10) / 10 }
}

function runMatching(profile, prefs) {
  return THERAPISTS
    .map(t => scoreTherapist(t, profile, prefs))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

// ─── small helpers ────────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.3, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function ConcernBar({ label, value }) {
  const color = value >= 61 ? '#dc2626' : value >= 31 ? '#d97706' : '#16a34a'
  return (
    <div className="tm-bar-row">
      <span className="tm-bar-label">{label}</span>
      <div className="tm-bar-track">
        <div className="tm-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="tm-bar-val" style={{ color }}>{value}</span>
    </div>
  )
}

function ExpertiseTag({ label }) {
  return <span className="tm-tag">{CONCERN_LABEL[label] ?? label}</span>
}

function BackBtn({ onClick, label = 'Back' }) {
  return (
    <button className="tm-back" onClick={onClick}>
      ← {label}
    </button>
  )
}

function Stars({ rating }) {
  return (
    <span className="tm-stars">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
      <span style={{ marginLeft: 4 }}>{rating}</span>
    </span>
  )
}

// ─── needs profile view ───────────────────────────────────────────────────────

function ActiveTherapistChats({ chats, onOpen }) {
  return (
    <div className="tm-active-card">
      <div className="tm-active-head">
        <p className="tm-section-label">Active therapist chats</p>
        <span>{chats.length}</span>
      </div>

      {chats.length === 0 ? (
        <div className="tm-active-empty">
          Therapists you message or book through Find a Therapist will appear here.
        </div>
      ) : (
        <div className="tm-active-list">
          {chats.map(t => (
            <div key={t.id} className="tm-active-row">
              <Avatar initials={t.initials} color={t.color} size={44} />
              <div className="tm-active-info">
                <strong>{t.name}</strong>
                <span>{t.credentials.license} - {t.credentials.location}</span>
              </div>
              <button className="tm-view-btn" onClick={() => onOpen(t)}>Open chat</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NeedsProfileView({ profile, activeChats, onOpenChat, onFind }) {
  const [refreshed, setRefreshed] = useState(false)
  const [shareChat, setShareChat] = useState(false)
  const [shareJournal, setShareJournal] = useState(false)

  if (!profile?.concerns) {
    return (
      <section className="page tm-page">
        <header className="page-header">
          <h2>Therapist Match</h2>
          <p>Complete your initial assessment to unlock therapist matching and sharing controls.</p>
        </header>

        <div className="tm-profile-grid">
          <ActiveTherapistChats chats={activeChats} onOpen={onOpenChat} />
          <div className="tm-overall-card">
            <p className="tm-section-label">Profile status</p>
            <div className="tm-big-score" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em' }}>Not ready</div>
            <div className="tm-big-score-sub">No assessment data yet</div>
            <p className="tm-updated">Start with your initial assessment in Check-Ins.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page tm-page">
      <header className="page-header">
        <h2>Therapist Match</h2>
        <p>Review your therapist sharing settings, then find a therapist who fits your profile.</p>
      </header>

      <div className="tm-profile-grid">
        <ActiveTherapistChats chats={activeChats} onOpen={onOpenChat} />

        <div className="tm-overall-card">
          <p className="tm-section-label">Overall score</p>
          <div className="tm-big-score">{profile.overall}</div>
          <div className="tm-big-score-sub">out of 100</div>
          <p className="tm-updated">Updated {profile.updatedLabel}</p>
          <div className="tm-sources">
            <span className="tm-source-pill">{profile.sources.checkins} check-ins</span>
            <span className="tm-source-pill">
              {profile.basis === 'weekly_average' ? 'Average of last 5 weeklies' : 'Based on initial assessment'}
            </span>
          </div>
          <button className="tm-regen-btn" onClick={() => setRefreshed(true)}>
            {refreshed ? 'Profile up to date ✓' : 'Regenerate profile'}
          </button>
        </div>

        <div className="tm-top3-card">
          <p className="tm-section-label">Therapist sharing</p>
          <p className="tm-privacy-always">
            Always shared: your stored needs profile and check-in scores.
          </p>
          <div className="tm-privacy-row">
            <div>
              <strong>Allow AI chat logs</strong>
              <p>Share recent Aurora conversations with your therapist.</p>
            </div>
            <button
              className={`tm-toggle${shareChat ? ' tm-toggle--on' : ''}`}
              onClick={() => setShareChat((value) => !value)}
              aria-pressed={shareChat}
            >
              <span className="tm-toggle-knob" />
            </button>
          </div>
          <div className="tm-privacy-row">
            <div>
              <strong>Allow journal history</strong>
              <p>Share past journal entries with your therapist.</p>
            </div>
            <button
              className={`tm-toggle${shareJournal ? ' tm-toggle--on' : ''}`}
              onClick={() => setShareJournal((value) => !value)}
              aria-pressed={shareJournal}
            >
              <span className="tm-toggle-knob" />
            </button>
          </div>
        </div>
      </div>

      <button className="tm-primary-btn" onClick={onFind}>
        Find a Therapist →
      </button>
    </section>
  )
}

// ─── preferences view ─────────────────────────────────────────────────────────

function PreferencesView({ onBack, onMatch }) {
  const [state, setState]         = useState('')
  const [languages, setLanguages] = useState(['English'])
  const [insurance, setInsurance] = useState('')
  const [mode, setMode]           = useState('either')
  const [error, setError]         = useState('')

  function toggleLang(lang) {
    setLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }

  function handleMatch() {
    if (!state) return setError('Please select your state.')
    if (!insurance) return setError('Please select your insurance.')
    if (languages.length === 0) return setError('Select at least one language.')
    setError('')
    onMatch({ state, languages, insurance, mode })
  }

  return (
    <section className="page tm-page">
      <BackBtn onClick={onBack} label="Needs Profile" />
      <header className="page-header" style={{ marginTop: 12 }}>
        <h2>Your preferences</h2>
        <p>We'll use these to filter and rank therapists for you.</p>
      </header>

      <div className="tm-prefs-grid">
        <div className="tm-pref-card">
          <label className="tm-pref-label">State <span className="tm-req">*</span></label>
          <AuroraDropdown
            ariaLabel="Select state"
            buttonClassName="tm-select tm-select--dropdown"
            items={STATE_OPTIONS}
            menuClassName="aurora-dropdown-menu--scrollable"
            onSelectionChange={setState}
            placeholder="Select state..."
            selectedKey={state}
          />
        </div>

        <div className="tm-pref-card">
          <label className="tm-pref-label">Insurance <span className="tm-req">*</span></label>
          <AuroraDropdown
            ariaLabel="Select insurance provider"
            buttonClassName="tm-select tm-select--dropdown"
            items={INSURER_OPTIONS}
            onSelectionChange={setInsurance}
            placeholder="Select insurer..."
            selectedKey={insurance}
          />
        </div>

        <div className="tm-pref-card">
          <label className="tm-pref-label">Preferred session type</label>
          <div className="tm-radio-group">
            {[['in-person','In-person'],['online','Online'],['either','No preference']].map(([val, lbl]) => (
              <label key={val} className={`tm-radio${mode === val ? ' tm-radio--active' : ''}`}>
                <input type="radio" name="mode" value={val} checked={mode === val} onChange={() => setMode(val)} />
                {lbl}
              </label>
            ))}
          </div>
        </div>

        <div className="tm-pref-card">
          <label className="tm-pref-label">Languages spoken (select all that apply)</label>
          <div className="tm-check-group">
            {LANGUAGES.map(lang => (
              <label key={lang} className={`tm-check${languages.includes(lang) ? ' tm-check--active' : ''}`}>
                <input type="checkbox" checked={languages.includes(lang)} onChange={() => toggleLang(lang)} />
                {lang}
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="tm-error">{error}</p>}

      <button className="tm-primary-btn" onClick={handleMatch}>
        Show my matches →
      </button>
    </section>
  )
}

// ─── results view ─────────────────────────────────────────────────────────────

function ResultsView({ matches, prefs, onSelect, onBack }) {
  if (matches.length === 0) {
    return (
      <section className="page tm-page">
        <BackBtn onClick={onBack} label="Preferences" />
        <header className="page-header" style={{ marginTop: 12 }}>
          <h2>No matches found</h2>
          <p>No therapists licensed in <strong>{prefs.state}</strong> match your current filters. Try adjusting your language or insurance preferences.</p>
        </header>
        <button className="tm-primary-btn" onClick={onBack}>Adjust preferences</button>
      </section>
    )
  }

  const maxScore = Math.max(...matches.map(m => m.score))

  return (
    <section className="page tm-page">
      <BackBtn onClick={onBack} label="Preferences" />
      <header className="page-header" style={{ marginTop: 12 }}>
        <h2>Your top {matches.length} match{matches.length !== 1 ? 'es' : ''}</h2>
        <p>Ranked by how well each therapist aligns with your needs profile and preferences.</p>
      </header>

      <div className="tm-results-list">
        {matches.map((t, idx) => (
          <div key={t.id} className="tm-result-card">
            <div className="tm-result-rank">#{idx + 1}</div>
            <Avatar initials={t.initials} color={t.color} size={52} />

            <div className="tm-result-info">
              <strong className="tm-result-name">{t.name}</strong>
              <span className="tm-result-creds">{t.credentials.license} · {t.credentials.location}</span>
              <div className="tm-tag-row">
                {t.expertise.map(e => <ExpertiseTag key={e} label={e} />)}
              </div>
              <div className="tm-result-meta">
                <Stars rating={t.rating} />
                <span className="tm-sep">·</span>
                <span>{t.reviews} reviews</span>
                <span className="tm-sep">·</span>
                <span>{t.yearsExp} yrs exp</span>
                <span className="tm-sep">·</span>
                <span>{t.availability}</span>
              </div>
              <div className="tm-result-detail-row">
                <span>{t.languages.join(', ')}</span>
                <span className="tm-sep">·</span>
                <span style={{ textTransform: 'capitalize' }}>{t.mode.join(' / ')}</span>
                <span className="tm-sep">·</span>
                <span>{t.priceRange}</span>
              </div>
            </div>

            <div className="tm-score-block">
              <div className="tm-score-num" style={{ color: t.score === maxScore ? '#4d6b58' : '#2e2a26' }}>
                {t.score.toFixed(1)}
              </div>
              <div className="tm-score-label">match score</div>
              <button className="tm-view-btn" onClick={() => onSelect(t)}>
                View profile
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── detail view ──────────────────────────────────────────────────────────────

function DetailView({ therapist: t, prefs, onChat, onBook, onBack }) {
  const [shareChat,    setShareChat]    = useState(false)
  const [shareJournal, setShareJournal] = useState(false)
  const [insurer, setInsurer]           = useState(prefs.insurance)
  const [memberId, setMemberId]         = useState('')
  const [booked, setBooked]             = useState(false)

  function handleBook() {
    setBooked(true)
    onBook?.(t)
  }

  return (
    <section className="page tm-page">
      <BackBtn onClick={onBack} label="Results" />

      <div className="tm-detail-grid">
        {/* ── left panel ── */}
        <div className="tm-detail-left">
          <div className="tm-detail-header">
            <Avatar initials={t.initials} color={t.color} size={64} />
            <div>
              <h2 className="tm-detail-name">{t.name}</h2>
              <p className="tm-detail-creds">{t.credentials.license} · {t.credentials.location}</p>
              <Stars rating={t.rating} />
              <span style={{ marginLeft: 8, fontSize: '0.82rem', color: 'var(--muted)' }}>{t.reviews} reviews</span>
            </div>
          </div>

          <p className="tm-bio">{t.bio}</p>

          <div className="tm-detail-section">
            <p className="tm-section-label">Specialties</p>
            <div className="tm-tag-row">{t.expertise.map(e => <ExpertiseTag key={e} label={e} />)}</div>
          </div>

          <div className="tm-detail-row-group">
            <div className="tm-detail-row">
              <span className="tm-dr-label">Experience</span>
              <span>{t.yearsExp} years</span>
            </div>
            <div className="tm-detail-row">
              <span className="tm-dr-label">Languages</span>
              <span>{t.languages.join(', ')}</span>
            </div>
            <div className="tm-detail-row">
              <span className="tm-dr-label">Session type</span>
              <span style={{ textTransform: 'capitalize' }}>{t.mode.join(' / ')}</span>
            </div>
            <div className="tm-detail-row">
              <span className="tm-dr-label">Price</span>
              <span>{t.priceRange}</span>
            </div>
            <div className="tm-detail-row">
              <span className="tm-dr-label">Availability</span>
              <span>{t.availability}</span>
            </div>
          </div>

          {/* ── privacy toggles ── */}
          <div className="tm-privacy-card">
            <p className="tm-section-label">Privacy &amp; data sharing</p>
            <p className="tm-privacy-always">
              Always shared: your Needs Profile + check-in scores.
            </p>
            <div className="tm-privacy-row">
              <div>
                <strong>Chatbot transcripts</strong>
                <p>Last 7 days of AI conversations</p>
              </div>
              <button
                className={`tm-toggle${shareChat ? ' tm-toggle--on' : ''}`}
                onClick={() => setShareChat(v => !v)}
                aria-pressed={shareChat}
              >
                <span className="tm-toggle-knob" />
              </button>
            </div>
            <div className="tm-privacy-row">
              <div>
                <strong>Journal entries</strong>
                <p>Last month of thought journal</p>
              </div>
              <button
                className={`tm-toggle${shareJournal ? ' tm-toggle--on' : ''}`}
                onClick={() => setShareJournal(v => !v)}
                aria-pressed={shareJournal}
              >
                <span className="tm-toggle-knob" />
              </button>
            </div>
          </div>
        </div>

        {/* ── right panel ── */}
        <div className="tm-detail-right">

          {/* ── insurance + booking ── */}
          <div className="tm-booking-card">
            <p className="tm-section-label">Book a session</p>

            {booked ? (
              <div className="tm-booked-confirm">
                <div className="tm-booked-icon">✓</div>
                <strong>Session requested!</strong>
                <p>You'll receive a confirmation from {t.name} within 24 hours.</p>
                <button className="tm-primary-btn" style={{ marginTop: 12, width: '100%' }} onClick={onChat}>
                  Open chat →
                </button>
              </div>
            ) : (
              <>
                <div className="tm-form-field">
                  <label className="tm-field-label">Insurance provider</label>
                  <AuroraDropdown
                    ariaLabel="Select booking insurance provider"
                    buttonClassName="tm-select tm-select--dropdown"
                    items={INSURER_OPTIONS}
                    onSelectionChange={setInsurer}
                    placeholder="Select..."
                    selectedKey={insurer}
                  />
                </div>
                <div className="tm-form-field">
                  <label className="tm-field-label">Member ID</label>
                  <input
                    className="tm-input"
                    type="text"
                    placeholder="e.g. XYZ123456789"
                    value={memberId}
                    onChange={e => setMemberId(e.target.value)}
                  />
                </div>
                <div className="tm-stripe-mock">
                  <p className="tm-stripe-label">Card details <span className="tm-stripe-badge">Test mode</span></p>
                  <input className="tm-input" placeholder="4242 4242 4242 4242" readOnly />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input className="tm-input" placeholder="MM / YY" readOnly />
                    <input className="tm-input" placeholder="CVC" readOnly />
                  </div>
                </div>
                <button
                  className="tm-primary-btn"
                  style={{ width: '100%', marginTop: 4 }}
                  onClick={handleBook}
                >
                  Confirm &amp; book session
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </section>
  )
}

// ─── chat view ────────────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatAppointmentDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function AppointmentBanner({ appt, expanded, onToggle }) {
  return (
    <div className="tm-appt-banner">
      <div className="tm-appt-icon">📅</div>
      <div>
        <strong>{appt.title}</strong>
        <p>{appt.date}</p>
        {appt.desc && <p className="tm-appt-desc">{appt.desc}</p>}
      </div>
    </div>
  )
}

function ActiveAppointmentBanner({ appt, expanded, onToggle }) {
  return (
    <button className={`tm-appt-banner${expanded ? ' tm-appt-banner--expanded' : ''}`} onClick={onToggle}>
      <div className="tm-appt-icon">Cal</div>
      <div className="tm-appt-banner-body">
        <strong>{appt.title}</strong>
        <p>{formatAppointmentDate(appt.date)}</p>
        {expanded && (
          <div className="tm-appt-expanded">
            <span>Therapist: {appt.therapist}</span>
            {appt.desc && <span>{appt.desc}</span>}
          </div>
        )}
      </div>
      <span className="tm-appt-chevron">{expanded ? 'Hide' : 'Details'}</span>
    </button>
  )
}

function ChatView({ therapist: t, onBack }) {
  const [messages, setMessages] = useState([
    { id: 0, role: 'therapist', text: "Hello! I've reviewed your Aurora profile. I can see some real patterns worth working through together — I'm glad you reached out. How are you feeling today?", time: timestamp(), type: 'text' },
  ])
  const [input, setInput]           = useState('')
  const [isTyping, setIsTyping]     = useState(false)
  const [showApptForm, setShowApptForm] = useState(false)
  const [showProfileCard, setShowProfileCard] = useState(false)
  const [activeAppointment, setActiveAppointment] = useState(null)
  const [appointmentExpanded, setAppointmentExpanded] = useState(false)
  const [apptTitle, setApptTitle]   = useState('')
  const [apptDate, setApptDate]     = useState('')
  const [apptDesc, setApptDesc]     = useState('')
  const [msgIdx, setMsgIdx]         = useState(0)
  const messagesRef                 = useRef(null)
  const inputRef                    = useRef(null)
  const shouldScrollRef             = useRef(false)

  useEffect(() => {
    const messagesEl = messagesRef.current
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'auto' })
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!shouldScrollRef.current) return
    shouldScrollRef.current = false
    const messagesEl = messagesRef.current
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' })
    if (!isTyping) inputRef.current?.focus()
  }, [messages, isTyping])

  function sendMessage() {
    const text = input.trim()
    if (!text || isTyping) return
    const userMsg = { id: Date.now(), role: 'user', text, time: timestamp(), type: 'text' }
    shouldScrollRef.current = true
    setMessages(prev => [...prev, userMsg])
    setInput('')
    inputRef.current?.focus()
    shouldScrollRef.current = true
    setIsTyping(true)
    setTimeout(() => {
      shouldScrollRef.current = true
      setIsTyping(false)
      const reply = THERAPIST_MESSAGES[msgIdx % THERAPIST_MESSAGES.length]
      setMsgIdx(i => i + 1)
      setMessages(prev => [...prev, { id: Date.now()+1, role: 'therapist', text: reply, time: timestamp(), type: 'text' }])
    }, 1100 + Math.random() * 700)
  }

  function createAppointment() {
    if (!apptTitle || !apptDate) return
    setActiveAppointment({ title: apptTitle, date: apptDate, desc: apptDesc, therapist: t.name })
    setAppointmentExpanded(false)
    setApptTitle('')
    setApptDate('')
    setApptDesc('')
    setShowApptForm(false)
  }

  function cancelAppointmentForm() {
    setApptTitle('')
    setApptDate('')
    setApptDesc('')
    setShowApptForm(false)
  }

  return (
    <div className="tm-chat-root">
      {/* header */}
      <div className="tm-chat-header">
        <button className="tm-back tm-back--inline" onClick={onBack}>←</button>
        <button
          className={`tm-chat-profile-trigger${showProfileCard ? ' tm-chat-profile-trigger--open' : ''}`}
          onClick={() => setShowProfileCard(v => !v)}
          aria-expanded={showProfileCard}
        >
          <Avatar initials={t.initials} color={t.color} size={36} />
          <span className="tm-chat-profile-copy">
            <strong className="tm-chat-name">{t.name}</strong>
            <span className="tm-chat-status">{t.credentials.license} · {t.credentials.location}</span>
          </span>
        </button>
        <button
          className="tm-appt-trigger"
          onClick={() => setShowApptForm(v => !v)}
          title="Schedule appointment"
        >
          + Appointment
        </button>
      </div>

      {activeAppointment && (
        <div className="tm-appt-hanger">
          <ActiveAppointmentBanner
            appt={activeAppointment}
            expanded={appointmentExpanded}
            onToggle={() => setAppointmentExpanded(v => !v)}
          />
        </div>
      )}

      {/* appointment form */}
      {showApptForm && (
        <div className="tm-appt-form">
          <strong style={{ fontSize: '0.9rem' }}>Schedule an appointment</strong>
          <input className="tm-input" placeholder="Title (e.g. Initial Consultation)" value={apptTitle} onChange={e => setApptTitle(e.target.value)} />
          <input className="tm-input" type="datetime-local" value={apptDate} onChange={e => setApptDate(e.target.value)} />
          <p className="tm-selected-date">
            {apptDate ? `Selected: ${formatAppointmentDate(apptDate)}` : 'Choose a date before creating the appointment.'}
          </p>
          <input className="tm-input" placeholder="Description (optional)" value={apptDesc} onChange={e => setApptDesc(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="tm-primary-btn" style={{ flex: 1 }} onClick={createAppointment}>Create appointment</button>
            <button className="tm-outline-btn" onClick={cancelAppointmentForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* messages */}
      <div className="tm-chat-messages" ref={messagesRef}>
        {messages.map(m => {
          if (m.type === 'appointment') {
            return (
              <div key={m.id} className="tm-appt-msg">
                <AppointmentBanner appt={m.appt} />
                <span className="tm-appt-time">{m.time}</span>
              </div>
            )
          }
          const isUser = m.role === 'user'
          return (
            <div key={m.id} className={`tm-msg-row${isUser ? ' tm-msg-row--user' : ''}`}>
              {!isUser && <Avatar initials={t.initials} color={t.color} size={30} />}
              <div className={`tm-bubble${isUser ? ' tm-bubble--user' : ' tm-bubble--them'}`}>
                <p className="tm-bubble-text">{m.text}</p>
                <span className="tm-bubble-time">{m.time}</span>
              </div>
              {isUser && (
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0 }}>You</div>
              )}
            </div>
          )
        })}
        {isTyping && (
          <div className="tm-msg-row">
            <Avatar initials={t.initials} color={t.color} size={30} />
            <div className="tm-bubble tm-bubble--them tm-typing-bubble">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
      </div>

      {/* input */}
      <div className="tm-chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder="Message…"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          disabled={isTyping}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || isTyping}
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

      {showProfileCard && (
        <div className="tm-profile-modal-backdrop" role="presentation" onClick={() => setShowProfileCard(false)}>
          <div className="tm-profile-modal" role="dialog" aria-modal="true" aria-label={`${t.name} profile`} onClick={e => e.stopPropagation()}>
            <button className="tm-profile-modal-close" onClick={() => setShowProfileCard(false)} aria-label="Close profile">x</button>
            <div className="tm-detail-header">
              <Avatar initials={t.initials} color={t.color} size={64} />
              <div>
                <h2 className="tm-detail-name">{t.name}</h2>
                <p className="tm-detail-creds">{t.credentials.license} - {t.credentials.location}</p>
                <Stars rating={t.rating} />
                <span style={{ marginLeft: 8, fontSize: '0.82rem', color: 'var(--muted)' }}>{t.reviews} reviews</span>
              </div>
            </div>

            <p className="tm-bio">{t.bio}</p>

            <div className="tm-detail-section">
              <p className="tm-section-label">Specialties</p>
              <div className="tm-tag-row">{t.expertise.map(e => <ExpertiseTag key={e} label={e} />)}</div>
            </div>

            <div className="tm-chat-profile-grid">
              <div className="tm-detail-row">
                <span className="tm-dr-label">Experience</span>
                <span>{t.yearsExp} years</span>
              </div>
              <div className="tm-detail-row">
                <span className="tm-dr-label">Languages</span>
                <span>{t.languages.join(', ')}</span>
              </div>
              <div className="tm-detail-row">
                <span className="tm-dr-label">Session type</span>
                <span style={{ textTransform: 'capitalize' }}>{t.mode.join(' / ')}</span>
              </div>
              <div className="tm-detail-row">
                <span className="tm-dr-label">Price</span>
                <span>{t.priceRange}</span>
              </div>
              <div className="tm-detail-row">
                <span className="tm-dr-label">Availability</span>
                <span>{t.availability}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── root ─────────────────────────────────────────────────────────────────────

function PersistentTherapistChatView({ therapist: t, onBack }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [chatError, setChatError] = useState('')
  const [showApptForm, setShowApptForm] = useState(false)
  const [showProfileCard, setShowProfileCard] = useState(false)
  const [activeAppointment, setActiveAppointment] = useState(null)
  const [appointmentExpanded, setAppointmentExpanded] = useState(false)
  const [apptTitle, setApptTitle] = useState('')
  const [apptDate, setApptDate] = useState('')
  const [apptDesc, setApptDesc] = useState('')
  const messagesRef = useRef(null)
  const inputRef = useRef(null)
  const shouldScrollRef = useRef(false)

  useEffect(() => {
    let isActive = true

    async function loadHistory() {
      if (!t.matchId) {
        if (isActive) {
          setMessages([])
          setIsLoadingHistory(false)
        }
        return
      }

      try {
        const history = await fetchTherapistMessages(t.matchId)
        if (!isActive) return
        setMessages(
          history.map((message) => ({
            id: message.id,
            role: message.role,
            text: message.content,
            time: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
          })),
        )
        setChatError('')
      } catch (error) {
        if (!isActive) return
        setMessages([])
        setChatError(error.message || 'Unable to load therapist chat history right now.')
      } finally {
        if (isActive) setIsLoadingHistory(false)
      }
    }

    loadHistory()

    return () => {
      isActive = false
    }
  }, [t.matchId])

  useEffect(() => {
    const messagesEl = messagesRef.current
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'auto' })
    inputRef.current?.focus()
  }, [isLoadingHistory])

  useEffect(() => {
    if (!shouldScrollRef.current) return
    shouldScrollRef.current = false
    const messagesEl = messagesRef.current
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' })
    if (!isTyping) inputRef.current?.focus()
  }, [messages, isTyping])

  async function sendMessage() {
    const text = input.trim()
    if (!text || isTyping || isLoadingHistory || !t.matchId) return
    const optimisticId = `pending-${Date.now()}`
    const optimisticMessage = {
      id: optimisticId,
      role: 'user',
      text,
      time: timestamp(),
      type: 'text',
    }

    shouldScrollRef.current = true
    setInput('')
    setChatError('')
    setMessages((prev) => {
      return [...prev, optimisticMessage]
    })
    setIsTyping(true)
    try {
      const data = await sendTherapistMessage(t.matchId, text)
      shouldScrollRef.current = true
      setMessages((prev) => [
        ...prev.filter((message) => message.id !== optimisticId),
        {
          id: data.userMessage.id,
          role: data.userMessage.role,
          text: data.userMessage.content,
          time: new Date(data.userMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'text',
        },
        {
          id: data.replyMessage.id,
          role: data.replyMessage.role,
          text: data.replyMessage.content,
          time: new Date(data.replyMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'text',
        },
      ])
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId))
      setChatError(error.message || 'Unable to send your message right now.')
    } finally {
      setIsTyping(false)
      inputRef.current?.focus()
    }
  }

  function createAppointment() {
    if (!apptTitle || !apptDate) return
    setActiveAppointment({ title: apptTitle, date: apptDate, desc: apptDesc, therapist: t.name })
    setAppointmentExpanded(false)
    setApptTitle('')
    setApptDate('')
    setApptDesc('')
    setShowApptForm(false)
  }

  function cancelAppointmentForm() {
    setApptTitle('')
    setApptDate('')
    setApptDesc('')
    setShowApptForm(false)
  }

  return (
    <div className="tm-chat-root">
      <div className="tm-chat-header">
        <button className="tm-back tm-back--inline" onClick={onBack}>Back</button>
        <button
          className={`tm-chat-profile-trigger${showProfileCard ? ' tm-chat-profile-trigger--open' : ''}`}
          onClick={() => setShowProfileCard((v) => !v)}
          aria-expanded={showProfileCard}
        >
          <Avatar initials={t.initials} color={t.color} size={36} />
          <span className="tm-chat-profile-copy">
            <strong className="tm-chat-name">{t.name}</strong>
            <span className="tm-chat-status">{t.credentials.license} - {t.credentials.location}</span>
          </span>
        </button>
        <button
          className="tm-appt-trigger"
          onClick={() => setShowApptForm((v) => !v)}
          title="Schedule appointment"
        >
          + Appointment
        </button>
      </div>

      {activeAppointment && (
        <div className="tm-appt-hanger">
          <ActiveAppointmentBanner
            appt={activeAppointment}
            expanded={appointmentExpanded}
            onToggle={() => setAppointmentExpanded((v) => !v)}
          />
        </div>
      )}

      {showApptForm && (
        <div className="tm-appt-form">
          <strong style={{ fontSize: '0.9rem' }}>Schedule an appointment</strong>
          <input className="tm-input" placeholder="Title (e.g. Initial Consultation)" value={apptTitle} onChange={(e) => setApptTitle(e.target.value)} />
          <input className="tm-input" type="datetime-local" value={apptDate} onChange={(e) => setApptDate(e.target.value)} />
          <p className="tm-selected-date">
            {apptDate ? `Selected: ${formatAppointmentDate(apptDate)}` : 'Choose a date before creating the appointment.'}
          </p>
          <input className="tm-input" placeholder="Description (optional)" value={apptDesc} onChange={(e) => setApptDesc(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="tm-primary-btn" style={{ flex: 1 }} onClick={createAppointment}>Create appointment</button>
            <button className="tm-outline-btn" onClick={cancelAppointmentForm}>Cancel</button>
          </div>
        </div>
      )}

      {chatError && (
        <div className="tm-chat-error" role="status">
          {chatError}
        </div>
      )}

      <div className="tm-chat-messages" ref={messagesRef}>
        {messages.map((message) => {
          const isUser = message.role === 'user'
          return (
            <div key={message.id} className={`tm-msg-row${isUser ? ' tm-msg-row--user' : ''}`}>
              {!isUser && <Avatar initials={t.initials} color={t.color} size={30} />}
              <div className={`tm-bubble${isUser ? ' tm-bubble--user' : ' tm-bubble--them'}`}>
                <p className="tm-bubble-text">{message.text}</p>
                <span className="tm-bubble-time">{message.time}</span>
              </div>
              {isUser && (
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0 }}>You</div>
              )}
            </div>
          )
        })}
        {isTyping && (
          <div className="tm-msg-row">
            <Avatar initials={t.initials} color={t.color} size={30} />
            <div className="tm-bubble tm-bubble--them tm-typing-bubble">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
      </div>

      <div className="tm-chat-input-bar">
        <ChatInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={sendMessage}
          loading={isTyping || isLoadingHistory}
          className="tm-chat-compose"
        >
          <ChatInputTextArea
            ref={inputRef}
            className="chat-textarea"
            placeholder="Message..."
            disabled={isTyping || isLoadingHistory || !t.matchId}
          />
          <ChatInputSubmit
            className="send-btn"
            disabled={!t.matchId || isLoadingHistory}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </ChatInputSubmit>
        </ChatInput>
      </div>

      {showProfileCard && (
        <div className="tm-profile-modal-backdrop" role="presentation" onClick={() => setShowProfileCard(false)}>
          <div className="tm-profile-modal" role="dialog" aria-modal="true" aria-label={`${t.name} profile`} onClick={(e) => e.stopPropagation()}>
            <button className="tm-profile-modal-close" onClick={() => setShowProfileCard(false)} aria-label="Close profile">x</button>
            <div className="tm-detail-header">
              <Avatar initials={t.initials} color={t.color} size={64} />
              <div>
                <h2 className="tm-detail-name">{t.name}</h2>
                <p className="tm-detail-creds">{t.credentials.license} - {t.credentials.location}</p>
                <Stars rating={t.rating} />
                <span style={{ marginLeft: 8, fontSize: '0.82rem', color: 'var(--muted)' }}>{t.reviews} reviews</span>
              </div>
            </div>

            <p className="tm-bio">{t.bio}</p>

            <div className="tm-detail-section">
              <p className="tm-section-label">Specialties</p>
              <div className="tm-tag-row">{t.expertise.map((expertise) => <ExpertiseTag key={expertise} label={expertise} />)}</div>
            </div>

            <div className="tm-chat-profile-grid">
              <div className="tm-detail-row">
                <span className="tm-dr-label">Experience</span>
                <span>{t.yearsExp} years</span>
              </div>
              <div className="tm-detail-row">
                <span className="tm-dr-label">Languages</span>
                <span>{t.languages.join(', ')}</span>
              </div>
              <div className="tm-detail-row">
                <span className="tm-dr-label">Session type</span>
                <span style={{ textTransform: 'capitalize' }}>{t.mode.join(' / ')}</span>
              </div>
              <div className="tm-detail-row">
                <span className="tm-dr-label">Price</span>
                <span>{t.priceRange}</span>
              </div>
              <div className="tm-detail-row">
                <span className="tm-dr-label">Availability</span>
                <span>{t.availability}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TherapistMatch() {
  const { user } = useUser()
  const needsProfile = formatNeedsProfile(user?.needsProfile)
  const [view,     setView]     = useState('profile')   // profile | prefs | results | detail | chat
  const [prefs,    setPrefs]    = useState(null)
  const [matches,  setMatches]  = useState([])
  const [selected, setSelected] = useState(null)
  const [activeChats, setActiveChats] = useState([])

  useEffect(() => {
    let cancelled = false

    async function loadActiveChats() {
      const legacyChats = loadLegacyActiveTherapistChats()

      if (!user) {
        if (!cancelled) setActiveChats(legacyChats)
        return
      }

      try {
        let data = await fetchTherapistMatches()
        let therapistIds = Array.isArray(data.therapistIds) ? data.therapistIds : []
        const legacyIds = legacyChats.map((therapist) => therapist.id)
        const missingLegacyIds = legacyIds.filter((id) => !therapistIds.includes(id))

        if (missingLegacyIds.length > 0) {
          await Promise.all(missingLegacyIds.map((therapistId) => saveTherapistMatch(therapistId)))
          data = await fetchTherapistMatches()
          therapistIds = Array.isArray(data.therapistIds) ? data.therapistIds : []
        }

        clearLegacyActiveTherapistChats()
        if (!cancelled) setActiveChats(hydrateTherapistChatsFromMatches(data.matches ?? []))
      } catch {
        if (!cancelled) setActiveChats(legacyChats)
      }
    }

    loadActiveChats()

    return () => {
      cancelled = true
    }
  }, [user])

  function handleMatch(p) {
    if (!needsProfile) return
    setPrefs(p)
    setMatches(runMatching(needsProfile, p).filter(t => !activeChats.some(active => active.id === t.id)))
    setView('results')
  }

  async function openChat(therapist) {
    let selectedTherapist = therapist

    setActiveChats((prev) => {
      const nextChats = prev.some((item) => item.id === therapist.id) ? prev : [...prev, therapist]
      if (!user) saveLegacyActiveTherapistChats(nextChats)
      return nextChats
    })

    if (user) {
      try {
        const data = await saveTherapistMatch(therapist.id)
        const savedMatch = data.match
        if (savedMatch?.id) {
          selectedTherapist = { ...therapist, matchId: savedMatch.id }
          setActiveChats((prev) => prev.map((item) => (
            item.id === therapist.id
              ? { ...item, matchId: savedMatch.id }
              : item
          )))
        }
      } catch {
        setActiveChats((prev) => {
          saveLegacyActiveTherapistChats(prev)
          return prev
        })
      }
    }

    setSelected(selectedTherapist)
    setView('chat')
  }

  return (
    <>
      <style>{TM_STYLES}</style>
      {view === 'profile'  && <NeedsProfileView profile={needsProfile} activeChats={activeChats} onOpenChat={openChat} onFind={() => setView('prefs')} />}
      {view === 'prefs'    && <PreferencesView onBack={() => setView('profile')} onMatch={handleMatch} />}
      {view === 'results'  && <ResultsView matches={matches} prefs={prefs} onSelect={t => { setSelected(t); setView('detail') }} onBack={() => setView('prefs')} />}
      {view === 'detail'   && selected && <DetailView therapist={selected} prefs={prefs} onChat={() => openChat(selected)} onBook={openChat} onBack={() => setView('results')} />}
      {view === 'chat'     && selected && <PersistentTherapistChatView therapist={selected} onBack={() => setView('profile')} />}
    </>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const TM_STYLES = `
  /* layout */
  .tm-page {
    min-height: calc(100vh - 220px);
    align-content: start;
  }

  .tm-profile-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 16px;
  }
  .tm-overall-card {
    display: none;
  }
  .tm-overall-card, .tm-concerns-card, .tm-top3-card {
    background: var(--panel-strong);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 20px;
    box-shadow: var(--shadow);
  }
  .tm-big-score {
    font-size: 3.2rem; font-weight: 900;
    letter-spacing: -0.05em; line-height: 1;
    margin: 8px 0 2px;
  }
  .tm-big-score-sub { font-size: 0.78rem; color: var(--muted); }
  .tm-updated { font-size: 0.76rem; color: var(--muted); margin: 12px 0 8px; }
  .tm-sources { display: flex; flex-direction: column; gap: 5px; }
  .tm-source-pill {
    font-size: 0.74rem; font-weight: 600;
    background: var(--accent-soft); color: var(--accent);
    border-radius: 999px; padding: 3px 10px; width: fit-content;
  }
  .tm-regen-btn {
    margin-top: 14px; width: 100%; padding: 8px;
    border: 1.5px solid var(--line); border-radius: 12px;
    background: transparent; color: var(--muted); font-size: 0.82rem;
    transition: border-color 140ms, color 140ms;
  }
  .tm-regen-btn:hover { border-color: var(--accent); color: var(--accent); }

  .tm-active-card {
    background: var(--panel-strong);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 20px;
    box-shadow: var(--shadow);
  }
  .tm-active-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  .tm-active-head .tm-section-label {
    margin-bottom: 0;
  }
  .tm-active-head span {
    min-width: 26px;
    height: 26px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78rem;
    font-weight: 800;
  }
  .tm-active-empty {
    border: 1px dashed var(--line);
    border-radius: 16px;
    padding: 16px;
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.5;
    background: rgba(255,255,255,0.58);
  }
  .tm-active-list {
    display: grid;
    gap: 10px;
  }
  .tm-active-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: rgba(210,228,220,0.22);
  }
  .tm-active-info {
    flex: 1;
    min-width: 0;
  }
  .tm-active-info strong {
    display: block;
    font-size: 0.94rem;
    margin-bottom: 3px;
  }
  .tm-active-info span {
    display: block;
    color: var(--muted);
    font-size: 0.78rem;
  }

  /* concern bars */
  .tm-bar-list { display: grid; gap: 10px; }
  .tm-bar-row { display: flex; align-items: center; gap: 8px; }
  .tm-bar-label { font-size: 0.82rem; width: 110px; flex-shrink: 0; }
  .tm-bar-track { flex: 1; height: 8px; background: #ede8df; border-radius: 999px; overflow: hidden; }
  .tm-bar-fill { height: 100%; border-radius: inherit; transition: width 600ms ease; }
  .tm-bar-val { font-size: 0.82rem; font-weight: 700; width: 26px; text-align: right; }
  .tm-bar-legend { margin: 14px 0 0; font-size: 0.74rem; display: flex; gap: 10px; flex-wrap: wrap; }

  /* top 3 */
  .tm-top3-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .tm-top3-rank {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--accent); color: #fff;
    font-weight: 800; font-size: 0.82rem;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .tm-top3-sub { font-size: 0.78rem; color: var(--muted); }
  .tm-privacy-note {
    margin-top: 14px; font-size: 0.78rem; color: var(--muted);
    padding: 10px; background: rgba(77,107,88,0.06);
    border-radius: 10px; border: 1px solid rgba(77,107,88,0.15);
    line-height: 1.55;
  }

  .tm-section-label {
    margin: 0 0 10px; font-size: 0.74rem; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
  }
  .tm-primary-btn {
    margin-top: 8px; padding: 13px 32px; border-radius: 999px;
    border: none; background: var(--accent); color: #fff;
    font-size: 0.95rem; font-weight: 700;
    transition: opacity 140ms, transform 140ms;
  }
  .tm-primary-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .tm-outline-btn {
    padding: 10px 20px; border-radius: 999px;
    border: 1.5px solid var(--line); background: transparent;
    color: var(--ink); font-size: 0.88rem; font-weight: 600;
    transition: border-color 140ms;
  }
  .tm-outline-btn:hover { border-color: var(--accent); }

  /* preferences */
  .tm-prefs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .tm-pref-card {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 20px; padding: 20px;
    box-shadow: var(--shadow);
    display: flex; flex-direction: column; gap: 10px;
  }
  .tm-pref-label { font-size: 0.88rem; font-weight: 600; }
  .tm-req { color: #dc2626; }
  .tm-select, .tm-input {
    padding: 10px 12px; border: 1.5px solid var(--line); border-radius: 12px;
    background: #f8fafc; font-size: 0.9rem; color: var(--ink); outline: none;
    transition: border-color 140ms; width: 100%;
  }
  .tm-select:focus, .tm-input:focus { border-color: var(--accent); background: #fff; }
  .tm-select--dropdown {
    min-height: 46px;
    justify-content: space-between;
  }
  .tm-radio-group { display: flex; flex-direction: column; gap: 8px; }
  .tm-radio {
    display: flex; align-items: center; gap: 8px; cursor: pointer;
    padding: 9px 12px; border-radius: 12px; border: 1.5px solid var(--line);
    font-size: 0.88rem; transition: border-color 140ms, background 140ms;
  }
  .tm-radio--active { border-color: var(--accent); background: var(--accent-soft); }
  .tm-radio input { display: none; }
  .tm-check-group { display: flex; flex-wrap: wrap; gap: 8px; }
  .tm-check {
    display: flex; align-items: center; gap: 6px; cursor: pointer;
    padding: 6px 12px; border-radius: 999px; border: 1.5px solid var(--line);
    font-size: 0.84rem; transition: border-color 140ms, background 140ms;
  }
  .tm-check--active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
  .tm-check input { display: none; }
  .tm-error { color: #dc2626; font-size: 0.86rem; margin: 4px 0; }

  /* results */
  .tm-results-list { display: grid; gap: 14px; }
  .tm-result-card {
    display: flex; align-items: center; gap: 16px;
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 20px; padding: 20px;
    box-shadow: var(--shadow);
    transition: transform 140ms, box-shadow 140ms;
  }
  .tm-result-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
  .tm-result-rank {
    font-size: 1.4rem; font-weight: 900; color: var(--accent);
    width: 36px; text-align: center; flex-shrink: 0;
  }
  .tm-result-info { flex: 1; display: flex; flex-direction: column; gap: 5px; }
  .tm-result-name { font-size: 1rem; display: block; }
  .tm-result-creds { font-size: 0.82rem; color: var(--muted); }
  .tm-result-meta, .tm-result-detail-row {
    font-size: 0.8rem; color: var(--muted);
    display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
  }
  .tm-sep { opacity: 0.4; }
  .tm-tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .tm-tag {
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
    background: var(--accent-soft); color: var(--accent);
  }
  .tm-stars { color: #f59e0b; font-size: 0.82rem; }
  .tm-score-block { text-align: center; flex-shrink: 0; width: 90px; }
  .tm-score-num {
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -0.04em;
  }
  .tm-score-label { font-size: 0.7rem; color: var(--muted); margin-bottom: 10px; }
  .tm-view-btn {
    padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--accent);
    background: transparent; color: var(--accent); font-size: 0.8rem; font-weight: 700;
    transition: background 140ms, color 140ms;
  }
  .tm-view-btn:hover { background: var(--accent); color: #fff; }

  /* detail */
  .tm-detail-grid { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
  .tm-detail-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
  .tm-detail-name { margin: 0 0 4px; font-size: 1.4rem; letter-spacing: -0.02em; }
  .tm-detail-creds { margin: 0 0 6px; font-size: 0.86rem; color: var(--muted); }
  .tm-bio { color: var(--muted); font-size: 0.92rem; line-height: 1.65; margin: 0 0 18px; }
  .tm-detail-section { margin-bottom: 16px; }
  .tm-detail-row-group { display: grid; gap: 8px; margin-bottom: 18px; }
  .tm-detail-row {
    display: flex; justify-content: space-between;
    padding: 10px 14px; border-radius: 12px;
    background: #f8fafc; font-size: 0.88rem;
  }
  .tm-dr-label { color: var(--muted); font-weight: 600; }

  /* privacy */
  .tm-privacy-card {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 18px; padding: 18px;
  }
  .tm-privacy-always { font-size: 0.8rem; color: var(--muted); margin: 0 0 14px; }
  .tm-privacy-row {
    display: flex; justify-content: space-between; align-items: center; gap: 12px;
    padding: 12px 0; border-bottom: 1px solid var(--line);
    font-size: 0.88rem;
  }
  .tm-privacy-row:last-child { border-bottom: none; }
  .tm-privacy-row p { margin: 3px 0 0; font-size: 0.76rem; color: var(--muted); }
  .tm-toggle {
    width: 46px; height: 26px; border-radius: 999px; border: none;
    background: #cbd5e1; position: relative; flex-shrink: 0;
    transition: background 200ms; cursor: pointer;
  }
  .tm-toggle--on { background: var(--accent); }
  .tm-toggle-knob {
    position: absolute; top: 3px; left: 3px;
    width: 20px; height: 20px; border-radius: 50%;
    background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.18);
    transition: left 200ms;
  }
  .tm-toggle--on .tm-toggle-knob { left: 23px; }

  /* booking */
  .tm-match-score-card, .tm-booking-card {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 20px; padding: 20px;
    box-shadow: var(--shadow);
    margin-bottom: 14px;
  }
  .tm-score-breakdown-title { font-size: 0.8rem; color: var(--muted); margin: 10px 0 8px; font-weight: 600; }
  .tm-breakdown { display: grid; gap: 6px; }
  .tm-breakdown-row {
    display: flex; justify-content: space-between;
    font-size: 0.86rem; padding: 6px 0;
    border-bottom: 1px solid var(--line);
  }
  .tm-breakdown-row:last-child { border-bottom: none; }
  .tm-form-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
  .tm-field-label { font-size: 0.8rem; font-weight: 600; color: var(--muted); }
  .tm-stripe-mock { display: grid; gap: 8px; margin: 10px 0; padding: 14px; background: #f8fafc; border-radius: 12px; border: 1px solid var(--line); }
  .tm-stripe-label { margin: 0 0 6px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .tm-stripe-badge { background: #fef3c7; color: #92400e; font-size: 0.68rem; padding: 2px 8px; border-radius: 999px; font-weight: 700; }
  .tm-booked-confirm { text-align: center; padding: 8px 0; }
  .tm-booked-icon {
    width: 52px; height: 52px; border-radius: 50%;
    background: var(--accent-soft); color: var(--accent);
    font-size: 1.4rem; display: flex; align-items: center; justify-content: center;
    margin: 0 auto 12px;
  }
  .tm-booked-confirm p { font-size: 0.86rem; color: var(--muted); margin: 6px 0 0; }
  /* chat */
  .tm-chat-root {
    display: flex; flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 22px; overflow: hidden;
    box-sizing: border-box;
  }
  .tm-chat-header {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 18px; border-bottom: 1px solid var(--line);
    background: rgba(255,255,255,0.9); flex-shrink: 0;
  }
  .tm-back { background: none; border: none; color: var(--muted); font-size: 0.9rem; font-weight: 600; padding: 0; }
  .tm-back--inline { font-size: 1.1rem; margin-right: 4px; }
  .tm-chat-profile-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 6px 10px 6px 6px;
    border: 1px solid transparent;
    border-radius: 14px;
    background: transparent;
    text-align: left;
    color: inherit;
    cursor: pointer;
    transition: background 140ms, border-color 140ms, box-shadow 140ms;
  }
  .tm-chat-profile-trigger:hover,
  .tm-chat-profile-trigger--open {
    background: rgba(210,228,220,0.42);
    border-color: rgba(77,107,88,0.18);
    box-shadow: 0 6px 16px rgba(77,107,88,0.08);
  }
  .tm-chat-profile-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .tm-chat-name { display: block; font-size: 0.92rem; }
  .tm-chat-status { font-size: 0.72rem; color: var(--muted); }
  .tm-chat-profile-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .tm-profile-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(15,23,42,0.38);
    backdrop-filter: blur(4px);
  }
  .tm-profile-modal {
    position: relative;
    width: min(720px, 100%);
    max-height: min(760px, calc(100vh - 48px));
    overflow-y: auto;
    background: var(--panel-strong);
    border: 1px solid var(--line);
    border-radius: 24px;
    padding: 24px;
    box-shadow: 0 24px 70px rgba(15,23,42,0.24);
  }
  .tm-profile-modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--muted);
    font-weight: 900;
    cursor: pointer;
  }
  .tm-appt-trigger {
    margin-left: auto; padding: 7px 14px; border-radius: 999px;
    border: 1.5px solid var(--accent); background: transparent;
    color: var(--accent); font-size: 0.8rem; font-weight: 700;
    transition: background 140ms, color 140ms;
  }
  .tm-appt-trigger:hover { background: var(--accent); color: #fff; }
  .tm-appt-form {
    display: grid; gap: 8px; padding: 14px 18px;
    border-bottom: 1px solid var(--line);
    background: rgba(210,228,220,0.3);
    flex-shrink: 0;
  }
  .tm-appt-hanger {
    padding: 0 18px 10px;
    border-bottom: 1px solid var(--line);
    background: rgba(255,255,255,0.9);
  }
  .tm-appt-hanger .tm-appt-banner {
    margin-top: -1px;
  }
  .tm-selected-date {
    margin: -2px 0 2px;
    color: var(--muted);
    font-size: 0.78rem;
  }
  .tm-chat-messages {
    flex: 1; min-height: 0; overflow-y: auto; padding: 18px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .tm-chat-error {
    margin: 0 18px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid rgba(220, 38, 38, 0.18);
    background: rgba(254, 242, 242, 0.92);
    color: #b91c1c;
    font-size: 0.82rem;
    line-height: 1.45;
  }
  .tm-msg-row { display: flex; align-items: flex-end; gap: 8px; animation: fade-up 180ms ease; }
  .tm-msg-row--user { flex-direction: row-reverse; }
  .tm-bubble { max-width: 70%; padding: 10px 14px 7px; border-radius: 18px; display: flex; flex-direction: column; gap: 4px; }
  .tm-bubble--them { background: #f1f5f9; border-bottom-left-radius: 5px; }
  .tm-bubble--user { background: var(--accent); border-bottom-right-radius: 5px; }
  .tm-bubble-text { margin: 0; font-size: 0.9rem; line-height: 1.55; color: var(--ink); word-break: break-word; }
  .tm-bubble--user .tm-bubble-text { color: #fff; }
  .tm-bubble-time { font-size: 0.66rem; color: rgba(46,42,38,0.35); align-self: flex-end; }
  .tm-bubble--user .tm-bubble-time { color: rgba(255,255,255,0.6); }
  .tm-typing-bubble {
    padding: 14px 18px;
    flex-direction: row;
    align-items: center;
    gap: 5px;
  }
  .tm-appt-msg { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .tm-appt-banner {
    display: flex; gap: 12px; align-items: flex-start;
    text-align: left;
    background: linear-gradient(135deg,rgba(210,228,220,0.8),rgba(255,255,255,0.9));
    border: 1px solid rgba(77,107,88,0.2); border-radius: 16px;
    padding: 12px 14px; width: 100%;
    box-shadow: 0 4px 14px rgba(77,107,88,0.1);
    color: var(--ink);
    cursor: pointer;
  }
  .tm-appt-banner--expanded {
    box-shadow: 0 8px 22px rgba(77,107,88,0.14);
  }
  .tm-appt-icon {
    flex-shrink: 0;
    padding: 4px 7px;
    border-radius: 999px;
    background: var(--accent);
    color: #fff;
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .tm-appt-banner-body {
    flex: 1;
    min-width: 0;
  }
  .tm-appt-banner strong { display: block; font-size: 0.92rem; }
  .tm-appt-banner p { margin: 3px 0 0; font-size: 0.8rem; color: var(--muted); }
  .tm-appt-expanded {
    display: grid;
    gap: 4px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(77,107,88,0.16);
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.45;
  }
  .tm-appt-chevron {
    align-self: center;
    color: var(--accent);
    font-size: 0.74rem;
    font-weight: 800;
  }
  .tm-appt-desc { font-style: italic; }
  .tm-appt-time { font-size: 0.7rem; color: var(--muted); }
  .tm-chat-input-bar {
    padding: 12px 14px; border-top: 1px solid rgba(46,42,38,0.12);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.88), rgba(250,244,232,0.96)),
      var(--panel-strong);
    flex-shrink: 0;
    box-shadow: 0 -8px 24px rgba(46,42,38,0.04);
  }
  .tm-chat-compose { width: 100%; }
  .chat-textarea {
    min-height: 26px; max-height: 120px; cursor: text;
  }
  .send-btn {
    width: 40px; height: 40px;
  }

  /* typing dots (reuse from chatbot) */
  .dot {
    display: inline-block; width: 7px; height: 7px; border-radius: 50%;
    background: var(--muted); margin: 0 2px;
    animation: dot-bounce 1.2s infinite ease-in-out;
  }
  .dot:nth-child(2) { animation-delay: 0.18s; }
  .dot:nth-child(3) { animation-delay: 0.36s; }
  @keyframes dot-bounce {
    0%,60%,100% { transform: translateY(0); opacity: 0.5; }
    30%          { transform: translateY(-6px); opacity: 1; }
  }

  .tm-back { background: none; border: none; color: var(--muted); font-size: 0.88rem; font-weight: 600; padding: 0; cursor: pointer; }

  @media (max-width: 960px) {
    .tm-profile-grid { grid-template-columns: 1fr; }
    .tm-prefs-grid   { grid-template-columns: 1fr; }
    .tm-detail-grid  { grid-template-columns: 1fr; }
    .tm-result-card  { flex-wrap: wrap; }
    .tm-chat-profile-grid { grid-template-columns: 1fr; }
  }
`
