import { useState } from 'react'

// ─── question bank (60 questions, 10 per category) ────────────────────────────

const QUESTION_BANK = [
  // Anxiety
  { id:  1, cat: 'anxiety',    text: 'I tend to rehearse conversations or situations in my head before they happen.' },
  { id:  2, cat: 'anxiety',    text: 'Unexpected changes to plans can leave me unsettled for a while.' },
  { id:  3, cat: 'anxiety',    text: 'I often notice potential problems before others do.' },
  { id:  4, cat: 'anxiety',    text: 'Even small mistakes can stay on my mind longer than I\'d like.' },
  { id:  5, cat: 'anxiety',    text: 'I like having backup plans "just in case."' },
  { id:  6, cat: 'anxiety',    text: 'It is difficult for me to fully relax, even during free time.' },
  { id:  7, cat: 'anxiety',    text: 'I frequently think about what could go wrong in the future.' },
  { id:  8, cat: 'anxiety',    text: 'I become mentally preoccupied when waiting for important news.' },
  { id:  9, cat: 'anxiety',    text: 'I prefer certainty over spontaneity whenever possible.' },
  { id: 10, cat: 'anxiety',    text: 'My mind often feels active when I wish it would slow down.' },
  // Loneliness
  { id: 11, cat: 'loneliness', text: 'I often feel that people around me don\'t fully understand me.' },
  { id: 12, cat: 'loneliness', text: 'I have many interactions that feel superficial rather than meaningful.' },
  { id: 13, cat: 'loneliness', text: 'I wish I had more people I could genuinely rely on.' },
  { id: 14, cat: 'loneliness', text: 'Even in groups, I sometimes feel like an outsider.' },
  { id: 15, cat: 'loneliness', text: 'I hesitate to share my deeper thoughts with others.' },
  { id: 16, cat: 'loneliness', text: 'I often handle emotional struggles on my own.' },
  { id: 17, cat: 'loneliness', text: 'I rarely feel truly seen or appreciated for who I am.' },
  { id: 18, cat: 'loneliness', text: 'I wish more people checked in on me without being asked.' },
  { id: 19, cat: 'loneliness', text: 'I sometimes avoid reaching out because I assume others are busy.' },
  { id: 20, cat: 'loneliness', text: 'I miss having stronger connections in my life.' },
  // Grief
  { id: 21, cat: 'grief',      text: 'Certain memories still affect me more than I expect.' },
  { id: 22, cat: 'grief',      text: 'I occasionally catch myself wishing things could return to how they once were.' },
  { id: 23, cat: 'grief',      text: 'I carry experiences that changed me in lasting ways.' },
  { id: 24, cat: 'grief',      text: 'Anniversaries, places, or reminders can bring up strong emotions.' },
  { id: 25, cat: 'grief',      text: 'There are losses in my life that still influence my daily perspective.' },
  { id: 26, cat: 'grief',      text: 'I sometimes struggle to accept changes I didn\'t choose.' },
  { id: 27, cat: 'grief',      text: 'I find myself revisiting "what if" scenarios about the past.' },
  { id: 28, cat: 'grief',      text: 'I keep parts of certain memories close because they remain meaningful.' },
  { id: 29, cat: 'grief',      text: 'I have moments where emotions connected to the past resurface unexpectedly.' },
  { id: 30, cat: 'grief',      text: 'Some chapters of my life still feel unfinished emotionally.' },
  // Burnout
  { id: 31, cat: 'burnout',    text: 'Tasks that used to feel manageable now require more effort.' },
  { id: 32, cat: 'burnout',    text: 'I often feel mentally drained before the day is over.' },
  { id: 33, cat: 'burnout',    text: 'I struggle to maintain enthusiasm for responsibilities I once cared about.' },
  { id: 34, cat: 'burnout',    text: 'I frequently push through exhaustion because things still need to get done.' },
  { id: 35, cat: 'burnout',    text: 'I find myself operating on autopilot.' },
  { id: 36, cat: 'burnout',    text: 'Rest doesn\'t always leave me feeling recharged.' },
  { id: 37, cat: 'burnout',    text: 'Small demands sometimes feel disproportionately overwhelming.' },
  { id: 38, cat: 'burnout',    text: 'I have less patience than I used to.' },
  { id: 39, cat: 'burnout',    text: 'It is difficult to find motivation, even for important tasks.' },
  { id: 40, cat: 'burnout',    text: 'I feel like I have been giving more of myself than I can sustain.' },
  // Stress
  { id: 41, cat: 'stress',     text: 'I usually have several responsibilities competing for my attention.' },
  { id: 42, cat: 'stress',     text: 'I often feel pressed for time.' },
  { id: 43, cat: 'stress',     text: 'It can be difficult to mentally disconnect from obligations.' },
  { id: 44, cat: 'stress',     text: 'I feel like there is always something important waiting to be done.' },
  { id: 45, cat: 'stress',     text: 'I frequently juggle multiple priorities at once.' },
  { id: 46, cat: 'stress',     text: 'I have trouble fully enjoying downtime because I think about unfinished tasks.' },
  { id: 47, cat: 'stress',     text: 'My schedule often feels packed or demanding.' },
  { id: 48, cat: 'stress',     text: 'I feel pressure to meet expectations placed on me.' },
  { id: 49, cat: 'stress',     text: 'I sometimes wish I could pause life long enough to catch up.' },
  { id: 50, cat: 'stress',     text: 'I tend to carry a lot of responsibility at the same time.' },
  // Low Confidence
  { id: 51, cat: 'confidence', text: 'I compare my abilities to others more than I would like.' },
  { id: 52, cat: 'confidence', text: 'I hesitate to speak up unless I am sure I am right.' },
  { id: 53, cat: 'confidence', text: 'I sometimes underestimate what I can accomplish.' },
  { id: 54, cat: 'confidence', text: 'Praise from others can be difficult for me to fully believe.' },
  { id: 55, cat: 'confidence', text: 'I worry that people may notice my shortcomings more than my strengths.' },
  { id: 56, cat: 'confidence', text: 'I second-guess decisions after making them.' },
  { id: 57, cat: 'confidence', text: 'I need reassurance before feeling confident in unfamiliar situations.' },
  { id: 58, cat: 'confidence', text: 'I tend to focus on what I could have done better rather than what went well.' },
  { id: 59, cat: 'confidence', text: 'I avoid certain opportunities because I doubt my capabilities.' },
  { id: 60, cat: 'confidence', text: 'I often hold myself to standards I struggle to meet.' },
]

