import { useEffect, useMemo, useRef, useState } from 'react'
import { TextReveal } from './components/ui/cascade-text.jsx'
import WhisperText from './components/ui/whisper-text.jsx'
import { UserProvider, useUser } from './context/UserContext.jsx'
import { NavigationProvider, useNavigation } from './context/NavigationContext.jsx'
import { pageConfig } from './routes/AppRoutes.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'

const features = [
  { id: 'chatbot',   title: 'AI Chatbot',       desc: "Talk through what's on your mind with Aurora's AI, available around the clock.",          tag: '24/7'        },
  { id: 'checkins',  title: 'Check-Ins',         desc: 'Quick daily surveys that monitor your mental wellness and flag changes early.',            tag: 'Daily'       },
  { id: 'journal',   title: 'Thought Journal',   desc: "A private, open-ended space to process your feelings and daily experiences.",             tag: 'Private'     },
  { id: 'therapist', title: 'Therapist Match',   desc: 'Get paired with a licensed professional whose style and focus suit your needs.',          tag: 'Licensed'    },
  { id: 'community', title: 'Peer Support',      desc: "Connect anonymously with others who understand what you're going through.",               tag: 'Anonymous'   },
  { id: 'library',   title: 'Info Library',      desc: 'Learn about mental health through interactive content and daily learning streaks.',       tag: 'Interactive' },
]

