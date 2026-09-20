import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { TextReveal } from './components/ui/cascade-text.jsx'
import WhisperText from './components/ui/whisper-text.jsx'
import { LoadingState } from './components/ui/feedback.jsx'
import FeatureStories from './components/landing/FeatureStories.jsx'
import { UserProvider, useUser } from './context/UserContext.jsx'
import { NavigationProvider, useNavigation } from './context/NavigationContext.jsx'
import { pageConfig } from './routes/AppRoutes.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import { useAccessibleDialog } from './hooks/use-accessible-dialog.js'
import './app.css'
import './quiet-pages.css'

const features = [
  { id: 'chatbot',   title: 'AI Chatbot',       desc: "Talk through what's on your mind with Dawn Harbor's AI, available around the clock.",          tag: '24/7'        },
  { id: 'checkins',  title: 'Check-Ins',         desc: 'Quick daily surveys that monitor your mental wellness and flag changes early.',            tag: 'Daily'       },
  { id: 'journal',   title: 'Thought Journal',   desc: "A private, open-ended space to process your feelings and daily experiences.",             tag: 'Private'     },
  { id: 'therapist', title: 'Therapist Match',   desc: 'Get paired with a licensed professional whose style and focus suit your needs.',          tag: 'Licensed'    },
  { id: 'community', title: 'Peer Support',      desc: "Connect anonymously with others who understand what you're going through.",               tag: 'Anonymous'   },
  { id: 'library',   title: 'Info Library',      desc: 'Explore clear guides to common mental health conditions, then test your understanding with a short quiz.', tag: 'Interactive' },
]

function calendarDaysSince(dateKey, today = new Date()) {
  if (!dateKey) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return null

  const [, year, month, day] = match.map(Number)
  const dateValue = Date.UTC(year, month - 1, day)
  const todayValue = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.floor((todayValue - dateValue) / (24 * 60 * 60 * 1000))
}