// ─── category config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'anxiety',    label: 'Anxiety',        color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.22)' },
  { id: 'loneliness', label: 'Loneliness',     color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.22)'  },
  { id: 'grief',      label: 'Grief',          color: '#c084fc', bg: 'rgba(192,132,252,0.10)', border: 'rgba(192,132,252,0.22)' },
  { id: 'burnout',    label: 'Burnout',        color: '#fb923c', bg: 'rgba(251,146,60,0.10)',  border: 'rgba(251,146,60,0.22)'  },
  { id: 'stress',     label: 'Stress',         color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)'  },
  { id: 'confidence', label: 'Low Confidence', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
]

// ─── mock history (4 weekly check-ins before today) ──────────────────────────

const MOCK_HISTORY = [
  {
    id: 'w1', date: '2026-05-18', type: 'weekly',
    qIds: [1, 3, 11, 14, 21, 24, 31, 35, 41, 44, 51, 55],
    scores: { anxiety: 58, loneliness: 42, grief: 31, burnout: 67, stress: 72, confidence: 48 },
  },
  {
    id: 'w2', date: '2026-05-25', type: 'weekly',
    qIds: [2, 5, 12, 16, 22, 26, 32, 36, 42, 46, 52, 56],
    scores: { anxiety: 62, loneliness: 38, grief: 29, burnout: 71, stress: 68, confidence: 51 },
  },
  {
    id: 'w3', date: '2026-06-01', type: 'weekly',
    qIds: [6, 8, 13, 17, 23, 27, 33, 38, 43, 47, 53, 57],
    scores: { anxiety: 55, loneliness: 44, grief: 27, burnout: 64, stress: 74, confidence: 46 },
  },
  {
    id: 'w4', date: '2026-06-08', type: 'weekly',
    qIds: [7, 9, 15, 18, 25, 28, 34, 37, 45, 48, 54, 58],
    scores: { anxiety: 61, loneliness: 40, grief: 30, burnout: 69, stress: 70, confidence: 43 },
  },
]

