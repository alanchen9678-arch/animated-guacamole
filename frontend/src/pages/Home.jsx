import { useUser } from '../context/UserContext.jsx'
import { dashboardSnapshot } from '../services/api.js'

export default function Home() {
  const user = useUser()

  return (
    <section className="page">
      <header className="page-header">
        <h2>Welcome back, {user.firstName}.</h2>
        <p>
          Here’s a quick snapshot of momentum, next actions, and gentle prompts for today.
        </p>
      </header>

      <div className="grid">
        <article className="card span-7">
          <h3>Today&apos;s rhythm</h3>
          <div className="pill-row">
            <span className="pill">Mood: {user.mood}</span>
            <span className="pill">Streak: {dashboardSnapshot.streakDays} days</span>
            <span className="pill">Next check-in: {dashboardSnapshot.nextCheckIn}</span>
          </div>
        </article>

        <article className="card span-5">
          <h3>Energy score</h3>
          <p>{dashboardSnapshot.energyScore}% steady capacity today</p>
          <div className="meter" aria-label="Energy score">
            <span style={{ width: `${dashboardSnapshot.energyScore}%` }} />
          </div>
        </article>

        <article className="card span-6">
          <h3>Suggested focus</h3>
          <ul>
            <li>Take one two-minute breathing reset before your next task switch.</li>
            <li>Use the journal page to unload anything still looping in your head.</li>
            <li>Open therapist matching when you want a more guided level of support.</li>
          </ul>
        </article>

        <article className="card span-6">
          <h3>Journal prompts</h3>
          <ul>
            {dashboardSnapshot.journalPrompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
