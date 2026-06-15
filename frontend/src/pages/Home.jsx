import { useUser } from '../context/UserContext.jsx'
import { dashboardSnapshot } from '../services/api.js'

const features = [
  {
    id: 'chatbot',
    title: 'AI Chatbot',
    desc: 'Talk through what\'s on your mind with Aurora\'s AI, available around the clock.',
    tag: '24/7',
  },
  {
    id: 'checkins',
    title: 'Check-Ins',
    desc: 'Quick daily surveys that track your mental wellness over time.',
    tag: 'Daily',
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
    desc: 'Connect anonymously with others who understand what you\'re going through.',
    tag: 'Anonymous',
  },
  {
    id: 'library',
    title: 'Info Library',
    desc: 'Learn about mental health through interactive content and daily learning streaks.',
    tag: 'Interactive',
  },
]

export default function Home() {
  const user = useUser()

  return (
    <section className="page">
      <style>{`
        .home-greeting {
          font-size: 2rem;
          letter-spacing: -0.03em;
          margin: 0 0 6px;
        }

        .home-sub {
          margin: 0;
          color: var(--muted);
        }

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
          box-shadow: 0 6px 18px rgba(23, 48, 66, 0.06);
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: transform 140ms ease, box-shadow 140ms ease;
        }

        .feature-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 32px rgba(23, 48, 66, 0.1);
        }

        .feature-tag {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent);
          background: var(--accent-soft);
          padding: 3px 10px;
          border-radius: 999px;
          width: fit-content;
        }

        .feature-card h4 {
          margin: 0;
          font-size: 1rem;
        }

        .feature-card p {
          margin: 0;
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.5;
        }

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
          box-shadow: 0 6px 18px rgba(23, 48, 66, 0.06);
        }

        .today-stat .label {
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 6px;
        }

        .today-stat .value {
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--ink);
        }

        .prompts-card {
          background: linear-gradient(135deg, rgba(218, 243, 236, 0.6), rgba(255, 255, 255, 0.9));
          border: 1px solid rgba(15, 118, 110, 0.18);
          border-radius: 20px;
          padding: 22px;
        }

        .prompts-card h3 {
          margin: 0 0 14px;
          font-size: 1rem;
          color: var(--accent);
        }

        .prompt-list {
          display: grid;
          gap: 10px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .prompt-list li {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.72);
          border-radius: 14px;
          border: 1px solid rgba(15, 118, 110, 0.12);
          color: var(--ink);
          font-size: 0.92rem;
        }

        .energy-card {
          background: var(--panel-strong);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 6px 18px rgba(23, 48, 66, 0.06);
          display: flex;
          flex-direction: column;
          gap: 14px;
          justify-content: center;
        }

        .energy-card h3 {
          margin: 0;
          font-size: 1rem;
        }

        .energy-number {
          font-size: 2.8rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: var(--accent);
          line-height: 1;
        }

        .energy-label {
          font-size: 0.85rem;
          color: var(--muted);
          margin-top: 2px;
        }

        @media (max-width: 960px) {
          .feature-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .today-bar {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .feature-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="page-header">
        <h2 className="home-greeting">Good day, {user.firstName}.</h2>
        <p className="home-sub">
          Here&apos;s your Aurora snapshot — your mood, your streak, and what to explore today.
        </p>
      </header>

      <div className="today-bar">
        <div className="today-stat">
          <div className="label">Mood</div>
          <div className="value" style={{ textTransform: 'capitalize' }}>{user.mood}</div>
        </div>
        <div className="today-stat">
          <div className="label">Streak</div>
          <div className="value">{dashboardSnapshot.streakDays} days</div>
        </div>
        <div className="today-stat">
          <div className="label">Next check-in</div>
          <div className="value" style={{ fontSize: '1rem', paddingTop: '4px' }}>
            {dashboardSnapshot.nextCheckIn}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '14px' }}>
        <div className="prompts-card">
          <h3>Journal prompts for today</h3>
          <ul className="prompt-list">
            {dashboardSnapshot.journalPrompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </div>

        <div className="energy-card">
          <h3>Energy score</h3>
          <div>
            <div className="energy-number">{dashboardSnapshot.energyScore}%</div>
            <div className="energy-label">steady capacity today</div>
          </div>
          <div className="meter" aria-label={`Energy score: ${dashboardSnapshot.energyScore}%`}>
            <span style={{ width: `${dashboardSnapshot.energyScore}%` }} />
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Aurora tools
        </h3>
        <div className="feature-grid">
          {features.map((f) => (
            <div key={f.id} className="feature-card">
              <span className="feature-tag">{f.tag}</span>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