// ─── helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildSurvey(type, lastQIds = []) {
  const perCat = type === 'initial' ? 4 : 2
  const questions = []
  for (const cat of CATEGORIES) {
    const pool    = QUESTION_BANK.filter(q => q.cat === cat.id)
    const unused  = pool.filter(q => !lastQIds.includes(q.id))
    const source  = unused.length >= perCat ? unused : pool
    questions.push(...shuffle(source).slice(0, perCat))
  }
  return shuffle(questions)
}

function computeScores(answers, questions) {
  const raw = {}, count = {}
  for (const c of CATEGORIES) { raw[c.id] = 0; count[c.id] = 0 }
  for (const q of questions) {
    if (answers[q.id] != null) { raw[q.cat] += answers[q.id]; count[q.cat]++ }
  }
  const scores = {}
  for (const c of CATEGORIES) {
    const n = count[c.id]
    if (!n) { scores[c.id] = 0; continue }
    scores[c.id] = Math.round(((raw[c.id] - n) / (6 * n)) * 99 + 1)
  }
  return scores
}

function scoreBand(n) {
  if (n <= 20) return { label: 'Very Low',  color: '#22c55e' }
  if (n <= 40) return { label: 'Low',       color: '#34d399' }
  if (n <= 60) return { label: 'Moderate',  color: '#fbbf24' }
  if (n <= 80) return { label: 'Elevated',  color: '#fb923c' }
  return              { label: 'High',      color: '#ef4444' }
}

function trendArrow(curr, prev) {
  const d = curr - prev
  if (d >  8) return { sym: '↑', tip: `+${d} from last`,  col: '#ef4444' }
  if (d < -8) return { sym: '↓', tip: `${d} from last`, col: '#22c55e' }
  return              { sym: '→', tip: 'Stable',            col: '#94a3b8' }
}

function generateInsight(scores, prevScores) {
  const top = [...CATEGORIES].sort((a, b) => scores[b.id] - scores[a.id])[0]
  if (prevScores) {
    const rising = CATEGORIES.filter(c => scores[c.id] - prevScores[c.id] > 10)
    if (rising.length) {
      const names = rising.map(c => c.label.toLowerCase()).join(' and ')
      return `Your ${names} score${rising.length > 1 ? 's have' : ' has'} risen notably since last week. That pattern is worth paying attention to. The AI Chatbot or Therapist Match can help you unpack what's going on.`
    }
  }
  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / CATEGORIES.length
  if (avg < 35) return "Your scores look healthy across the board this week — keep doing what you're doing, and come back next week to keep the streak going."
  if (scores[top.id] >= 75) return `Your ${top.label.toLowerCase()} is scoring in the ${scoreBand(scores[top.id]).label.toLowerCase()} range. Aurora's AI Chatbot and Therapist Match are here whenever you're ready for support.`
  return "Thanks for completing this check-in. Your results are tracked over time so Aurora can spot patterns and reach out when things start to shift."
}

