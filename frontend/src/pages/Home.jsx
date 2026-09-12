import { useMemo } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { useNavigation } from '../context/NavigationContext.jsx'

const JOURNAL_PROMPT_BANK = [
  'What helped you feel grounded today?',
  'Where did you notice pressure building?',
  'What would make tomorrow gentler?',
  'What emotion stayed with you the longest today?',
  'What felt lighter than expected today?',
  'What moment made you pause and notice yourself?',
  'What do you wish someone understood about today?',
  'What part of your day felt most draining?',
  'What gave you a small sense of relief today?',
  'What are you carrying tonight that you do not want to carry tomorrow?',
  'What did you handle better than you usually give yourself credit for?',
  'What felt unresolved today?',
  'What did your body seem to need today?',
  'What thought kept repeating itself today?',
  'What felt steady or safe today?',
  'What felt harder than it looked from the outside?',
  'What are you learning about your limits lately?',
  'What would support look like for you right now?',
  'What are you proud of yourself for today?',
  'What did you avoid today, and why do you think that was?',
  'What felt meaningful, even if it was small?',
  'What would you say to yourself if you were being more gentle?',
  'What triggered frustration or tension today?',
  'What would a softer ending to today look like?',
  'What are you hoping tomorrow feels like?',
  'What felt surprisingly manageable today?',
  'What did you need but not ask for today?',
  'What boundary do you wish you had protected today?',
  'What helped you keep going today?',
  'What deserves a little more attention in your inner world right now?',
]

