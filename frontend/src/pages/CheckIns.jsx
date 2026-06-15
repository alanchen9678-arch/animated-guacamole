export default function CheckIns() {
  return (
    <section className="page">
      <header className="page-header">
        <h2>Check-Ins</h2>
        <p>Track mood patterns with lightweight prompts that are easy to keep up with.</p>
      </header>

      <div className="grid">
        <article className="card span-4">
          <h3>Mood</h3>
          <p>Steady with some afternoon tension.</p>
        </article>
        <article className="card span-4">
          <h3>Sleep</h3>
          <p>7 hours, slightly restless.</p>
        </article>
        <article className="card span-4">
          <h3>Stress load</h3>
          <p>Moderate, trending better than yesterday.</p>
        </article>
      </div>
    </section>
  )
}
