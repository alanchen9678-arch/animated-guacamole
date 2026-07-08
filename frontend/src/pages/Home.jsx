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

function getTodayKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = `${today.getMonth() + 1}`.padStart(2, '0')
  const day = `${today.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function hashPromptForDay(prompt, dayKey) {
  let hash = 0
  const input = `${dayKey}:${prompt}`
  for (let index = 0; index < input.length; index++) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0
  }
  return hash
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
    desc: "Talk through what's on your mind with Aurora's AI, available around the clock.",
    tag: '24/7',
  },
  {
    id: 'checkins',
    title: 'Check-Ins',
    desc: 'Quick weekly surveys that track your mental wellness over time.',
    tag: 'Weekly',
  },
  {
    id: 'journal',
    title: 'Thought Journal',
    desc: 'A private, open-ended space to process your feelings and daily experiences.',
    tag: 'Private',
  },
  {
    id: 'therapist',
    title: 'Therapist Match',
    desc: 'Get paired with a licensed professional suited to your needs and preferences.',
    tag: 'Licensed pros',
  },
  {
    id: 'community',
    title: 'Peer Support',
    desc: "Connect anonymously with others who understand what you're going through.",
    tag: 'Anonymous',
  },
  {
    id: 'library',
    title: 'Info Library',
    desc: 'Learn about mental health through interactive content and learning streaks.',
    tag: 'Interactive',
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
  const journalPrompts = useMemo(() => {
    const dayKey = getTodayKey()
    return [...JOURNAL_PROMPT_BANK]
      .sort((a, b) => hashPromptForDay(a, dayKey) - hashPromptForDay(b, dayKey))
      .slice(0, 3)
  }, [])

  const checkInLabel = user?.checkInDueThisWeek === false ? 'Up to date' : 'Due this week'

  return (
    <section className="page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');

        .page {
          font-family: "Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .home-greeting {
          font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          font-size: 2rem;
          letter-spacing: -0.03em;
          margin: 0 0 6px;
        }
        .home-sub { margin: 0; color: var(--muted); }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .feature-card {
          background: var(--panel-strong);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 20px;
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
          width: 100%;
          cursor: pointer;
          transition: transform 140ms ease, box-shadow 140ms ease;
        }
        .feature-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
        .feature-card:focus-visible { outline: 3px solid rgba(58, 104, 152, 0.28); outline-offset: 3px; }
        .feature-tag {
          display: inline-block;
          font-size: 0.98rem; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; text-transform: none;
          color: var(--accent); background: var(--accent-soft);
          padding: 9px 14px; border-radius: 999px; width: fit-content;
          border: 1px solid rgba(77,107,88,0.16);
        }
        .feature-card h4 { margin: 0; font-size: 1rem; }
        .feature-card p { margin: 0; color: var(--muted); font-size: 0.9rem; line-height: 1.5; flex: 1; }
        .today-bar {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .today-stat {
          background: var(--panel-strong);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 18px 20px;
          box-shadow: var(--shadow);
        }
        .today-stat .label {
          font-size: 0.78rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--muted); margin-bottom: 6px;
        }
        .today-stat .value {
          font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em; color: var(--ink);
        }
        .prompts-card {
          background: linear-gradient(135deg, rgba(218, 243, 236, 0.6), rgba(255, 255, 255, 0.9));
          border: 1px solid rgba(15, 118, 110, 0.18);
          border-radius: 20px; padding: 22px;
        }
        .prompts-card h3 { margin: 0 0 14px; font-size: 1rem; color: var(--accent); }
        .prompt-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
        .prompt-list li {
          padding: 12px 16px; background: rgba(255, 255, 255, 0.72);
          border-radius: 14px; border: 1px solid rgba(15, 118, 110, 0.12);
          color: var(--ink); font-size: 0.92rem; cursor: pointer;
          transition: background 140ms;
        }
        .prompt-list li:hover { background: rgba(255,255,255,0.95); }
        @media (max-width: 960px) {
          .feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .today-bar { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) { .feature-grid { grid-template-columns: 1fr; } }
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
            {user?.mood || '—'}
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

      <div className="prompts-card">
        <h3>Journal prompts for today</h3>
        <ul className="prompt-list">
          {journalPrompts.map((prompt) => (
            <li key={prompt} onClick={() => navigate('journal')}>{prompt}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Aurora tools
        </h3>
        <div className="feature-grid">
          {features.map((feature) => (
            <button
              key={feature.id}
              className="feature-card"
              onClick={() => navigate(feature.id)}
              type="button"
              aria-label={`Open ${feature.title}`}
            >
              <span className="feature-tag">{feature.title}</span>
              <p>{feature.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
