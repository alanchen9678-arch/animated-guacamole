export default function PeerSupport() {
  return (
    <section className="page">
      <header className="page-header">
        <h2>Peer Support</h2>
        <p>Community spaces can reduce isolation when they’re structured, kind, and well-moderated.</p>
      </header>

      <div className="grid">
        <article className="card span-8">
          <h3>Active rooms</h3>
          <div className="pill-row">
            <span className="pill">Burnout recovery</span>
            <span className="pill">First therapy session nerves</span>
            <span className="pill">Small daily wins</span>
          </div>
        </article>

        <article className="card span-4">
          <h3>Community norms</h3>
          <ul>
            <li>Respect privacy</li>
            <li>Share support, not pressure</li>
            <li>Flag urgent safety concerns early</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
