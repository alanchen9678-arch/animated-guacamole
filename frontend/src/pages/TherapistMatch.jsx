export default function TherapistMatch() {
  return (
    <section className="page">
      <header className="page-header">
        <h2>Therapist Match</h2>
        <p>Translate preferences and support goals into a shortlist that feels manageable.</p>
      </header>

      <div className="grid">
        <article className="card span-6">
          <h3>Preference summary</h3>
          <ul>
            <li>Virtual sessions preferred</li>
            <li>Evening availability</li>
            <li>Focus areas: anxiety, burnout, transitions</li>
          </ul>
        </article>

        <article className="card span-6">
          <h3>Match confidence</h3>
          <p>Three therapists align strongly with timing, specialty, and communication style.</p>
          <div className="meter" aria-label="Match confidence">
            <span style={{ width: '86%' }} />
          </div>
        </article>
      </div>
    </section>
  )
}