function getDynamicNotifications() {
  const notes = []
  const lastCompleted = localStorage.getItem('aurora.checkin.last-completed')
  if (lastCompleted) {
    const days = Math.floor((new Date() - new Date(lastCompleted)) / (1000 * 60 * 60 * 24))
    if (days >= 7) notes.push({ id: 'checkin', text: 'Your weekly check-in is ready', time: days === 7 ? 'Today' : `${days - 7}d overdue` })
  }
  return notes
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

const DAILY_PROMPT_KEY   = 'aurora.journal.daily-prompt'
const JOURNAL_ENTRIES_KEY = 'aurora.journal.entries'

function getTodayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function AppShell() {
  const { activePage, navigate }    = useNavigation()
  const { user, loading }   = useUser()
  const [showAuth, setShowAuth]     = useState(false)
  const [authMode, setAuthMode]     = useState('login')
  const [notifOpen, setNotifOpen]   = useState(false)
  const [showDailyPrompt, setShowDailyPrompt] = useState(false)
  const [showCheckinPrompt, setShowCheckinPrompt] = useState(false)
  const contentRef = useRef(null)

  const isLoggedIn = !!user

  // dynamic notifications
  const notifications = useMemo(() => getDynamicNotifications(), [isLoggedIn])

  // daily journal prompt
  useEffect(() => {
    if (!isLoggedIn) return
    const todayKey = getTodayKey()
    if (localStorage.getItem(DAILY_PROMPT_KEY) === todayKey) return
    try {
      const entries = JSON.parse(localStorage.getItem(JOURNAL_ENTRIES_KEY) || '{}')
      if (entries[todayKey]?.text || entries[todayKey]?.doodleData) return
    } catch {}
    setShowDailyPrompt(true)
  }, [isLoggedIn])

  // auto-show check-in prompt after 2 days of ignoring (7 days due + 2 days grace = 9)
  useEffect(() => {
    if (!isLoggedIn) return
    const lastCompleted = localStorage.getItem('aurora.checkin.last-completed')
    if (!lastCompleted) return // no history, initial assessment handles this
    const days = Math.floor((new Date() - new Date(lastCompleted)) / (1000 * 60 * 60 * 24))
    if (days < 9) return // 7 days due + 2 days grace
    const todayKey = getTodayKey()
    if (localStorage.getItem('aurora.checkin.prompt-shown') === todayKey) return
    setShowCheckinPrompt(true)
  }, [isLoggedIn])

  function dismissDailyPrompt() {
    localStorage.setItem(DAILY_PROMPT_KEY, getTodayKey())
    setShowDailyPrompt(false)
  }

  function openJournalFromPrompt() {
    localStorage.setItem(DAILY_PROMPT_KEY, getTodayKey())
    setShowDailyPrompt(false)
    navigate('journal')
  }

  function dismissCheckinPrompt(goToCheckins = false) {
    localStorage.setItem('aurora.checkin.prompt-shown', getTodayKey())
    setShowCheckinPrompt(false)
    if (goToCheckins) navigate('checkins')
  }

  const ActiveComponent = useMemo(
    () => pageConfig.find((p) => p.id === activePage)?.component ?? Home,
    [activePage],
  )

  function openAuth(mode) {
    setAuthMode(mode)
    setShowAuth(true)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    contentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [activePage, isLoggedIn])

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
        /* ── reset & tokens ────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        button, input, textarea, select { font: inherit; cursor: pointer; }
        a { color: inherit; }

        :root {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.5;
          font-weight: 400;
          color: #2e2a26;
          background:
            radial-gradient(circle at top, rgba(77,107,88,0.10), transparent 40%),
            linear-gradient(180deg, #faf4e8 0%, #f0e8d8 100%);
          -webkit-font-smoothing: antialiased;
          --ink:          #2e2a26;
          --muted:        #6b6460;
          --line:         rgba(46,42,38,0.16);
          --panel:        rgba(250,244,232,0.85);
          --panel-strong: #faf4e8;
          --accent:       #4d6b58;
          --accent-dark:  #3a5244;
          --accent-soft:  #d2e4dc;
          --blue:         #3a6898;
          --blue-dark:    #2a5080;
          --blue-soft:    #d6e8f5;
          --amber:        #9a6b2a;
          --amber-soft:   #f0e2c8;
          --shadow:       0 24px 60px rgba(46,42,38,0.12);
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
          justify-content: center;
          padding: 0 28px;
          height: 62px;
          background: rgba(250,244,232,0.90);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--line);
        }

        .topbar-actions {
          position: absolute;
          left: 28px;
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
          transition: border-color 140ms, background 140ms, color 140ms;
        }
        .btn-outline:hover {
          border-color: var(--blue);
          background: var(--blue-soft);
          color: var(--blue-dark);
        }

        .btn-primary {
          padding: 8px 18px;
          border-radius: 999px;
          border: none;
          background: var(--accent);
          color: #fff;
          font-size: 0.88rem;
          font-weight: 600;
          transition: background 140ms;
        }
        .btn-primary:hover { background: var(--accent-dark); }

        .btn-blue {
          padding: 8px 18px;
          border-radius: 999px;
          border: none;
          background: var(--blue);
          color: #fff;
          font-size: 0.88rem;
          font-weight: 600;
          transition: background 140ms;
        }
        .btn-blue:hover { background: var(--blue-dark); }

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
          background: linear-gradient(135deg, #4d6b58 0%, #3a6898 100%);
          flex: none;
          box-shadow: 0 4px 12px rgba(58,104,152,0.28);
        }

        .logo-text {
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--ink);
        }
        .logo-reveal {
          background: transparent;
          border: none;
        }

        /* ── landing (not logged in) ────────────────────────── */
        .landing {
          flex: 1;
          max-width: 1100px;
          margin: 0 auto;
          padding: 64px 24px 80px;
          width: 100%;
          font-family: "Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
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
          font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          font-size: clamp(2.2rem, 4vw, 4rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .landing-whisper {
          width: min(100%, 22ch);
          justify-content: center;
          text-align: center;
          margin: 0 auto;
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
          transition: background 140ms, transform 140ms;
        }
        .btn-primary-lg:hover { background: var(--accent-dark); transform: translateY(-1px); }

        .btn-outline-lg {
          padding: 14px 32px;
          border-radius: 999px;
          border: 1.5px solid var(--line);
          background: rgba(250,244,232,0.90);
          color: var(--ink);
          font-size: 1rem;
          font-weight: 600;
          transition: border-color 140ms, color 140ms, background 140ms;
        }
        .btn-outline-lg:hover {
          border-color: rgba(46,42,38,0.22);
          background: rgba(250,244,232,0.90);
          color: var(--ink);
        }

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
          background: rgba(250,244,232,0.90);
          border: 1px solid var(--line);
          border-radius: 22px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 3px 10px rgba(46,42,38,0.04);
        }

        .feature-tag {
          display: inline-block;
          font-size: 0.98rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.2;
          text-transform: none;
          color: #fff;
          background: var(--accent);
          padding: 9px 14px;
          border-radius: 22px;
          width: fit-content;
          border: 1px solid rgba(77,107,88,0.18);
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
          background: rgba(250,244,232,0.54);
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
          background: var(--blue-soft);
          border-color: var(--blue);
          color: var(--blue-dark);
        }
        .nav-item.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent-dark);
          box-shadow: 0 2px 8px rgba(77,107,88,0.25);
        }

        .content {
          padding: 28px;
          width: 100%;
        }

        /* ── page / card primitives ─────────────────────────── */
        .page {
          display: grid;
          gap: 18px;
          width: min(100%, 980px);
          margin: 0 auto;
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
          box-shadow: 0 10px 24px rgba(46,42,38,0.06);
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
          background: var(--blue-soft);
          color: var(--blue-dark);
          font-weight: 600;
          border: 1px solid rgba(58,104,152,0.20);
        }

        .journal-box {
          min-height: 150px;
          padding: 16px;
          border-radius: 18px;
          border: 1px dashed rgba(77,107,88,0.28);
          background: rgba(210,228,220,0.3);
          color: var(--muted);
        }

        .meter {
          height: 12px;
          border-radius: 999px;
          background: #ede8df;
          overflow: hidden;
        }
        .meter > span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #4d6b58, #7a9e8a);
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
          background: #d2e4dc;
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
          background: var(--blue-soft);
          color: var(--blue-dark);
          font-family: Consolas, monospace;
          font-size: 0.92rem;
          border: 1px solid rgba(58,104,152,0.18);
        }

        a:not([class]) {
          color: var(--blue);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        a:not([class]):hover { color: var(--blue-dark); }

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
          box-shadow: 0 16px 40px rgba(46,42,38,0.14);
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
          box-shadow: 0 6px 18px rgba(46,42,38,0.10);
          transition: transform 140ms, box-shadow 140ms;
        }
        .notif-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(46,42,38,0.14);
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

      {showAuth && <Login initialMode={authMode} onClose={() => setShowAuth(false)} />}

      {/* ── top bar ── */}
      <header className="topbar">
        <div className="topbar-actions" />

        <div className="aurora-logo">
          <div className="logo-mark" />
          <TextReveal
            as="button"
            text="Aurora"
            fontSize="1.15rem"
            color="var(--ink)"
            hoverColor="var(--blue)"
            className="logo-reveal"
            style={{ background: 'transparent', border: 'none' }}
            onClick={() => navigate('home')}
          />
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

              <main ref={contentRef} className="content">
                <ActiveComponent />
              </main>
            </div>
          </div>
        </div>
      ) : (
        /* ── public landing ── */
        <div className="landing">
          <div className="landing-hero">
            <h1>
              <WhisperText
                as="span"
                text="Your calm, always-on mental wellness companion."
                className="landing-whisper"
                delay={100}
                duration={0.5}
                x={-20}
                y={0}
              />
            </h1>
            <div className="landing-cta">
              <button className="btn-primary-lg" onClick={() => openAuth('register')}>Get started free</button>
              <button className="btn-outline-lg" onClick={() => openAuth('login')}>Log in</button>
            </div>
          </div>

          <p className="features-label">Everything included</p>
          <div className="feature-grid-landing">
            {features.map((f) => (
              <div key={f.id} className="feature-card-landing">
                <span className="feature-tag">{f.title}</span>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── daily journal prompt ── */}
      {isLoggedIn && showDailyPrompt && (
        <div className="djp-backdrop" onClick={dismissDailyPrompt}>
          <div className="djp-card" onClick={e => e.stopPropagation()}>
            <div className="djp-top">
              <div className="djp-icon">✦</div>
              <div>
                <strong className="djp-title">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}</strong>
                <p className="djp-sub">Take a moment to write in your journal today.</p>
              </div>
            </div>
            <p className="djp-body">Even a few sentences about how you're feeling can help Aurora support you better. Your entries are private.</p>
            <div className="djp-actions">
              <button className="djp-skip" onClick={dismissDailyPrompt}>Maybe later</button>
              <button className="djp-go" onClick={openJournalFromPrompt}>Open journal →</button>
            </div>
          </div>
          <style>{`
            .djp-backdrop {
              position: fixed; inset: 0; z-index: 100;
              display: flex; align-items: center; justify-content: center;
              padding: 20px;
              background: rgba(46,42,38,0.36);
              backdrop-filter: blur(4px);
              animation: fade-up 200ms ease;
            }
            .djp-card {
              width: min(400px, 100%);
              background: var(--panel-strong);
              border: 1px solid var(--line);
              border-radius: 24px;
              padding: 28px;
              box-shadow: 0 28px 72px rgba(46,42,38,0.22);
              display: flex; flex-direction: column; gap: 16px;
            }
            .djp-top { display: flex; align-items: flex-start; gap: 14px; }
            .djp-icon {
              width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
              background: linear-gradient(135deg, #4d6b58, #3a6898);
              color: #fff; font-size: 1.3rem;
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 6px 18px rgba(77,107,88,0.28);
            }
            .djp-title { display: block; font-size: 1.1rem; font-weight: 800; letter-spacing: -0.02em; color: var(--ink); }
            .djp-sub   { margin: 3px 0 0; font-size: 0.84rem; color: var(--muted); }
            .djp-body  { margin: 0; font-size: 0.88rem; color: var(--muted); line-height: 1.6; }
            .djp-actions { display: flex; gap: 10px; align-items: center; }
            .djp-skip {
              padding: 10px 20px; border-radius: 999px;
              border: 1.5px solid var(--line); background: transparent;
              color: var(--muted); font-size: 0.88rem; font-weight: 600;
              transition: border-color 140ms; cursor: pointer;
            }
            .djp-skip:hover { border-color: var(--accent); color: var(--accent); }
            .djp-go {
              padding: 10px 22px; border-radius: 999px; border: none;
              background: var(--accent); color: #fff;
              font-size: 0.88rem; font-weight: 700;
              transition: opacity 140ms, transform 140ms; cursor: pointer;
            }
            .djp-go:hover { opacity: 0.88; transform: translateY(-1px); }
          `}</style>
        </div>
      )}

      {/* ── check-in overdue prompt ── */}
      {isLoggedIn && showCheckinPrompt && !showDailyPrompt && (
        <div className="cip-backdrop" onClick={() => dismissCheckinPrompt(false)}>
          <div className="cip-card" onClick={e => e.stopPropagation()}>
            <div className="cip-top">
              <div className="cip-icon">◎</div>
              <div>
                <strong className="cip-title">Your weekly check-in is overdue</strong>
                <p className="cip-sub">It's been a while since your last check-in.</p>
              </div>
            </div>
            <p className="cip-body">Regular check-ins help Aurora detect changes in your well-being early and support you more effectively. It only takes about 4 minutes.</p>
            <div className="cip-actions">
              <button className="cip-skip" onClick={() => dismissCheckinPrompt(false)}>Maybe later</button>
              <button className="cip-go" onClick={() => dismissCheckinPrompt(true)}>Start check-in →</button>
            </div>
          </div>
          <style>{`
            .cip-backdrop {
              position: fixed; inset: 0; z-index: 100;
              display: flex; align-items: center; justify-content: center;
              padding: 20px;
              background: rgba(46,42,38,0.36);
              backdrop-filter: blur(4px);
              animation: fade-up 200ms ease;
            }
            .cip-card {
              width: min(400px, 100%);
              background: var(--panel-strong);
              border: 1px solid rgba(77,107,88,0.28);
              border-radius: 24px;
              padding: 28px;
              box-shadow: 0 28px 72px rgba(46,42,38,0.22);
              display: flex; flex-direction: column; gap: 16px;
            }
            .cip-top { display: flex; align-items: flex-start; gap: 14px; }
            .cip-icon {
              width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
              background: linear-gradient(135deg, #4d6b58, #3a5244);
              color: #fff; font-size: 1.3rem;
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 6px 18px rgba(77,107,88,0.28);
            }
            .cip-title { display: block; font-size: 1.1rem; font-weight: 800; letter-spacing: -0.02em; color: var(--ink); }
            .cip-sub   { margin: 3px 0 0; font-size: 0.84rem; color: var(--muted); }
            .cip-body  { margin: 0; font-size: 0.88rem; color: var(--muted); line-height: 1.6; }
            .cip-actions { display: flex; gap: 10px; align-items: center; }
            .cip-skip {
              padding: 10px 20px; border-radius: 999px;
              border: 1.5px solid var(--line); background: transparent;
              color: var(--muted); font-size: 0.88rem; font-weight: 600;
              transition: border-color 140ms; cursor: pointer;
            }
            .cip-skip:hover { border-color: var(--accent); color: var(--accent); }
            .cip-go {
              padding: 10px 22px; border-radius: 999px; border: none;
              background: var(--accent); color: #fff;
              font-size: 0.88rem; font-weight: 700;
              transition: opacity 140ms, transform 140ms; cursor: pointer;
            }
            .cip-go:hover { opacity: 0.88; transform: translateY(-1px); }
          `}</style>
        </div>
      )}

      {/* ── bottom-left notifications ── */}
      {isLoggedIn && <div className="notif-anchor">
        {notifOpen && (
          <div className="notif-panel">
            <p className="notif-heading">Notifications</p>
            {notifications.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--muted)' }}>No new notifications</p>
            ) : notifications.map((n) => (
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
          aria-label={`${notifications.length} notifications`}
        >
          <BellIcon />
          {notifications.length > 0 && (
            <span className="notif-badge">{notifications.length}</span>
          )}
        </button>
      </div>}
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
