import { useMemo, useState } from 'react'
import { UserProvider } from './context/UserContext.jsx'
import { NavigationProvider, useNavigation } from './context/NavigationContext.jsx'
import { pageConfig } from './routes/AppRoutes.jsx'
import Home from './pages/Home.jsx'

const features = [
  { id: 'chatbot',   title: 'AI Chatbot',       desc: "Talk through what's on your mind with Aurora's AI, available around the clock.",          tag: '24/7'        },
  { id: 'checkins',  title: 'Check-Ins',         desc: 'Quick daily surveys that monitor your mental wellness and flag changes early.',            tag: 'Daily'       },
  { id: 'journal',   title: 'Thought Journal',   desc: "A private, open-ended space to process your feelings and daily experiences.",             tag: 'Private'     },
  { id: 'therapist', title: 'Therapist Match',   desc: 'Get paired with a licensed professional whose style and focus suit your needs.',          tag: 'Licensed'    },
  { id: 'community', title: 'Peer Support',      desc: "Connect anonymously with others who understand what you're going through.",               tag: 'Anonymous'   },
  { id: 'library',   title: 'Info Library',      desc: 'Learn about mental health through interactive content and daily learning streaks.',       tag: 'Interactive' },
]

const mockNotifications = [
  { id: 1, text: 'Your daily check-in is due today',   time: '2h ago' },
  { id: 2, text: 'New journal prompt available',        time: '5h ago' },
  { id: 3, text: 'Therapist match suggestion ready',   time: '1d ago' },
]

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function AppShell() {
  const { activePage, navigate }      = useNavigation()
  const [isLoggedIn, setIsLoggedIn]   = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)

  const ActiveComponent = useMemo(
    () => pageConfig.find((p) => p.id === activePage)?.component ?? Home,
    [activePage],
  )

  function handleLogin()  { setIsLoggedIn(true) }
  function handleLogout() { setIsLoggedIn(false); navigate('home') }

  return (
    <div className="app-root">
      <style>{`
        /* ── reset & tokens ────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        button, input, textarea, select { font: inherit; cursor: pointer; }
        a { color: inherit; }

        :root {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.5;
          font-weight: 400;
          color: #173042;
          background:
            radial-gradient(circle at top, rgba(188,230,210,0.8), transparent 34%),
            linear-gradient(180deg, #f9f6ef 0%, #eef4f5 100%);
          -webkit-font-smoothing: antialiased;
          --ink:          #173042;
          --muted:        #5d7280;
          --line:         rgba(23,48,66,0.12);
          --panel:        rgba(255,255,255,0.74);
          --panel-strong: #ffffff;
          --accent:       #0f766e;
          --accent-soft:  #daf3ec;
          --shadow:       0 24px 60px rgba(23,48,66,0.12);
        }

        /* ── root shell ────────────────────────────────────── */
        html, body, #root { min-height: 100%; }

        .app-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── top bar ───────────────────────────────────────── */
        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          height: 62px;
          background: rgba(255,255,255,0.84);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--line);
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-outline {
          padding: 8px 18px;
          border-radius: 999px;
          border: 1.5px solid var(--line);
          background: transparent;
          color: var(--ink);
          font-size: 0.88rem;
          font-weight: 600;
          transition: border-color 140ms, background 140ms;
        }
        .btn-outline:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
        }

        .btn-primary {
          padding: 8px 18px;
          border-radius: 999px;
          border: none;
          background: var(--accent);
          color: #fff;
          font-size: 0.88rem;
          font-weight: 600;
          transition: opacity 140ms;
        }
        .btn-primary:hover { opacity: 0.88; }

        /* ── aurora logo ────────────────────────────────────── */
        .aurora-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          user-select: none;
        }

        .logo-mark {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: linear-gradient(135deg, #0f766e 0%, #7c3aed 100%);
          flex: none;
          box-shadow: 0 4px 12px rgba(124,58,237,0.28);
        }

        .logo-text {
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--ink);
        }

        /* ── landing (not logged in) ────────────────────────── */
        .landing {
          flex: 1;
          max-width: 1100px;
          margin: 0 auto;
          padding: 64px 24px 80px;
          width: 100%;
        }

        .landing-hero {
          text-align: center;
          margin-bottom: 56px;
        }

        .eyebrow {
          margin: 0 0 14px;
          color: var(--accent);
          font-size: 0.8rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .landing-hero h1 {
          margin: 0;
          font-size: clamp(2.2rem, 4vw, 4rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .landing-sub {
          margin: 18px auto 0;
          max-width: 60ch;
          color: var(--muted);
          font-size: 1.05rem;
        }

        .landing-cta {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 32px;
        }

        .btn-primary-lg {
          padding: 14px 32px;
          border-radius: 999px;
          border: none;
          background: var(--accent);
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          transition: opacity 140ms, transform 140ms;
        }
        .btn-primary-lg:hover { opacity: 0.88; transform: translateY(-1px); }

        .btn-outline-lg {
          padding: 14px 32px;
          border-radius: 999px;
          border: 1.5px solid var(--line);
          background: transparent;
          color: var(--ink);
          font-size: 1rem;
          font-weight: 600;
          transition: border-color 140ms;
        }
        .btn-outline-lg:hover { border-color: var(--accent); }

        .features-label {
          text-align: center;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
          margin: 0 0 20px;
        }

        .feature-grid-landing {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 16px;
        }

        .feature-card-landing {
          background: var(--panel-strong);
          border: 1px solid var(--line);
          border-radius: 22px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 6px 18px rgba(23,48,66,0.06);
          transition: transform 140ms, box-shadow 140ms;
        }
        .feature-card-landing:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 36px rgba(23,48,66,0.10);
        }

        .feature-tag {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent);
          background: var(--accent-soft);
          padding: 3px 10px;
          border-radius: 999px;
          width: fit-content;
        }

        .feature-card-landing h4 {
          margin: 0;
          font-size: 1rem;
        }

        .feature-card-landing p {
          margin: 0;
          color: var(--muted);
          font-size: 0.88rem;
          line-height: 1.55;
        }

        /* ── logged-in shell ────────────────────────────────── */
        .shell-body {
          flex: 1;
          padding: 28px 20px 48px;
        }

        .frame {
          max-width: 1180px;
          margin: 0 auto;
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 28px;
          backdrop-filter: blur(14px);
          box-shadow: var(--shadow);
          overflow: hidden;
        }

        .layout {
          display: grid;
          grid-template-columns: 240px minmax(0,1fr);
          min-height: 620px;
        }

        .sidebar {
          padding: 24px 18px;
          border-right: 1px solid var(--line);
          background: rgba(255,255,255,0.54);
        }

        .sidebar h2 {
          margin: 0 0 18px;
          font-size: 1rem;
          letter-spacing: -0.02em;
        }

        .nav-list {
          display: grid;
          gap: 6px;
        }

        .nav-item {
          border: 1px solid transparent;
          background: transparent;
          color: var(--ink);
          text-align: left;
          padding: 12px 16px;
          border-radius: 14px;
          font-size: 0.92rem;
          transition: transform 140ms, background 140ms, border-color 140ms;
        }
        .nav-item:hover {
          transform: translateX(2px);
          background: rgba(255,255,255,0.65);
          border-color: var(--line);
        }
        .nav-item.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .content {
          padding: 28px;
        }

        /* ── page / card primitives ─────────────────────────── */
        .page {
          display: grid;
          gap: 18px;
          animation: fade-up 220ms ease;
        }

        .page-header h2 {
          margin: 0;
          font-size: 2rem;
          letter-spacing: -0.03em;
        }

        .page-header p {
          margin: 8px 0 0;
          color: var(--muted);
          max-width: 70ch;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0,1fr));
          gap: 16px;
        }

        .card {
          grid-column: span 12;
          background: var(--panel-strong);
          border: 1px solid var(--line);
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 10px 24px rgba(23,48,66,0.06);
        }
        .card h3 { margin: 0 0 10px; font-size: 1.05rem; }
        .card p, .card li { color: var(--muted); }
        .card ul { margin: 0; padding-left: 18px; }

        .span-4  { grid-column: span 4; }
        .span-5  { grid-column: span 5; }
        .span-6  { grid-column: span 6; }
        .span-7  { grid-column: span 7; }
        .span-8  { grid-column: span 8; }

        .pill-row { display: flex; flex-wrap: wrap; gap: 10px; }
        .pill {
          padding: 10px 14px;
          border-radius: 999px;
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 600;
        }

        .journal-box {
          min-height: 150px;
          padding: 16px;
          border-radius: 18px;
          border: 1px dashed rgba(15,118,110,0.28);
          background: rgba(218,243,236,0.3);
          color: var(--muted);
        }

        .meter {
          height: 12px;
          border-radius: 999px;
          background: #e7eff1;
          overflow: hidden;
        }
        .meter > span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #0f766e, #49a99f);
        }

        .settings-list { display: grid; gap: 12px; }
        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border: 1px solid var(--line);
          border-radius: 16px;
        }
        .settings-row strong { display: block; margin-bottom: 4px; }

        .toggle {
          width: 54px; height: 30px;
          border-radius: 999px;
          background: #cfe3df;
          position: relative; flex: none;
        }
        .toggle::after {
          content: '';
          position: absolute;
          top: 4px; left: 28px;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        code {
          display: inline-block;
          margin: 0 4px;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.8);
          color: var(--accent);
          font-family: Consolas, monospace;
          font-size: 0.92rem;
        }

        /* ── notifications ──────────────────────────────────── */
        .notif-anchor {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 200;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .notif-panel {
          background: var(--panel-strong);
          border: 1px solid var(--line);
          border-radius: 18px;
          box-shadow: 0 16px 40px rgba(23,48,66,0.14);
          padding: 16px;
          width: 270px;
          animation: fade-up 180ms ease;
        }

        .notif-heading {
          margin: 0 0 12px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .notif-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 10px 0;
          border-bottom: 1px solid var(--line);
        }
        .notif-item:last-child { border-bottom: none; padding-bottom: 0; }

        .notif-text { font-size: 0.88rem; color: var(--ink); }
        .notif-time { font-size: 0.76rem; color: var(--muted); }

        .notif-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1.5px solid var(--line);
          background: var(--panel-strong);
          color: var(--ink);
          box-shadow: 0 6px 18px rgba(23,48,66,0.10);
          transition: transform 140ms, box-shadow 140ms;
        }
        .notif-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(23,48,66,0.14);
        }

        .notif-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #dc2626;
          color: #fff;
          font-size: 0.68rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid #fff;
        }

        /* ── animation ──────────────────────────────────────── */
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── responsive ─────────────────────────────────────── */
        @media (max-width: 960px) {
          .layout { grid-template-columns: 1fr; }
          .sidebar { border-right: 0; border-bottom: 1px solid var(--line); }
          .nav-list { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .span-4,.span-5,.span-6,.span-7,.span-8 { grid-column: span 12; }
          .feature-grid-landing { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }

        @media (max-width: 640px) {
          .topbar { padding: 0 16px; }
          .shell-body { padding: 12px; }
          .nav-list { grid-template-columns: 1fr; }
          .feature-grid-landing { grid-template-columns: 1fr; }
          .landing { padding: 40px 16px 60px; }
        }
      `}</style>

      {/* ── top bar ── */}
      <header className="topbar">
        <div className="topbar-actions">
          {isLoggedIn ? (
            <button className="btn-outline" onClick={handleLogout}>Log out</button>
          ) : (
            <>
              <button className="btn-outline" onClick={handleLogin}>Log in</button>
              <button className="btn-primary" onClick={handleLogin}>Sign up</button>
            </>
          )}
        </div>

        <div className="aurora-logo">
          <div className="logo-mark" />
          <span className="logo-text">Aurora</span>
        </div>
      </header>

      {isLoggedIn ? (
        /* ── logged-in dashboard ── */
        <div className="shell-body">
          <div className="frame">
            <div className="layout">
              <aside className="sidebar">
                <h2>Aurora</h2>
                <nav className="nav-list">
                  {pageConfig.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      className={`nav-item${page.id === activePage ? ' active' : ''}`}
                      onClick={() => navigate(page.id)}
                    >
                      {page.label}
                    </button>
                  ))}
                </nav>
              </aside>

              <main className="content">
                <ActiveComponent />
              </main>
            </div>
          </div>
        </div>
      ) : (
        /* ── public landing ── */
        <div className="landing">
          <div className="landing-hero">
            <p className="eyebrow">Aurora · Mental wellness</p>
            <h1>Your calm, always-on mental wellness companion.</h1>
            <p className="landing-sub">
              Aurora brings together AI-guided conversations, professional therapist matching,
              peer community, and reflective tools — all in one safe, private space.
            </p>
            <div className="landing-cta">
              <button className="btn-primary-lg" onClick={handleLogin}>Get started free</button>
              <button className="btn-outline-lg" onClick={handleLogin}>Log in</button>
            </div>
          </div>

          <p className="features-label">Everything included</p>
          <div className="feature-grid-landing">
            {features.map((f) => (
              <div key={f.id} className="feature-card-landing">
                <span className="feature-tag">{f.tag}</span>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── bottom-left notifications ── */}
      <div className="notif-anchor">
        {notifOpen && (
          <div className="notif-panel">
            <p className="notif-heading">Notifications</p>
            {mockNotifications.map((n) => (
              <div key={n.id} className="notif-item">
                <span className="notif-text">{n.text}</span>
                <span className="notif-time">{n.time}</span>
              </div>
            ))}
          </div>
        )}
        <button
          className="notif-btn"
          onClick={() => setNotifOpen((o) => !o)}
          aria-label={`${mockNotifications.length} notifications`}
        >
          <BellIcon />
          <span className="notif-badge">{mockNotifications.length}</span>
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <NavigationProvider>
      <UserProvider>
        <AppShell />
      </UserProvider>
    </NavigationProvider>
  )
}
