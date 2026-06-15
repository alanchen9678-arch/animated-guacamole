export default function Settings() {
  return (
    <section className="page">
      <header className="page-header">
        <h2>Settings</h2>
        <p>Control reminders, privacy expectations, and the pacing of your experience.</p>
      </header>

      <div className="grid">
        <article className="card span-8">
          <h3>Preferences</h3>
          <div className="settings-list">
            <div className="settings-row">
              <div>
                <strong>Evening check-in reminders</strong>
                <p>Receive a soft prompt at the end of the day.</p>
              </div>
              <div className="toggle" aria-hidden="true" />
            </div>
            <div className="settings-row">
              <div>
                <strong>Low-stimulation mode</strong>
                <p>Reduce visual intensity during stressful periods.</p>
              </div>
              <div className="toggle" aria-hidden="true" />
            </div>
          </div>
        </article>

        <article className="card span-4">
          <h3>Privacy</h3>
          <p>Personal reflections stay local to this frontend demo unless connected to a backend.</p>
        </article>
      </div>
    </section>
  )
}
