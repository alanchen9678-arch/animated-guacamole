import { useState, useRef, useEffect, useCallback } from 'react'

// ─── mood config ───────────────────────────────────────────────────────────────

const MOODS = [
  { id: 'happy',   label: 'Happy',   color: '#fbbf24' },
  { id: 'calm',    label: 'Calm',    color: '#34d399' },
  { id: 'neutral', label: 'Neutral', color: '#6b7a8d' },
  { id: 'sad',     label: 'Sad',     color: '#60a5fa' },
  { id: 'anxious', label: 'Anxious', color: '#f87171' },
  { id: 'tired',   label: 'Tired',   color: '#7c5ea8' },
  { id: 'angry',   label: 'Angry',   color: '#fb923c' },
]
const MOOD_MAP = Object.fromEntries(MOODS.map(m => [m.id, m]))

// Pre-filled mood data for demo (past days of June 2026)
const MOCK_MOODS = {
  '2026-6-1':'calm','2026-6-2':'happy','2026-6-3':'neutral','2026-6-4':'sad',
  '2026-6-5':'anxious','2026-6-6':'calm','2026-6-7':'happy','2026-6-8':'happy',
  '2026-6-9':'tired','2026-6-10':'neutral','2026-6-11':'calm','2026-6-12':'happy',
  '2026-6-13':'anxious','2026-6-14':'calm',
}

// ─── AI analysis ───────────────────────────────────────────────────────────────

const CRISIS_TERMS  = ['suicide','kill myself','end my life','want to die','dont want to live']
const ALERT_TERMS   = ["don't care","dont care",'no appetite','lost interest','gave up','no motivation','worthless','hopeless',"can't go on",'no point']
const POSITIVE_TERMS = ['grateful','happiness','excited','great day','wonderful','proud','amazing','joyful','peaceful','content','love today']
const NEGATIVE_TERMS = ['sad','anxious','stressed','exhausted','overwhelmed','drained','crying','hopeless','lonely']

const AI_RESPONSES = {
  crisis: {
    tone: 'crisis',
    text: "I'm very concerned about what you've written. Please reach out for support right now — you don't have to face this alone. Call or text 988 (Suicide & Crisis Lifeline, available 24/7) or connect with a licensed therapist through Aurora's Therapist Match.",
  },
  alert: {
    tone: 'alert',
    text: "I noticed some patterns in your entry that I want to gently check in about. It's okay to not be okay — but if these feelings are persisting, speaking with a therapist might really help. Aurora's Therapist Match can connect you with someone suited to exactly what you're going through.",
  },
  positive: [
    "I love reading this. It sounds like you're building some real momentum — hold onto that feeling.",
    "This is wonderful. Remember what contributed to today, so you can come back to it when things feel harder.",
    "There's something genuinely grounding about a good day. Thank you for writing it down.",
  ],
  negative: [
    "It sounds like today was heavy. What you're feeling is real and valid — you don't have to minimize it.",
    "Some days just feel like that, and it's okay to let them. What's one small thing that brought even a moment of relief today?",
    "Thank you for writing this down instead of keeping it inside. That takes courage. I'm here.",
  ],
  neutral: [
    "Thank you for taking the time to reflect today. The act of writing — even about ordinary things — builds self-awareness over time.",
    "Every entry is a step toward understanding yourself better. Keep going, even on the quiet days.",
    "There's value in capturing a regular day. Patterns only become visible when you write them down.",
  ],
}

function analyzeEntry(text) {
  const lower = text.toLowerCase()
  if (CRISIS_TERMS.some(t => lower.includes(t))) return 'crisis'
  const alertCount = ALERT_TERMS.filter(t => lower.includes(t)).length
  if (alertCount >= 2) return 'alert'
  const posCount = POSITIVE_TERMS.filter(t => lower.includes(t)).length
  if (posCount >= 2) return 'positive'
  const negCount = NEGATIVE_TERMS.filter(t => lower.includes(t)).length
  if (negCount >= 1) return 'negative'
  return 'neutral'
}

function pickResponse(tone) {
  const pool = AI_RESPONSES[tone]
  if (typeof pool === 'object' && !Array.isArray(pool)) return pool
  return { tone, text: pool[Math.floor(Math.random() * pool.length)] }
}

