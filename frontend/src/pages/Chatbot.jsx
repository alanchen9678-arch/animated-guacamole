export default function Chatbot() {
  return (
    <section className="page">
      <header className="page-header">
        <h2>Chatbot Support</h2>
        <p>
          A calming conversational surface for grounding, reflection, and next-step suggestions.
        </p>
      </header>

      <div className="grid">
        <article className="card span-8">
          <h3>Conversation preview</h3>
          <div className="journal-box">
            <p>
              You: I feel overwhelmed and I can&apos;t tell if I should push through or slow down.
            </p>
            <p>
              Assistant: Let&apos;s name what feels loudest first, then choose one small action that
              lowers the pressure in the next ten minutes.
            </p>
          </div>
        </article>

        <article className="card span-4">
          <h3>Guardrails</h3>
          <ul>
            <li>Non-judgmental tone</li>
            <li>Grounding-first guidance</li>
            <li>Escalation for higher-risk situations</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