function getDayKey(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function hashDayKey(dayKey) {
  let hash = 0
  for (let index = 0; index < dayKey.length; index++) {
    hash = ((hash << 5) - hash + dayKey.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function getDailyJournalPrompt(date = new Date()) {
  const todayKey = getDayKey(date)
  const yesterday = new Date(date)
  yesterday.setDate(yesterday.getDate() - 1)

  let promptIndex = hashDayKey(todayKey) % JOURNAL_PROMPT_BANK.length
  const yesterdayIndex = hashDayKey(getDayKey(yesterday)) % JOURNAL_PROMPT_BANK.length
  if (promptIndex === yesterdayIndex) {
    promptIndex = (promptIndex + 1) % JOURNAL_PROMPT_BANK.length
  }
  return JOURNAL_PROMPT_BANK[promptIndex]
}

const GREETINGS = [
  'Hello',
  'Hi',
  'Hey',
  'Hey there',
  'Greetings',
  'Good day',
  'Welcome',
  'Hi there',
  'Howdy',
  'Welcome back',
  'Good to see you',
  'Salutations',
  'Cheers',
  'Hiya',
  'Hey hey',
  'Bonjour',
  'Hola',
]

const features = [
  {
    id: 'chatbot',
    title: 'AI Chatbot',
    desc: "Talk through what's on your mind.",
    action: 'Open chatbot',
  },
  {
    id: 'checkins',
    title: 'Check-Ins',
    desc: 'Track your wellbeing over time.',
    action: 'View check-ins',
  },
  {
    id: 'journal',
    title: 'Thought Journal',
    desc: 'Reflect privately on your day and emotions.',
    action: 'Open journal',
  },
  {
    id: 'therapist',
    title: 'Therapist Match',
    desc: 'Find a professional who fits your needs.',
    action: 'Find a therapist',
  },
  {
    id: 'community',
    title: 'Peer Support',
    desc: 'Connect anonymously with people who understand.',
    action: 'Explore peer support',
  },
  {
    id: 'library',
    title: 'Info Library',
    desc: 'Read clear, practical mental-health guidance.',
    action: 'Browse the library',
  },
]

export default function Home() {
  const { user } = useUser()
  const { navigate } = useNavigation()

  const name = user?.displayName || user?.firstName || user?.username || 'there'
  const greeting = useMemo(
    () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)],
    [],
  )
  const journalPrompt = useMemo(() => getDailyJournalPrompt(), [])

  const checkInLabel = user?.checkInDueThisWeek === false ? 'Up to date' : 'Due this week'

  return (
    <section className="page home-page">
      <style>{`

        .page {
          font-family: "Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          --home-secondary: #5b605c;
        }

        .home-greeting {
          font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          font-size: clamp(1.875rem, 3vw, 2rem);
          font-weight: 650;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin: 0 0 8px;
        }
        .home-sub { margin: 0; color: var(--home-secondary); font-size: 0.9375rem; line-height: 1.55; }
        .home-section-title {
          margin: 0;
          color: var(--ink);
          font-size: 0.875rem;
          font-weight: 650;
          letter-spacing: 0.01em;
        }
        .home-section-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: 32px;
          border-top: 1px solid var(--line);
        }
        .feature-card {
          background: transparent;
          border: 0;
          border-bottom: 1px solid var(--line);
          border-radius: 0;
          padding: 18px 2px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          text-align: left;
          width: 100%;
          cursor: pointer;
          transition: color 140ms ease, border-color 140ms ease;
        }
        .feature-card:hover { border-color: rgba(77, 107, 88, 0.5); }
        .feature-card:hover .feature-action { color: #314f3c; transform: translateX(3px); }
        .feature-card:focus-visible { outline: 3px solid rgba(58, 104, 152, 0.28); outline-offset: 3px; }
        .feature-copy { min-width: 0; }
        .feature-card h4 { margin: 0 0 5px; font-size: 1rem; font-weight: 600; line-height: 1.3; }
        .feature-card p { margin: 0; color: var(--home-secondary); font-size: 0.875rem; font-weight: 400; line-height: 1.5; }
        .feature-action {
          color: var(--accent);
          font-size: 0.8125rem;
          font-weight: 600;
          white-space: nowrap;
          transition: color 140ms ease, transform 140ms ease;
        }
        .today-bar {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .today-stat {
          background: var(--panel-strong);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 16px 18px;
        }
        .today-stat .label {
          font-size: 0.8125rem; font-weight: 500;
          color: var(--home-secondary); margin-bottom: 7px;
        }
        .today-stat .value {
          font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          font-size: 1.25rem; font-weight: 650; letter-spacing: -0.02em; color: var(--ink);
        }
        .prompts-card {
          background: #fdfaf3;
          border: 1px solid #ded8cb;
          border-radius: 18px;
          padding: 22px 24px;
        }
        .prompt-meta {
          margin: 0 0 12px;
          color: var(--home-secondary);
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .prompt-content {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
        }
        .daily-prompt-text {
          max-width: 720px;
          margin: 0;
          color: var(--ink);
          font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          letter-spacing: -0.015em;
        }
        .prompt-action {
          border: 0;
          border-bottom: 1px solid currentColor;
          background: transparent;
          color: var(--accent);
          padding: 3px 0;
          font-size: 0.875rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .prompt-action:hover { color: #314f3c; }
        .prompt-action:focus-visible { outline: 3px solid rgba(58, 104, 152, 0.28); outline-offset: 4px; }
        @media (max-width: 960px) {
          .feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .today-bar { grid-template-columns: 1fr; }
        }
        @media (max-width: 700px) {
          .feature-grid { grid-template-columns: 1fr; column-gap: 0; }
          .prompt-content { align-items: flex-start; flex-direction: column; gap: 16px; }
        }
      `}</style>

      <header className="page-header">
        <h2 className="home-greeting">{greeting}, {name}.</h2>
        <p className="home-sub">
          Here&apos;s your Aurora snapshot.
        </p>
      </header>

      <div className="today-bar">
        <div className="today-stat">
          <div className="label">Mood</div>
          <div className="value" style={{ textTransform: 'capitalize' }}>
            {user?.mood || '-'}
          </div>
        </div>
        <div className="today-stat">
          <div className="label">Streak</div>
          <div className="value">{user?.streak ?? 0} {user?.streak === 1 ? 'week' : 'weeks'}</div>
        </div>
        <div className="today-stat">
          <div className="label">Check-in</div>
          <div className="value" style={{ fontSize: '1rem', paddingTop: '4px' }}>
            {checkInLabel}
          </div>
        </div>
      </div>

      <section className="prompts-card" aria-labelledby="daily-journal-prompt">
        <p className="prompt-meta">Today&apos;s journal prompt</p>
        <div className="prompt-content">
          <h3 className="daily-prompt-text" id="daily-journal-prompt">{journalPrompt}</h3>
          <button className="prompt-action" onClick={() => navigate('journal')} type="button">
            Write in journal →
          </button>
        </div>
      </section>

      <section className="home-tools" aria-labelledby="aurora-tools-heading">
        <div className="home-section-head">
          <h3 className="home-section-title" id="aurora-tools-heading">Aurora tools</h3>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <button
              key={feature.id}
              className="feature-card"
              onClick={() => navigate(feature.id)}
              type="button"
              aria-label={`Open ${feature.title}`}
            >
              <span className="feature-copy">
                <h4>{feature.title}</h4>
                <p>{feature.desc}</p>
              </span>
              <span className="feature-action" aria-hidden="true">{feature.action} →</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  )
}
