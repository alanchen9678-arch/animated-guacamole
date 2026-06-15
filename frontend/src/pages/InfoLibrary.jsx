export default function InfoLibrary() {
  return (
    <section className="page">
      <header className="page-header">
        <h2>Info Library</h2>
        <p>Short, practical reading paths for common emotional-health questions.</p>
      </header>

      <div className="grid">
        <article className="card span-4">
          <h3>Stress basics</h3>
          <p>How stress shows up in the body and what regulation can look like.</p>
        </article>
        <article className="card span-4">
          <h3>Therapy types</h3>
          <p>A quick primer on CBT, ACT, trauma-informed care, and coaching boundaries.</p>
        </article>
        <article className="card span-4">
          <h3>Crisis resources</h3>
          <p>Clear paths for urgent support and when self-guided tools are not enough.</p>
        </article>
      </div>
    </section>
  )
}