function getDynamicNotifications(user, assessmentLocked) {
  if (!user || assessmentLocked || !user.checkInDueThisWeek) return []

  const daysDue = calendarDaysSince(user.weeklyCheckInDueSince)
  const time = daysDue === 0
    ? 'Due today'
    : daysDue > 0
      ? String(daysDue) + 'd overdue'
      : 'Due this week'

  return [{ id: 'checkin', text: 'Your weekly check-in is ready', time, page: 'checkins' }]
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

const DAILY_PROMPT_KEY   = 'dawn-harbor.journal.daily-prompt'

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
  const dailyPromptBackdropRef = useRef(null)
  const dailyPromptDialogRef = useRef(null)
  const dailyPromptHeadingRef = useRef(null)
  const checkinPromptBackdropRef = useRef(null)
  const checkinPromptDialogRef = useRef(null)
  const checkinPromptHeadingRef = useRef(null)

  const isLoggedIn = !!user
  const hasCurrentPersonalityAssessment = user?.hasCurrentPersonalityAssessment === true
  const assessmentLocked = isLoggedIn && !hasCurrentPersonalityAssessment
  const activeShellPage = assessmentLocked && activePage !== 'checkins' ? 'checkins' : activePage

  useAccessibleDialog({
    open: isLoggedIn && showDailyPrompt,
    containerRef: dailyPromptBackdropRef,
    dialogRef: dailyPromptDialogRef,
    initialFocusRef: dailyPromptHeadingRef,
    onClose: dismissDailyPrompt,
  })

  useAccessibleDialog({
    open: isLoggedIn && showCheckinPrompt && !showDailyPrompt,
    containerRef: checkinPromptBackdropRef,
    dialogRef: checkinPromptDialogRef,
    initialFocusRef: checkinPromptHeadingRef,
    onClose: () => dismissCheckinPrompt(false),
  })

  // dynamic notifications
  const notifications = useMemo(
    () => getDynamicNotifications(user, assessmentLocked),
    [assessmentLocked, user],
  )
  const notificationButtonLabel = notifications.length === 0
    ? 'Notifications, none active'
    : notifications.length === 1
      ? 'Notifications, 1 active'
      : 'Notifications, ' + notifications.length + ' active'

  useEffect(() => {
    setNotifOpen(false)
  }, [activePage, user?.id])

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
    if (user?.lastJournalEntryDate === todayKey) return
    setShowDailyPrompt(true)
  }, [isLoggedIn, assessmentLocked, user?.lastJournalEntryDate])

  // Auto-show after the server says the weekly check-in has been due for two days.
  useEffect(() => {
    if (!isLoggedIn || assessmentLocked || !user?.checkInDueThisWeek) {
      setShowCheckinPrompt(false)
      return
    }
    const daysDue = calendarDaysSince(user.weeklyCheckInDueSince)
    if (daysDue === null || daysDue < 2) {
      setShowCheckinPrompt(false)
      return
    }
    const todayKey = getTodayKey()
    if (localStorage.getItem(`dawn-harbor.checkin.prompt-shown.${user.id}`) === todayKey) return
    setShowCheckinPrompt(true)
  }, [isLoggedIn, assessmentLocked, user?.checkInDueThisWeek, user?.weeklyCheckInDueSince])

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
    localStorage.setItem(`dawn-harbor.checkin.prompt-shown.${user.id}`, getTodayKey())
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
    return <LoadingState label="Loading Dawn Harbor…" skeletonLines={3} className="app-loading" />
  }

  return (
    <div className={`app-root${isLoggedIn ? ' app-root--dashboard' : ''}`}>


      {showAuth && <Login initialMode={authMode} onClose={() => setShowAuth(false)} />}

      {/* ── top bar ── */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="dawn-harbor-logo">
            <TextReveal
              as="button"
              text="Dawn Harbor"
              fontSize="1.15rem"
              color="var(--ink)"
              hoverColor="var(--accent)"
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

            <div className="landing-product-visual" aria-label="Dawn Harbor daily reflection preview">
              <div className="product-visual-header">
                <span className="product-visual-brand">Dawn Harbor</span>
                <span className="product-visual-date">Today</span>
              </div>
              <div className="product-visual-body">
                <div>
                  <p className="product-visual-label">Today's journal prompt</p>
                  <p className="product-visual-prompt">What would support look like for you right now?</p>
                </div>
                <div className="product-visual-tools" aria-label="Dawn Harbor tools">
                  <div className="product-visual-tool"><span>Mood</span><strong>Pick a mood</strong></div>
                  <div className="product-visual-tool"><span>Journal</span><strong>Private</strong></div>
                  <div className="product-visual-tool"><span>Check-in</span><strong>Due this week</strong></div>
                </div>
              </div>
            </div>
          </section>

          <FeatureStories features={features} />

          <section className={'landing-endcap'} aria-labelledby={'landing-endcap-title'}>
            <div className={'landing-endcap-copy'}>
              <h2 id={'landing-endcap-title'}>Ready when you are.</h2>
              <p>Create your private Dawn Harbor space.</p>
            </div>
            <button className={'btn-primary-lg'} onClick={() => openAuth('register')}>Get started free</button>
          </section>
        </div>
      )}

      {/* ── daily journal prompt ── */}
      {isLoggedIn && showDailyPrompt && (
        <div ref={dailyPromptBackdropRef} className="djp-backdrop" onClick={dismissDailyPrompt}>
          <div
            ref={dailyPromptDialogRef}
            className="djp-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-journal-prompt-title"
            aria-describedby="daily-journal-prompt-description"
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
          >
            <div className="djp-top">
              <div className="djp-icon" aria-hidden="true">✦</div>
              <div>
                <h2 ref={dailyPromptHeadingRef} id="daily-journal-prompt-title" className="djp-title" tabIndex={-1}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}</h2>
                <p className="djp-sub">Take a moment to write in your journal today.</p>
              </div>
            </div>
            <p id="daily-journal-prompt-description" className="djp-body">Even a few sentences about how you're feeling can help Dawn Harbor support you better. Your entries are private.</p>
            <div className="djp-actions">
              <button type="button" className="djp-skip" onClick={dismissDailyPrompt}>Maybe later</button>
              <button type="button" className="djp-go" onClick={openJournalFromPrompt}>Open journal →</button>
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
            .djp-title { display: block; margin: 0; font-size: 1.1rem; font-weight: 800; letter-spacing: -0.02em; color: var(--ink); }
            .djp-title:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 4px; }
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
        <div ref={checkinPromptBackdropRef} className="cip-backdrop" onClick={() => dismissCheckinPrompt(false)}>
          <div
            ref={checkinPromptDialogRef}
            className="cip-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="overdue-checkin-prompt-title"
            aria-describedby="overdue-checkin-prompt-description"
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
          >
            <div className="cip-top">
              <div className="cip-icon" aria-hidden="true">◎</div>
              <div>
                <h2 ref={checkinPromptHeadingRef} id="overdue-checkin-prompt-title" className="cip-title" tabIndex={-1}>Your weekly check-in is overdue</h2>
                <p className="cip-sub">It's been a while since your last check-in.</p>
              </div>
            </div>
            <p id="overdue-checkin-prompt-description" className="cip-body">Regular check-ins help Dawn Harbor detect changes in your well-being early and support you more effectively. It only takes about 4 minutes.</p>
            <div className="cip-actions">
              <button type="button" className="cip-skip" onClick={() => dismissCheckinPrompt(false)}>Maybe later</button>
              <button type="button" className="cip-go" onClick={() => dismissCheckinPrompt(true)}>Start check-in →</button>
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
            .cip-title { display: block; margin: 0; font-size: 1.1rem; font-weight: 800; letter-spacing: -0.02em; color: var(--ink); }
            .cip-title:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 4px; }
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
        <button
          ref={notifButtonRef}
          type="button"
          className="notif-btn"
          onClick={() => setNotifOpen((o) => !o)}
          aria-label={notificationButtonLabel}
          aria-expanded={notifOpen}
          aria-controls="notifications-popover"
          aria-haspopup="true"
        >
          <BellIcon />
          {notifications.length > 0 && (
            <span className="notif-badge" aria-hidden="true">{notifications.length}</span>
          )}
        </button>
        {notifOpen && (
          <div
            id="notifications-popover"
            className="notif-panel"
            role="region"
            aria-labelledby="notifications-heading"
            aria-live="polite"
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
