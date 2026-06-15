export default function Journal() {
  return (
    <section className="page">
      <header className="page-header">
        <h2>Journal</h2>
        <p>A simple space to capture patterns, gratitude, and unfinished thoughts.</p>
      </header>

      <div className="grid">
        <article className="card span-7">
          <h3>Today&apos;s entry</h3>
          <div className="journal-box">
            I noticed that I calm down faster when I step away from notifications and write down
            the one thing I can do next.
          </div>
        </article>

        <article className="card span-5">
          <h3>Prompts</h3>
          <ul>
            <li>What felt heavier than expected today?</li>
            <li>What helped, even a little?</li>
            <li>What do you want to remember tomorrow?</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