function fmtDate(str) {
  const d = new Date(str)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── hub view ─────────────────────────────────────────────────────────────────

function HubView({ history, streak, onStart, onStartInitial }) {
  const latest   = history[history.length - 1]
  const prevEntry = history[history.length - 2]
  const [showHistory, setShowHistory] = useState(false)

  // Last check-in was June 8; today is June 15 → due
  const dueToday = true

  return (
    <div className="ci-hub">
      {/* streak + due banner */}
      <div className="ci-top-row">
        <div className="ci-streak-card">
          <div className="ci-streak-num">{streak}</div>
          <div className="ci-streak-label">week streak</div>
          <div className="ci-streak-sub">Last check-in {fmtDate(latest.date)}</div>
        </div>

        <div className={`ci-due-card${dueToday ? ' ci-due-card--due' : ''}`}>
          {dueToday ? (
            <>
              <div className="ci-due-badge">Due today</div>
              <p className="ci-due-text">Your weekly check-in is ready. It takes about 3 minutes and helps Aurora detect changes in your well-being early.</p>
              <button className="ci-start-btn" onClick={() => onStart('weekly')}>Start weekly check-in →</button>
            </>
          ) : (
            <>
              <div className="ci-due-badge ci-due-badge--ok">Up to date</div>
              <p className="ci-due-text">Your next check-in is due in a few days. Come back then to keep your streak going.</p>
            </>
          )}
          <button className="ci-initial-link" onClick={() => onStartInitial()}>
            Retake initial assessment (24 questions)
          </button>
        </div>
      </div>

      {/* history list */}
      <button className="ci-history-toggle" onClick={() => setShowHistory(v => !v)}>
        {showHistory ? 'Hide history' : 'View check-in history'} {showHistory ? '↑' : '↓'}
      </button>

      {showHistory && (
        <div className="ci-history">
          {[...history].reverse().map((entry, i) => {
            const prev = history[history.length - 2 - i]
            return (
              <div key={entry.id} className="ci-history-row">
                <span className="ci-history-date">{fmtDate(entry.date)}</span>
                <span className="ci-history-type">{entry.type === 'initial' ? 'Initial assessment' : 'Weekly'}</span>
                <div className="ci-history-dots">
                  {CATEGORIES.map(cat => {
                    const s = entry.scores[cat.id]
                    return (
                      <div
                        key={cat.id}
                        className="ci-history-dot"
                        style={{ background: scoreBand(s).color }}
                        title={`${cat.label}: ${s} (${scoreBand(s).label})`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="ci-disclaimer">
        These check-ins are tools for self-reflection and trend awareness — not diagnostic tools. They do not determine whether you have a mental health condition.
      </p>
    </div>
  )
}

// ─── intro view ───────────────────────────────────────────────────────────────

function IntroView({ type, onStart, onBack }) {
  const isInitial = type === 'initial'
  const count     = isInitial ? 24 : 12
  const title     = isInitial ? 'Initial Assessment' : 'Weekly Check-In'
  const desc      = isInitial
    ? 'This one-time assessment establishes your personal baseline across six well-being dimensions. It takes about 6–8 minutes and uses scenario-based questions — no clinical language, no trick questions.'
    : 'This quick check-in tracks how you\'ve been doing this week. Aurora looks for changes over time so it can step in early when something shifts.'

  return (
    <div className="ci-intro">
      <div className="ci-intro-badge">{isInitial ? 'One-time' : 'Weekly'}</div>
      <h3 className="ci-intro-title">{title}</h3>
      <p className="ci-intro-desc">{desc}</p>

      <div className="ci-intro-stats">
        <div className="ci-stat">
          <div className="ci-stat-num">{count}</div>
          <div className="ci-stat-label">questions</div>
        </div>
        <div className="ci-stat">
          <div className="ci-stat-num">{isInitial ? '~7' : '~3'}</div>
          <div className="ci-stat-label">minutes</div>
        </div>
        <div className="ci-stat">
          <div className="ci-stat-num">6</div>
          <div className="ci-stat-label">dimensions</div>
        </div>
      </div>

      <p className="ci-intro-note">
        Answer based on how you've been feeling over the past 1–2 weeks, not just today. There are no right or wrong answers.
      </p>

      <div className="ci-intro-actions">
        <button className="ci-back-btn" onClick={onBack}>← Back</button>
        <button className="ci-start-big-btn" onClick={onStart}>Begin →</button>
      </div>
    </div>
  )
}

// ─── survey view ──────────────────────────────────────────────────────────────

const SCALE_LABELS = ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree']

function SurveyView({ questions, answers, setAnswers, onDone, onBack }) {
  const [idx, setIdx] = useState(0)
  const q        = questions[idx]
  const total    = questions.length
  const selected = answers[q.id]
  const cat      = CATEGORIES.find(c => c.id === q.cat)
  const pct      = ((idx) / total) * 100

  function pick(val) { setAnswers(prev => ({ ...prev, [q.id]: val })) }

  function next() {
    if (idx < total - 1) setIdx(i => i + 1)
    else onDone()
  }

  function back() {
    if (idx === 0) onBack()
    else setIdx(i => i - 1)
  }

  return (
    <div className="ci-survey">
      {/* progress */}
      <div className="ci-prog-bar">
        <div className="ci-prog-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="ci-prog-row">
        <span className="ci-prog-count">Question {idx + 1} of {total}</span>
      </div>

      {/* question */}
      <p className="ci-question-text">{q.text}</p>

      {/* 7-point scale */}
      <div className="ci-scale">
        <div className="ci-scale-btns">
          {[1, 2, 3, 4, 5, 6, 7].map(v => (
            <button
              key={v}
              className={`ci-scale-btn${selected === v ? ' ci-scale-btn--on' : ''}`}
              style={selected === v ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : {}}
              onClick={() => pick(v)}
              title={SCALE_LABELS[v - 1]}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="ci-scale-end-labels">
          <span>Strongly Disagree</span>
          <span>Neutral</span>
          <span>Strongly Agree</span>
        </div>
      </div>

      {/* nav */}
      <div className="ci-survey-nav">
        <button className="ci-back-btn" onClick={back}>← Back</button>
        <button
          className="ci-next-btn"
          onClick={next}
          disabled={selected == null}
          style={{ opacity: selected != null ? 1 : 0.4, cursor: selected != null ? 'pointer' : 'not-allowed' }}
        >
          {idx === total - 1 ? 'Submit' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

// ─── results view ─────────────────────────────────────────────────────────────

function ResultsView({ scores, prevScores, surveyType, onDone }) {
  const insight = generateInsight(scores, prevScores)
  const allGood = Object.values(scores).every(s => s <= 40)

  return (
    <div className="ci-results">
      <div className="ci-results-header">
        <h3 className="ci-results-title">Your results</h3>
        <p className="ci-results-sub">
          {surveyType === 'initial'
            ? 'This is your personal baseline. Future weekly check-ins will track how these scores shift over time.'
            : 'Scores shown alongside your previous check-in for comparison.'}
        </p>
      </div>

      <div className="ci-score-bars">
        {CATEGORIES.map(cat => (
          <div key={cat.id} className="ci-score-row">
            <span className="ci-score-cat">{cat.label}</span>
          </div>
        ))}
      </div>

      {/* insight */}
      <div className="ci-insight">
        <div className="ci-insight-icon" style={{ background: allGood ? '#3a6898' : '#d97706' }}>A</div>
        <div className="ci-insight-body">
          <strong className="ci-insight-label" style={{ color: allGood ? '#3a6898' : '#d97706' }}>Aurora</strong>
          <p className="ci-insight-text">{insight}</p>
        </div>
      </div>

      <button className="ci-done-btn" onClick={onDone}>Return to dashboard →</button>
    </div>
  )
}

// ─── root component ───────────────────────────────────────────────────────────

export default function CheckIns() {
  const [view,    setView]    = useState('hub')      // hub | intro | survey | results
  const [surveyType, setSurveyType] = useState('weekly')
  const [questions,  setQuestions]  = useState([])
  const [answers,    setAnswers]    = useState({})
  const [latestScores, setLatestScores] = useState(null)
  const [history,  setHistory]  = useState(MOCK_HISTORY)
  const [streak,   setStreak]   = useState(4)

  function startSurvey(type) {
    const lastEntry = history[history.length - 1]
    const lastQIds  = lastEntry?.qIds ?? []
    const qs        = buildSurvey(type, lastQIds)
    setSurveyType(type)
    setQuestions(qs)
    setAnswers({})
    setView('intro')
  }

  function beginAnswering() { setView('survey') }

  function onSurveyDone() {
    const scores = computeScores(answers, questions)
    const newEntry = {
      id: `w${history.length + 1}`,
      date: '2026-06-15',
      type: surveyType,
      qIds: questions.map(q => q.id),
      scores,
    }
    setHistory(prev => [...prev, newEntry])
    setLatestScores(scores)
    setStreak(s => s + 1)
    setView('results')
  }

  function onResultsDone() {
    setView('hub')
    setLatestScores(null)
  }

  const prevScores = history.length > 0 ? history[history.length - 1].scores : null

  return (
    <section className="page">
      <style>{CI_STYLES}</style>

      <header className="page-header">
        <h2>Check-Ins</h2>
        <p>Short, regular surveys that track your well-being across six dimensions so Aurora can support you proactively.</p>
      </header>

      {view === 'hub' && (
        <HubView
          history={history}
          streak={streak}
          onStart={startSurvey}
          onStartInitial={() => startSurvey('initial')}
        />
      )}

      {view === 'intro' && (
        <IntroView
          type={surveyType}
          onStart={beginAnswering}
          onBack={() => setView('hub')}
        />
      )}

      {view === 'survey' && (
        <SurveyView
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          onDone={onSurveyDone}
          onBack={() => setView('intro')}
        />
      )}

      {view === 'results' && (
        <ResultsView
          scores={latestScores}
          prevScores={prevScores}
          surveyType={surveyType}
          onDone={onResultsDone}
        />
      )}
    </section>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const CI_STYLES = `
  .ci-section-label {
    font-size: 0.72rem; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
    margin-bottom: 8px;
  }

  /* ── hub ── */
  .ci-hub { display: flex; flex-direction: column; gap: 18px; }

  .ci-top-row { display: grid; grid-template-columns: 160px 1fr; gap: 14px; align-items: start; }

  .ci-streak-card {
    background: linear-gradient(135deg, #4f7c3a, #3a5c29);
    color: #fff; border-radius: 20px; padding: 20px;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    box-shadow: 0 8px 24px rgba(79,124,58,0.28);
    text-align: center;
  }
  .ci-streak-num   { font-size: 3rem; font-weight: 900; line-height: 1; }
  .ci-streak-label { font-size: 0.82rem; font-weight: 700; opacity: 0.88; letter-spacing: 0.04em; }
  .ci-streak-sub   { font-size: 0.73rem; opacity: 0.6; margin-top: 4px; }

  .ci-due-card {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 20px; padding: 20px 22px;
    display: flex; flex-direction: column; gap: 10px;
    box-shadow: 0 6px 18px rgba(46,42,38,0.06);
  }
  .ci-due-card--due { border-color: rgba(79,124,58,0.28); background: rgba(214,234,204,0.4); }

  .ci-due-badge {
    display: inline-block; font-size: 0.7rem; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px; width: fit-content;
    background: var(--accent-soft); color: var(--accent);
  }
  .ci-due-badge--ok { background: rgba(148,163,184,0.15); color: var(--muted); }

  .ci-due-text { margin: 0; font-size: 0.88rem; color: var(--muted); line-height: 1.55; }

  .ci-start-btn {
    padding: 11px 22px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.92rem; font-weight: 700;
    align-self: flex-start; transition: opacity 140ms, transform 140ms;
  }
  .ci-start-btn:hover { opacity: 0.88; transform: translateY(-1px); }

  .ci-initial-link {
    border: none; background: transparent; color: var(--muted);
    font-size: 0.78rem; text-decoration: underline; padding: 0;
    cursor: pointer; align-self: flex-start; opacity: 0.7;
    transition: opacity 140ms;
  }
  .ci-initial-link:hover { opacity: 1; color: var(--accent); }

  /* last results */
  .ci-last-wrap {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 20px; padding: 18px 20px;
    box-shadow: 0 4px 14px rgba(46,42,38,0.06);
  }

  .ci-mini-bars { display: flex; flex-direction: column; gap: 10px; }
  .ci-mini-bar-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .ci-mini-label { font-size: 0.82rem; font-weight: 600; color: var(--ink); }
  .ci-mini-track { height: 8px; border-radius: 999px; background: rgba(46,42,38,0.08); overflow: hidden; }
  .ci-mini-fill  { height: 100%; border-radius: inherit; transition: width 600ms cubic-bezier(0.22,1,0.36,1); }
  .ci-mini-score { font-size: 0.82rem; font-weight: 700; text-align: right; }

  /* history */
  .ci-history-toggle {
    border: none; background: transparent; color: var(--muted);
    font-size: 0.84rem; font-weight: 600; cursor: pointer; padding: 4px 0;
    text-decoration: underline; align-self: flex-start;
    transition: color 140ms;
  }
  .ci-history-toggle:hover { color: var(--accent); }

  .ci-history {
    display: flex; flex-direction: column; gap: 8px;
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 16px; padding: 14px 16px;
    animation: fade-up 180ms ease;
  }
  .ci-history-row {
    display: flex; align-items: center; gap: 14px;
    padding: 8px 0; border-bottom: 1px solid var(--line);
  }
  .ci-history-row:last-child { border-bottom: none; padding-bottom: 0; }
  .ci-history-date { font-size: 0.82rem; font-weight: 700; color: var(--ink); min-width: 56px; }
  .ci-history-type { font-size: 0.76rem; color: var(--muted); min-width: 110px; }
  .ci-history-dots { display: flex; gap: 5px; }
  .ci-history-dot  { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }

  .ci-disclaimer {
    margin: 0; font-size: 0.76rem; color: var(--muted); line-height: 1.5;
    font-style: italic; opacity: 0.8;
    border-top: 1px solid var(--line); padding-top: 12px;
  }

  /* ── intro ── */
  .ci-intro {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 22px; padding: 28px;
    box-shadow: 0 8px 24px rgba(46,42,38,0.08);
    display: flex; flex-direction: column; gap: 16px;
    max-width: 580px;
    animation: fade-up 200ms ease;
  }
  .ci-intro-badge {
    display: inline-block; font-size: 0.68rem; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px; width: fit-content;
    background: var(--accent-soft); color: var(--accent);
  }
  .ci-intro-title { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; }
  .ci-intro-desc  { margin: 0; font-size: 0.92rem; color: var(--muted); line-height: 1.6; }

  .ci-intro-stats { display: flex; gap: 24px; }
  .ci-stat { text-align: center; }
  .ci-stat-num   { font-size: 1.8rem; font-weight: 900; color: var(--ink); line-height: 1; }
  .ci-stat-label { font-size: 0.75rem; color: var(--muted); margin-top: 3px; }

  .ci-intro-cats { display: flex; flex-wrap: wrap; gap: 8px; }
  .ci-cat-chip {
    font-size: 0.78rem; font-weight: 700; padding: 4px 12px; border-radius: 999px;
    border: 1px solid;
  }

  .ci-intro-note { margin: 0; font-size: 0.82rem; color: var(--muted); line-height: 1.55; font-style: italic; }

  .ci-intro-actions { display: flex; gap: 10px; align-items: center; margin-top: 4px; }
  .ci-back-btn {
    padding: 10px 20px; border-radius: 999px; border: 1.5px solid var(--line);
    background: transparent; color: var(--muted); font-size: 0.88rem; font-weight: 600;
    transition: border-color 140ms; cursor: pointer;
  }
  .ci-back-btn:hover { border-color: var(--accent); color: var(--accent); }
  .ci-start-big-btn {
    padding: 12px 28px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.95rem; font-weight: 700;
    transition: opacity 140ms, transform 140ms; cursor: pointer;
  }
  .ci-start-big-btn:hover { opacity: 0.88; transform: translateY(-1px); }

  /* ── survey ── */
  .ci-survey {
    max-width: 600px;
    display: flex; flex-direction: column; gap: 20px;
    animation: fade-up 180ms ease;
  }

  .ci-prog-bar { height: 6px; border-radius: 999px; background: rgba(46,42,38,0.08); overflow: hidden; }
  .ci-prog-fill { height: 100%; border-radius: inherit; background: var(--accent); transition: width 280ms ease; }
  .ci-prog-row { display: flex; align-items: center; justify-content: space-between; }
  .ci-prog-count { font-size: 0.78rem; color: var(--muted); font-weight: 600; }
  .ci-cat-tag {
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px; border: 1px solid;
  }

  .ci-question-text {
    margin: 0; font-size: 1.1rem; font-weight: 600;
    color: var(--ink); line-height: 1.5; letter-spacing: -0.01em;
  }

  .ci-scale { display: flex; flex-direction: column; gap: 8px; }
  .ci-scale-btns { display: flex; gap: 8px; }
  .ci-scale-btn {
    flex: 1; aspect-ratio: 1; border-radius: 12px;
    border: 1.5px solid var(--line); background: var(--panel-strong);
    font-size: 0.92rem; font-weight: 700; color: var(--ink);
    transition: transform 120ms, border-color 140ms, background 140ms, color 140ms;
    display: flex; align-items: center; justify-content: center;
  }
  .ci-scale-btn:hover { transform: scale(1.08); border-color: var(--accent); }
  .ci-scale-btn--on { box-shadow: 0 4px 14px rgba(0,0,0,0.14); transform: scale(1.06); }
  .ci-scale-end-labels {
    display: flex; justify-content: space-between;
    font-size: 0.73rem; color: var(--muted);
  }

  .ci-survey-nav { display: flex; gap: 10px; align-items: center; }
  .ci-next-btn {
    padding: 12px 28px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.92rem; font-weight: 700;
    transition: opacity 140ms, transform 140ms;
  }
  .ci-next-btn:not(:disabled):hover { opacity: 0.88; transform: translateY(-1px); }

  /* ── results ── */
  .ci-results { display: flex; flex-direction: column; gap: 20px; animation: fade-up 200ms ease; }
  .ci-results-header { }
  .ci-results-title { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; }
  .ci-results-sub   { margin: 6px 0 0; color: var(--muted); font-size: 0.88rem; }

  .ci-score-bars { display: flex; flex-direction: column; gap: 10px; }
  .ci-score-row  { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .ci-score-cat  { font-size: 0.88rem; font-weight: 700; }

  .ci-band-legend { display: flex; flex-wrap: wrap; gap: 12px; }
  .ci-band-item { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--muted); }
  .ci-band-dot  { width: 10px; height: 10px; border-radius: 50%; }

  .ci-insight {
    display: flex; gap: 12px; padding: 16px 18px;
    background: rgba(79,124,58,0.06); border: 1px solid rgba(79,124,58,0.18);
    border-radius: 16px; animation: fade-up 220ms ease;
  }
  .ci-insight-icon {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 900; font-size: 0.88rem; flex-shrink: 0;
  }
  .ci-insight-body { flex: 1; }
  .ci-insight-label { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 5px; }
  .ci-insight-text  { margin: 0; font-size: 0.9rem; line-height: 1.65; color: var(--ink); }

  .ci-done-btn {
    padding: 12px 28px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.92rem; font-weight: 700;
    align-self: flex-start; transition: opacity 140ms, transform 140ms; cursor: pointer;
  }
  .ci-done-btn:hover { opacity: 0.88; transform: translateY(-1px); }

  @media (max-width: 640px) {
    .ci-top-row { grid-template-columns: 1fr; }
    .ci-mini-bar-row { grid-template-columns: 90px 1fr 32px 18px; }
    .ci-scale-btns { gap: 5px; }
    .ci-scale-btn { border-radius: 9px; font-size: 0.84rem; }
  }
`