// ─── calendar ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function Calendar({ moodData, setMoodData }) {
  const now     = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(null)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDay    = new Date(year, month, 1).getDay()
  const isCurrent   = year === now.getFullYear() && month === now.getMonth()

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  function dayKey(d) { return `${year}-${month + 1}-${d}` }

  function clickDay(d) {
    const k = dayKey(d)
    setSelected(prev => prev === k ? null : k)
  }

  function setMood(moodId) {
    if (!selected) return
    setMoodData(prev => ({ ...prev, [selected]: moodId }))
  }

  function clearMood() {
    if (!selected) return
    setMoodData(prev => { const n = { ...prev }; delete n[selected]; return n })
    setSelected(null)
  }

  const cells = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedMood = selected && moodData[selected]
  const selectedLabel = selected
    ? `${MONTH_NAMES[month]} ${parseInt(selected.split('-')[2])}, ${year}`
    : null

  return (
    <div className="jn-cal-wrap">
      <div className="jn-cal-nav">
        <button className="jn-cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="jn-cal-month-label">{MONTH_NAMES[month]} {year}</span>
        <button className="jn-cal-nav-btn" onClick={nextMonth}>›</button>
      </div>

      <div className="jn-cal-daynames">
        {DAY_NAMES.map(d => <div key={d} className="jn-cal-dn">{d}</div>)}
      </div>

      <div className="jn-cal-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const k = dayKey(day)
          const mood = moodData[k]
          const isToday = isCurrent && day === now.getDate()
          const isSel   = selected === k
          const isFuture = isCurrent && day > now.getDate()
          return (
            <button
              key={k}
              className={`jn-cal-day${isToday ? ' jn-cal-day--today' : ''}${isSel ? ' jn-cal-day--sel' : ''}${isFuture ? ' jn-cal-day--future' : ''}`}
              style={mood ? { background: MOOD_MAP[mood]?.color, color: '#fff', borderColor: MOOD_MAP[mood]?.color } : {}}
              onClick={() => !isFuture && clickDay(day)}
              disabled={isFuture}
              title={mood ? `${MOOD_MAP[mood]?.label}` : 'No mood logged'}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* mood legend */}
      <div className="jn-mood-legend">
        {MOODS.map(m => (
          <div key={m.id} className="jn-legend-item">
            <div className="jn-legend-dot" style={{ background: m.color }} />
            <span>{m.label}</span>
          </div>
        ))}
      </div>

      {/* mood picker panel */}
      {selected && (
        <div className="jn-mood-picker">
          <p className="jn-picker-label">
            {selectedLabel} — {selectedMood ? `Logged: ${MOOD_MAP[selectedMood]?.label}` : 'How did you feel?'}
          </p>
          <div className="jn-mood-options">
            {MOODS.map(m => (
              <button
                key={m.id}
                className={`jn-mood-opt${selectedMood === m.id ? ' jn-mood-opt--active' : ''}`}
                style={{ '--mc': m.color }}
                onClick={() => setMood(m.id)}
              >
                <div className="jn-mood-circle" style={{ background: m.color }} />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
          {selectedMood && (
            <button className="jn-clear-mood" onClick={clearMood}>Clear mood</button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── doodle canvas ────────────────────────────────────────────────────────────

const PRESET_COLORS = ['#2e2a26','#dc2626','#4f7c3a','#d97706','#3a6898','#be185d','#1d4ed8','#15803d','#f97316','#ec4899']
const BRUSH_SIZES   = [2, 4, 8, 16]

function DoodleCanvas({ bgColor }) {
  const canvasRef   = useRef(null)
  const drawing     = useRef(false)
  const lastPos     = useRef(null)
  const [brushColor, setBrushColor] = useState('#2e2a26')
  const [brushSize, setBrushSize]   = useState(3)
  const [eraser, setEraser]         = useState(false)

  const fill = bgColor || '#fffbf0'

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  function getXY(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const sx = canvasRef.current.width / rect.width
    const sy = canvasRef.current.height / rect.height
    const src = e.touches ? e.touches[0] : e
    return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy }
  }

  function onStart(e) { e.preventDefault(); drawing.current = true; lastPos.current = getXY(e) }
  function onMove(e) {
    e.preventDefault()
    if (!drawing.current) return
    const pos = getXY(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = eraser ? fill : brushColor
    ctx.lineWidth = eraser ? brushSize * 5 : brushSize
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }
  function onEnd() { drawing.current = false; lastPos.current = null }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="jn-doodle-wrap">
      <div className="jn-doodle-toolbar">
        <div className="jn-color-row">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              className={`jn-swatch${brushColor === c && !eraser ? ' jn-swatch--active' : ''}`}
              style={{ background: c }}
              onClick={() => { setBrushColor(c); setEraser(false) }}
              aria-label={c}
            />
          ))}
          <input
            type="color" value={brushColor}
            onChange={e => { setBrushColor(e.target.value); setEraser(false) }}
            className="jn-color-input" title="Custom color"
          />
        </div>
        <div className="jn-toolbar-right">
          <div className="jn-size-row">
            {BRUSH_SIZES.map(s => (
              <button
                key={s}
                className={`jn-size-btn${brushSize === s ? ' jn-size-btn--active' : ''}`}
                onClick={() => setBrushSize(s)}
              >
                <div style={{ width: Math.min(s * 1.5, 16), height: Math.min(s * 1.5, 16), borderRadius: '50%', background: 'currentColor', margin: 'auto' }} />
              </button>
            ))}
          </div>
          <button className={`jn-tool-btn${eraser ? ' jn-tool-btn--active' : ''}`} onClick={() => setEraser(v => !v)}>Eraser</button>
          <button className="jn-tool-btn" onClick={clear}>Clear</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="jn-canvas"
        width={800} height={220}
        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        style={{ touchAction: 'none', cursor: eraser ? 'cell' : 'crosshair' }}
      />
    </div>
  )
}

// ─── root journal ─────────────────────────────────────────────────────────────

export default function Journal() {
  const [moodData, setMoodData]     = useState(MOCK_MOODS)
  const [innerColor, setInnerColor] = useState('#fffbf0')
  const [marginColor, setMarginColor] = useState('#9a6b2a')
  const [entryText, setEntryText]   = useState('')
  const [tab, setTab]               = useState('write')   // write | doodle
  const [aiResponse, setAiResponse] = useState(null)
  const [submitted, setSubmitted]   = useState(false)

  function submit() {
    if (!entryText.trim()) return
    const tone = analyzeEntry(entryText)
    setAiResponse(pickResponse(tone))
    setSubmitted(true)
  }

  function newEntry() {
    setEntryText(''); setAiResponse(null); setSubmitted(false)
  }

  const TONE_STYLE = {
    crisis:   { bg: 'rgba(220,38,38,0.06)',   border: 'rgba(220,38,38,0.22)',  icon: '!', ic: '#dc2626' },
    alert:    { bg: 'rgba(217,119,6,0.06)',   border: 'rgba(217,119,6,0.22)',  icon: '!', ic: '#d97706' },
    positive: { bg: 'rgba(22,163,74,0.06)',   border: 'rgba(22,163,74,0.2)',   icon: 'A', ic: '#4f7c3a' },
    negative: { bg: 'rgba(58,104,152,0.07)',  border: 'rgba(58,104,152,0.22)', icon: 'A', ic: '#3a6898' },
    neutral:  { bg: 'rgba(46,42,38,0.04)',  border: 'rgba(46,42,38,0.12)', icon: 'A', ic: '#6b6460' },
  }

  return (
    <section className="page">
      <style>{JN_STYLES}</style>

      <header className="page-header">
        <h2>Thought Journal</h2>
        <p>Track your mood, write freely, and doodle. Aurora reflects back when you're ready.</p>
      </header>

      {/* ── mood calendar ── */}
      <div className="jn-section-label">Mood calendar</div>
      <Calendar moodData={moodData} setMoodData={setMoodData} />

      {/* ── journal editor ── */}
      <div className="jn-section-label" style={{ marginTop: 8 }}>Today's entry</div>

      <div className="jn-color-controls">
        <label className="jn-color-ctrl">
          <span>Page color</span>
          <div className="jn-color-ctrl-row">
            <input type="color" value={innerColor} onChange={e => setInnerColor(e.target.value)} className="jn-page-color-input" />
            <div className="jn-color-preview" style={{ background: innerColor }} />
          </div>
        </label>
        <label className="jn-color-ctrl">
          <span>Margin color</span>
          <div className="jn-color-ctrl-row">
            <input type="color" value={marginColor} onChange={e => setMarginColor(e.target.value)} className="jn-page-color-input" />
            <div className="jn-color-preview" style={{ background: marginColor }} />
          </div>
        </label>
        <div className="jn-tab-toggle">
          <button className={`jn-tab-btn${tab === 'write' ? ' jn-tab-btn--on' : ''}`} onClick={() => setTab('write')}>Write</button>
          <button className={`jn-tab-btn${tab === 'doodle' ? ' jn-tab-btn--on' : ''}`} onClick={() => setTab('doodle')}>Doodle</button>
        </div>
      </div>

      {tab === 'write' && (
        <div className="jn-notebook" style={{ background: innerColor }}>
          <div className="jn-margin" style={{ background: marginColor }} />
          <div
            className="jn-lines-overlay"
            style={{ backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, rgba(0,0,0,0.09) 31px, rgba(0,0,0,0.09) 32px)` }}
          />
          <textarea
            className="jn-textarea"
            placeholder="Write anything — your thoughts, feelings, what happened today, what you're looking forward to…"
            value={entryText}
            onChange={e => setEntryText(e.target.value)}
            disabled={submitted}
          />
        </div>
      )}

      {tab === 'doodle' && (
        <div className="jn-doodle-section">
          <p className="jn-doodle-note">
            Doodling lowers cortisol and helps regulate emotions. No skill needed — just express.
          </p>
          <DoodleCanvas bgColor={innerColor} />
        </div>
      )}

      {!submitted ? (
        <button
          className="jn-submit-btn"
          onClick={submit}
          disabled={!entryText.trim()}
          style={{ opacity: entryText.trim() ? 1 : 0.45, cursor: entryText.trim() ? 'pointer' : 'not-allowed' }}
        >
          Submit entry →
        </button>
      ) : (
        <button className="jn-new-btn" onClick={newEntry}>Start new entry</button>
      )}

      {/* ── AI response ── */}
      {aiResponse && (
        <div
          className="jn-ai-response"
          style={{
            background: TONE_STYLE[aiResponse.tone]?.bg,
            borderColor: TONE_STYLE[aiResponse.tone]?.border,
          }}
        >
          <div className="jn-ai-avatar" style={{ background: TONE_STYLE[aiResponse.tone]?.ic }}>
            {TONE_STYLE[aiResponse.tone]?.icon === 'A' ? 'A' : '!'}
          </div>
          <div className="jn-ai-body">
            <strong className="jn-ai-label" style={{ color: TONE_STYLE[aiResponse.tone]?.ic }}>Aurora</strong>
            <p className="jn-ai-text">{aiResponse.text}</p>
            {(aiResponse.tone === 'crisis' || aiResponse.tone === 'alert') && (
              <div className="jn-ai-links">
                <span>988 Suicide &amp; Crisis Lifeline — call or text <strong>988</strong></span>
                <span className="jn-ai-sep">·</span>
                <span>Or visit <strong>Therapist Match</strong> in the sidebar</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const JN_STYLES = `
  .jn-section-label {
    font-size: 0.74rem; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
    margin-bottom: 10px;
  }

  /* calendar */
  .jn-cal-wrap {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 20px; padding: 20px;
    box-shadow: 0 6px 18px rgba(46,42,38,0.06);
  }
  .jn-cal-nav {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }
  .jn-cal-nav-btn {
    width: 34px; height: 34px; border-radius: 50%;
    border: 1.5px solid var(--line); background: transparent;
    font-size: 1.1rem; color: var(--ink);
    display: flex; align-items: center; justify-content: center;
    transition: background 140ms, border-color 140ms;
  }
  .jn-cal-nav-btn:hover { background: var(--accent-soft); border-color: var(--accent); }
  .jn-cal-month-label { font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; }

  .jn-cal-daynames {
    display: grid; grid-template-columns: repeat(7,1fr);
    margin-bottom: 6px;
  }
  .jn-cal-dn {
    text-align: center; font-size: 0.72rem; font-weight: 700;
    color: var(--muted); padding: 4px 0;
    text-transform: uppercase; letter-spacing: 0.06em;
  }

  .jn-cal-grid {
    display: grid; grid-template-columns: repeat(7,1fr); gap: 4px;
  }
  .jn-cal-day {
    aspect-ratio: 1; border-radius: 10px;
    border: 1.5px solid var(--line); background: rgba(255,255,255,0.6);
    font-size: 0.82rem; font-weight: 600; color: var(--ink);
    display: flex; align-items: center; justify-content: center;
    transition: transform 120ms, box-shadow 120ms, border-color 120ms;
  }
  .jn-cal-day:not(:disabled):hover { transform: scale(1.08); box-shadow: 0 4px 12px rgba(46,42,38,0.14); }
  .jn-cal-day--today { border-color: var(--accent); border-width: 2px; box-shadow: 0 0 0 2px rgba(79,124,58,0.15); }
  .jn-cal-day--sel   { outline: 2.5px solid var(--ink); outline-offset: 2px; }
  .jn-cal-day--future { opacity: 0.3; }

  /* mood legend */
  .jn-mood-legend {
    display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px;
    padding-top: 12px; border-top: 1px solid var(--line);
  }
  .jn-legend-item { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--muted); }
  .jn-legend-dot { width: 10px; height: 10px; border-radius: 50%; }

  /* mood picker */
  .jn-mood-picker {
    margin-top: 14px; padding: 16px; border-radius: 16px;
    background: rgba(214,234,204,0.3); border: 1px solid rgba(79,124,58,0.16);
    animation: fade-up 180ms ease;
  }
  .jn-picker-label { margin: 0 0 12px; font-size: 0.82rem; font-weight: 600; color: var(--ink); }
  .jn-mood-options { display: flex; flex-wrap: wrap; gap: 8px; }
  .jn-mood-opt {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 14px; border-radius: 999px;
    border: 1.5px solid var(--line); background: var(--panel-strong);
    font-size: 0.84rem; font-weight: 600; color: var(--ink);
    transition: border-color 140ms, background 140ms;
  }
  .jn-mood-opt:hover { border-color: var(--mc); }
  .jn-mood-opt--active { border-color: var(--mc); background: color-mix(in srgb, var(--mc) 12%, white); }
  .jn-mood-circle { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .jn-clear-mood {
    margin-top: 10px; padding: 6px 14px; border-radius: 999px;
    border: 1.5px solid var(--line); background: transparent;
    font-size: 0.78rem; color: var(--muted); transition: border-color 140ms;
  }
  .jn-clear-mood:hover { border-color: var(--accent); color: var(--accent); }

  /* color controls */
  .jn-color-controls {
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .jn-color-ctrl { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: 600; color: var(--muted); }
  .jn-color-ctrl-row { display: flex; align-items: center; gap: 8px; }
  .jn-page-color-input { width: 36px; height: 28px; border-radius: 6px; border: 1px solid var(--line); padding: 2px; cursor: pointer; }
  .jn-color-preview { width: 36px; height: 28px; border-radius: 6px; border: 1px solid var(--line); }
  .jn-tab-toggle { display: flex; gap: 4px; background: rgba(255,255,255,0.6); border: 1px solid var(--line); border-radius: 12px; padding: 3px; margin-left: auto; }
  .jn-tab-btn { padding: 6px 18px; border-radius: 9px; border: none; background: transparent; font-size: 0.86rem; font-weight: 600; color: var(--muted); transition: background 140ms, color 140ms; }
  .jn-tab-btn--on { background: var(--panel-strong); color: var(--ink); box-shadow: 0 2px 6px rgba(46,42,38,0.08); }

  /* notebook */
  .jn-notebook {
    position: relative; display: flex;
    border-radius: 18px; overflow: hidden;
    border: 1.5px solid var(--line);
    box-shadow: 0 8px 24px rgba(46,42,38,0.10);
    min-height: 260px;
  }
  .jn-margin { width: 56px; flex-shrink: 0; border-right: 2px solid rgba(0,0,0,0.12); }
  .jn-lines-overlay {
    position: absolute; inset: 0; left: 58px; pointer-events: none;
    background-size: 100% 32px; background-position: 0 8px;
  }
  .jn-textarea {
    flex: 1; resize: none; border: none; background: transparent;
    padding: 10px 18px; font-size: 0.94rem; line-height: 32px;
    color: var(--ink); outline: none; min-height: 260px;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }
  .jn-textarea:disabled { opacity: 0.7; }
  .jn-textarea::placeholder { color: rgba(46,42,38,0.3); }

  /* doodle */
  .jn-doodle-section { display: flex; flex-direction: column; gap: 8px; }
  .jn-doodle-note { margin: 0; font-size: 0.82rem; color: var(--muted); font-style: italic; }
  .jn-doodle-wrap {
    border: 1.5px solid var(--line); border-radius: 18px; overflow: hidden;
    box-shadow: 0 8px 24px rgba(46,42,38,0.10);
  }
  .jn-doodle-toolbar {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    padding: 10px 14px; background: rgba(255,255,255,0.9); border-bottom: 1px solid var(--line);
  }
  .jn-color-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .jn-swatch {
    width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent;
    transition: transform 120ms, border-color 120ms;
  }
  .jn-swatch:hover { transform: scale(1.2); }
  .jn-swatch--active { border-color: var(--ink); transform: scale(1.15); }
  .jn-color-input { width: 28px; height: 22px; border-radius: 5px; border: 1.5px solid var(--line); padding: 1px; cursor: pointer; }
  .jn-toolbar-right { display: flex; align-items: center; gap: 6px; margin-left: auto; }
  .jn-size-row { display: flex; align-items: center; gap: 4px; }
  .jn-size-btn { width: 30px; height: 30px; border-radius: 8px; border: 1.5px solid var(--line); background: transparent; display: flex; align-items: center; justify-content: center; transition: border-color 120ms, background 120ms; }
  .jn-size-btn--active { border-color: var(--accent); background: var(--accent-soft); }
  .jn-tool-btn { padding: 6px 12px; border-radius: 8px; border: 1.5px solid var(--line); background: transparent; font-size: 0.8rem; font-weight: 600; color: var(--muted); transition: border-color 120ms, color 120ms; }
  .jn-tool-btn--active { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
  .jn-tool-btn:last-child:hover { border-color: #dc2626; color: #dc2626; }
  .jn-canvas { display: block; width: 100%; height: 220px; }

  /* submit */
  .jn-submit-btn {
    margin-top: 4px; padding: 12px 28px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.95rem; font-weight: 700;
    transition: opacity 140ms, transform 140ms; align-self: flex-start;
  }
  .jn-submit-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .jn-new-btn {
    margin-top: 4px; padding: 11px 26px; border-radius: 999px;
    border: 1.5px solid var(--line); background: transparent;
    font-size: 0.92rem; font-weight: 600; color: var(--muted);
    transition: border-color 140ms, color 140ms;
  }
  .jn-new-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* AI response */
  .jn-ai-response {
    display: flex; gap: 14px; padding: 18px 20px;
    border: 1px solid; border-radius: 18px;
    animation: fade-up 220ms ease;
  }
  .jn-ai-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 900; font-size: 0.88rem; flex-shrink: 0;
  }
  .jn-ai-body { flex: 1; }
  .jn-ai-label { display: block; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }
  .jn-ai-text  { margin: 0 0 10px; font-size: 0.92rem; line-height: 1.65; color: var(--ink); }
  .jn-ai-links { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 0.82rem; color: var(--muted); }
  .jn-ai-sep   { opacity: 0.4; }

  @media (max-width: 640px) {
    .jn-cal-day { font-size: 0.72rem; border-radius: 8px; }
    .jn-color-controls { flex-direction: column; align-items: flex-start; }
    .jn-tab-toggle { margin-left: 0; }
    .jn-mood-options { gap: 6px; }
    .jn-doodle-toolbar { flex-direction: column; align-items: flex-start; }
    .jn-toolbar-right { margin-left: 0; }
  }
`
