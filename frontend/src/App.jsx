import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { TextReveal } from './components/ui/cascade-text.jsx'
import WhisperText from './components/ui/whisper-text.jsx'
import { LoadingState } from './components/ui/feedback.jsx'
import { UserProvider, useUser } from './context/UserContext.jsx'
import { NavigationProvider, useNavigation } from './context/NavigationContext.jsx'
import { pageConfig } from './routes/AppRoutes.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import './app.css'
import './quiet-pages.css'

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
    if (days >= 7) notes.push({ id: 'checkin', text: 'Your weekly check-in is ready', time: days === 7 ? 'Today' : `${days - 7}d overdue`, page: 'checkins' })
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
  const notifAnchorRef = useRef(null)
  const notifButtonRef = useRef(null)

  const isLoggedIn = !!user
  const hasCurrentPersonalityAssessment = user?.hasCurrentPersonalityAssessment === true
  const assessmentLocked = isLoggedIn && !hasCurrentPersonalityAssessment
  const activeShellPage = assessmentLocked && activePage !== 'checkins' ? 'checkins' : activePage

  // dynamic notifications
  const notifications = useMemo(() => (assessmentLocked ? [] : getDynamicNotifications()), [assessmentLocked])
  useEffect(() => {
    if (!notifOpen) return undefined

    function closeNotificationsOnOutsideClick(event) {
      if (!notifAnchorRef.current?.contains(event.target)) {
        setNotifOpen(false)
      }
    }

    function closeNotificationsOnEscape(event) {
      if (event.key === 'Escape') {
        setNotifOpen(false)
        notifButtonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', closeNotificationsOnOutsideClick)
    document.addEventListener('keydown', closeNotificationsOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeNotificationsOnOutsideClick)
      document.removeEventListener('keydown', closeNotificationsOnEscape)
    }
  }, [notifOpen])


  // daily journal prompt
  useEffect(() => {
    if (!isLoggedIn || assessmentLocked) return
    const todayKey = getTodayKey()
    if (localStorage.getItem(DAILY_PROMPT_KEY) === todayKey) return
    try {
      const entries = JSON.parse(localStorage.getItem(JOURNAL_ENTRIES_KEY) || '{}')
      if (entries[todayKey]?.text || entries[todayKey]?.doodleData) return
    } catch {}
    setShowDailyPrompt(true)
  }, [isLoggedIn, assessmentLocked])

  // auto-show check-in prompt after 2 days of ignoring (7 days due + 2 days grace = 9)
  useEffect(() => {
    if (!isLoggedIn || assessmentLocked) return
    const lastCompleted = localStorage.getItem('aurora.checkin.last-completed')
    if (!lastCompleted) return // no history, initial assessment handles this
    const days = Math.floor((new Date() - new Date(lastCompleted)) / (1000 * 60 * 60 * 24))
    if (days < 9) return // 7 days due + 2 days grace
    const todayKey = getTodayKey()
    if (localStorage.getItem('aurora.checkin.prompt-shown') === todayKey) return
    setShowCheckinPrompt(true)
  }, [isLoggedIn, assessmentLocked])

  useEffect(() => {
    if (assessmentLocked && activePage !== 'checkins') {
      navigate('checkins')
    }
  }, [assessmentLocked, activePage, navigate])

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
    () => pageConfig.find((p) => p.id === activeShellPage)?.component ?? Home,
    [activeShellPage],
  )

  function openAuth(mode) {
    setAuthMode(mode)
    setShowAuth(true)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    contentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [activeShellPage, isLoggedIn])

  if (loading) {
    return <LoadingState label="Loading Aurora…" skeletonLines={3} className="app-loading" />
  }

  return (
    <div className={`app-root${isLoggedIn ? ' app-root--dashboard' : ''}`}>


      {showAuth && <Login initialMode={authMode} onClose={() => setShowAuth(false)} />}

      {/* ── top bar ── */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="aurora-logo">
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
        </div>
      </header>

      {isLoggedIn ? (
        /* ── logged-in dashboard ── */
        <div className="shell-body">
          <div className="frame">
            <div className="layout">
              <aside className="sidebar">
                <nav className="nav-list">
                  {(assessmentLocked ? pageConfig.filter((page) => page.id === 'checkins') : pageConfig).map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      className={`nav-item${page.id === activeShellPage ? ' active' : ''}`}
                      onClick={() => navigate(page.id)}
                    >
                      {page.label}
                    </button>
                  ))}
                </nav>
              </aside>

              <main ref={contentRef} className="content">
                <Suspense fallback={<LoadingState label="Loading page…" skeletonLines={3} />}>
                  <ActiveComponent />
                </Suspense>
              </main>
            </div>
          </div>
        </div>
      ) : (
        /* ── public landing ── */
        <div className="landing">
          <section className="landing-hero">
            <div className="landing-hero-copy">
              <h1>
                <WhisperText
                  as="span"
                  text="Your calm, always-on mental wellness companion."
                  className="landing-whisper"
                />
              </h1>
              <div className="landing-cta">
                <button className="btn-primary-lg" onClick={() => openAuth('register')}>Get started free</button>
                <button className="btn-outline-lg" onClick={() => openAuth('login')}>Log in</button>
              </div>
            </div>

            <div className="landing-product-visual" aria-label="Aurora daily reflection preview">
              <div className="product-visual-header">
                <span className="product-visual-brand">Aurora</span>
                <span className="product-visual-date">Today</span>
              </div>
              <div className="product-visual-body">
                <div>
                  <p className="product-visual-label">Today's journal prompt</p>
                  <p className="product-visual-prompt">What would support look like for you right now?</p>
                </div>
                <div className="product-visual-tools" aria-label="Aurora tools">
                  <div className="product-visual-tool"><span>Mood</span><strong>Pick a mood</strong></div>
                  <div className="product-visual-tool"><span>Journal</span><strong>Private</strong></div>
                  <div className="product-visual-tool"><span>Check-in</span><strong>Due this week</strong></div>
                </div>
              </div>
            </div>
          </section>

          <section className="landing-capabilities" aria-labelledby="landing-features-title">
            <p className="features-label" id="landing-features-title">Everything included</p>
            <div className="feature-grid-landing">
              {features.map((f) => (
                <div key={f.id} className="feature-card-landing">
                  <span className="feature-tag">{f.title}</span>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
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
      {isLoggedIn && <div ref={notifAnchorRef} className="notif-anchor">
        {notifOpen && (
          <div
            id="notifications-popover"
            className="notif-panel"
            role="region"
            aria-labelledby="notifications-heading"
          >
            <p id="notifications-heading" className="notif-heading">Notifications</p>
            {notifications.length === 0 ? (
              <p className="notif-empty">You're all caught up.</p>
            ) : notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className="notif-item notif-item--clickable"
                onClick={() => { navigate(n.page); setNotifOpen(false) }}
              >
                <span className="notif-text">{n.text}</span>
                <span className="notif-time">{n.time}</span>
              </button>
            ))}
          </div>
        )}
        <button
          ref={notifButtonRef}
          type="button"
          className="notif-btn"
          onClick={() => setNotifOpen((o) => !o)}
          aria-label={`${notifications.length} notifications`}
          aria-expanded={notifOpen}
          aria-controls="notifications-popover"
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

function AppContent() {
  const { user } = useUser()
  const hasCurrentPersonalityAssessment = user?.hasCurrentPersonalityAssessment === true
  const lockedPageId = user && !hasCurrentPersonalityAssessment ? 'checkins' : null

  return (
    <NavigationProvider lockedPageId={lockedPageId}>
      <AppShell />
    </NavigationProvider>
  )
}

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  )
}
