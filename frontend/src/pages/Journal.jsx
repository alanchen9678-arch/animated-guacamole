import { useState, useRef, useEffect } from 'react'
import { ColorSwatchPicker } from '../components/ui/heroui-color-swatch-picker.jsx'
import ColorPickerMenu from '../components/ui/color-picker-menu.jsx'
import { useUser } from '../context/UserContext.jsx'
import { fetchJournalEntries, saveJournalEntry } from '../services/api.js'

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

const MOCK_MOODS = {}

const MOCK_ENTRIES = {}

// ─── AI analysis ───────────────────────────────────────────────────────────────

const JOURNAL_ENTRIES_STORAGE_KEY = 'aurora.journal.entries'
const JOURNAL_MOODS_STORAGE_KEY = 'aurora.journal.moods'

function normalizeDateKey(key) {
  const [year, month, day] = String(key).split('-').map(Number)
  if (!year || !month || !day) return key
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalizeDateMapKeys(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [normalizeDateKey(key), value]),
  )
}

function loadJournalEntries() {
  try {
    const stored = window.localStorage.getItem(JOURNAL_ENTRIES_STORAGE_KEY)
    if (!stored) return MOCK_ENTRIES

    const parsed = JSON.parse(stored)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...MOCK_ENTRIES, ...normalizeDateMapKeys(parsed) }
    }
  } catch {
    return MOCK_ENTRIES
  }

  return MOCK_ENTRIES
}

function saveJournalEntries(entries) {
  try {
    window.localStorage.setItem(JOURNAL_ENTRIES_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage can be unavailable in some private browsing modes.
  }
}

function mergeJournalEntries(localEntries, backendEntries) {
  const merged = { ...localEntries }
  for (const entry of backendEntries) {
    merged[entry.date] = {
      ...merged[entry.date],
      text: entry.text,
    }
  }
  return merged
}

function mergeJournalMoods(localMoods, backendEntries) {
  const merged = { ...localMoods }
  for (const entry of backendEntries) {
    if (entry.mood) merged[entry.date] = entry.mood
  }
  return merged
}

function loadJournalMoods() {
  try {
    const stored = window.localStorage.getItem(JOURNAL_MOODS_STORAGE_KEY)
    if (!stored) return MOCK_MOODS

    const parsed = JSON.parse(stored)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...MOCK_MOODS, ...normalizeDateMapKeys(parsed) }
    }
  } catch {
    return MOCK_MOODS
  }

  return MOCK_MOODS
}

function saveJournalMoods(moods) {
  try {
    window.localStorage.setItem(JOURNAL_MOODS_STORAGE_KEY, JSON.stringify(moods))
  } catch {
    // Storage can be unavailable in some private browsing modes.
  }
}

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

function findMoodByColor(color) {
  const normalized = color.toUpperCase()
  return MOODS.find((mood) => mood.color.toUpperCase() === normalized) ?? null
}

// ─── calendar ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function makeDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function makeDayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`
}

function isFutureDay(year, month, day, now) {
  const candidate = new Date(year, month, day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return candidate > today
}

function Calendar({ moodData, entryHistory, selectedDate, onSelectDate, onOpenEntry }) {
  const now     = new Date()
  const monthPickerRef = useRef(null)
  const yearPickerRef = useRef(null)
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [monthMenuOpen, setMonthMenuOpen] = useState(false)
  const [yearMenuOpen, setYearMenuOpen] = useState(false)
  const dataYears = [
    ...Object.keys(moodData).map((key) => Number(key.split('-')[0])),
    ...Object.keys(entryHistory).map((key) => Number(key.split('-')[0])),
    selectedDate ? Number(selectedDate.split('-')[0]) : null,
    now.getFullYear(),
  ].filter(Boolean)
  const baseYear = Math.max(now.getFullYear(), ...dataYears)
  const yearOptions = Array.from({ length: 5 }, (_, index) => baseYear - index)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDay    = new Date(year, month, 1).getDay()
  const isCurrent   = year === now.getFullYear() && month === now.getMonth()

  useEffect(() => {
    function closeMenus() {
      setMonthMenuOpen(false)
      setYearMenuOpen(false)
    }

    function handlePointerDown(event) {
      if (
        monthPickerRef.current?.contains(event.target) ||
        yearPickerRef.current?.contains(event.target)
      ) {
        return
      }
      closeMenus()
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') closeMenus()
    }

    document.addEventListener('mousedown', handlePointerDown, true)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const cells = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedMood = selectedDate && moodData[selectedDate]
  const selectedEntry = selectedDate && entryHistory[selectedDate]

  return (
    <div className="jn-cal-wrap">
      <div className="jn-cal-nav">
        <button className="jn-cal-nav-btn" onClick={prevMonth} aria-label="Previous month">&lt;</button>
        <div className="jn-cal-selects">
          <div ref={monthPickerRef} className="jn-cal-picker">
            <button
              type="button"
              className="jn-cal-picker-btn"
              onClick={(e) => {
                e.stopPropagation()
                setMonthMenuOpen((open) => !open)
                setYearMenuOpen(false)
              }}
              aria-label="Choose month"
              aria-expanded={monthMenuOpen}
            >
              {MONTH_NAMES[month]}
            </button>
            {monthMenuOpen && (
              <div className="jn-cal-menu jn-cal-menu--months" onClick={(e) => e.stopPropagation()}>
                {MONTH_NAMES.map((monthName, monthIndex) => (
                  <button
                    key={monthName}
                    type="button"
                    className={`jn-cal-menu-item${monthIndex === month ? ' jn-cal-menu-item--active' : ''}`}
                    onClick={() => {
                      setMonth(monthIndex)
                      setMonthMenuOpen(false)
                    }}
                  >
                    {monthName}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div ref={yearPickerRef} className="jn-cal-picker">
            <button
              type="button"
              className="jn-cal-picker-btn jn-cal-picker-btn--year"
              onClick={(e) => {
                e.stopPropagation()
                setYearMenuOpen((open) => !open)
                setMonthMenuOpen(false)
              }}
              aria-label="Choose year"
              aria-expanded={yearMenuOpen}
            >
              {year}
            </button>
            {yearMenuOpen && (
              <div className="jn-cal-menu jn-cal-menu--years" onClick={(e) => e.stopPropagation()}>
                {yearOptions.map((optionYear) => (
                  <button
                    key={optionYear}
                    type="button"
                    className={`jn-cal-menu-item${optionYear === year ? ' jn-cal-menu-item--active' : ''}`}
                    onClick={() => {
                      setYear(optionYear)
                      setYearMenuOpen(false)
                    }}
                  >
                    {optionYear}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button className="jn-cal-nav-btn" onClick={nextMonth} aria-label="Next month">&gt;</button>
      </div>

      <div className="jn-cal-daynames">
        {DAY_NAMES.map(d => <div key={d} className="jn-cal-dn">{d}</div>)}
      </div>

      <div className="jn-cal-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const k = makeDayKey(year, month, day)
          const mood = moodData[k]
          const isToday = isCurrent && day === now.getDate()
          const isSel   = selectedDate === k
          const isFuture = isFutureDay(year, month, day, now)
          return (
            <button
              key={k}
              className={`jn-cal-day${isToday ? ' jn-cal-day--today' : ''}${isSel ? ' jn-cal-day--sel' : ''}${isFuture ? ' jn-cal-day--future' : ''}`}
              style={mood ? { background: MOOD_MAP[mood]?.color, color: '#fff', borderColor: MOOD_MAP[mood]?.color } : {}}
              onClick={() => !isFuture && onSelectDate(k)}
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

      {selectedDate && (
        <div className="jn-history-preview">
          <div className="jn-history-meta">
            <span>{formatDateKey(selectedDate)}</span>
            <strong>{selectedMood ? MOOD_MAP[selectedMood]?.label : 'No mood logged'}</strong>
          </div>
          {(selectedEntry?.text || selectedEntry?.doodleData) ? (
            <button className="jn-history-open" onClick={() => onOpenEntry(selectedDate)}>
              {selectedEntry?.text && <p>{selectedEntry.text}</p>}
              {selectedEntry?.doodleData && (
                <img className="jn-history-doodle" src={selectedEntry.doodleData} alt="Saved doodle" />
              )}
            </button>
          ) : (
            <p>No journal entry saved for this day.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── doodle canvas ────────────────────────────────────────────────────────────

const JOURNAL_PAGE_COLOR = '#fffbf0'
const PRESET_COLORS = ['#dc2626','#f97316','#fbbf24','#16a34a','#2563eb','#7c3aed','#111827']
const BRUSH_SIZES   = [2, 4, 8, 16]

function DoodleCanvas({ bgColor, value, onChange, disabled = false }) {
  const canvasRef   = useRef(null)
  const drawing     = useRef(false)
  const lastPos     = useRef(null)
  const currentSnapshot = useRef(value ?? null)
  const [brushColor, setBrushColor] = useState('#111827')
  const [brushSize, setBrushSize]   = useState(3)
  const [eraser, setEraser]         = useState(false)
  const [undoStack, setUndoStack]   = useState([])

  const fill = bgColor || '#fffbf0'

  useEffect(() => {
    currentSnapshot.current = value ?? null
    drawSnapshot(value ?? null)
  }, [value, fill])

  function fillCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  function drawSnapshot(snapshot) {
    const canvas = canvasRef.current
    if (!canvas) return

    fillCanvas()
    if (!snapshot) return

    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    img.src = snapshot
  }

  function captureSnapshot() {
    return canvasRef.current?.toDataURL('image/png') ?? null
  }

  function commitSnapshot(snapshot) {
    currentSnapshot.current = snapshot
    onChange(snapshot)
  }

  function pushUndoState() {
    setUndoStack(prev => [...prev.slice(-19), currentSnapshot.current])
  }

  function restoreSnapshot(snapshot) {
    drawSnapshot(snapshot)
    commitSnapshot(snapshot)
  }

  function getXY(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const sx = canvasRef.current.width / rect.width
    const sy = canvasRef.current.height / rect.height
    const src = e.touches ? e.touches[0] : e
    return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy }
  }

  function onStart(e) {
    if (disabled) return
    e.preventDefault()
    pushUndoState()
    drawing.current = true
    lastPos.current = getXY(e)
  }

  function onMove(e) {
    if (disabled) return
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

  function onEnd() {
    if (!drawing.current) return
    drawing.current = false
    lastPos.current = null
    commitSnapshot(captureSnapshot())
  }

  function clear() {
    if (disabled) return
    pushUndoState()
    drawSnapshot(null)
    commitSnapshot(null)
  }

  function undo() {
    if (disabled || !undoStack.length) return
    const next = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    restoreSnapshot(next)
  }

  return (
    <div className="jn-doodle-wrap">
      <div className="jn-doodle-toolbar">
        <div className="jn-color-row">
          <ColorSwatchPicker
            value={brushColor}
            onChange={(color) => {
              setBrushColor(color.toString('hex'))
              setEraser(false)
            }}
            size="sm"
            aria-label="Notebook brush color"
          >
            {PRESET_COLORS.map((color) => (
              <ColorSwatchPicker.Item
                key={color}
                color={color}
                isDisabled={disabled}
                aria-label={`Brush color ${color}`}
              >
                <ColorSwatchPicker.Swatch />
                <ColorSwatchPicker.Indicator />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
          <ColorPickerMenu
            color={brushColor}
            onChange={(nextColor) => {
              setBrushColor(nextColor)
              setEraser(false)
            }}
            disabled={disabled}
            presetColors={PRESET_COLORS}
            ariaLabel="Open custom brush color picker"
          />
        </div>
        <div className="jn-toolbar-right">
          <div className="jn-size-row">
            {BRUSH_SIZES.map(s => (
              <button
                key={s}
                className={`jn-size-btn${brushSize === s ? ' jn-size-btn--active' : ''}`}
                onClick={() => setBrushSize(s)}
                disabled={disabled}
              >
                <div style={{ width: Math.min(s * 1.5, 16), height: Math.min(s * 1.5, 16), borderRadius: '50%', background: 'currentColor', margin: 'auto' }} />
              </button>
            ))}
          </div>
          <button className="jn-tool-btn" onClick={undo} disabled={disabled || !undoStack.length}>Undo</button>
          <button className={`jn-tool-btn${eraser ? ' jn-tool-btn--active' : ''}`} onClick={() => setEraser(v => !v)} disabled={disabled}>Eraser</button>
          <button className="jn-tool-btn jn-tool-btn--danger" onClick={clear} disabled={disabled || !value}>Clear</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="jn-canvas"
        width={800} height={220}
        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        style={{ touchAction: 'none', cursor: disabled ? 'not-allowed' : eraser ? 'cell' : 'crosshair' }}
      />
    </div>
  )
}

// ─── root journal ─────────────────────────────────────────────────────────────

export default function Journal() {
  const { token, loading: userLoading } = useUser()
  const todayKey = makeDateKey(new Date())
  const [initialJournalState] = useState(() => {
    const entryHistory = loadJournalEntries()
    const savedToday = entryHistory[todayKey]
    return { entryHistory, savedToday }
  })
  const [moodData, setMoodData]     = useState(loadJournalMoods)
  const [entryHistory, setEntryHistory] = useState(initialJournalState.entryHistory)
  const [entryText, setEntryText]   = useState(() => initialJournalState.savedToday?.text ?? '')
  const [doodleData, setDoodleData] = useState(() => initialJournalState.savedToday?.doodleData ?? null)
  const [tab, setTab]               = useState('write')   // write | doodle
  const [submitted, setSubmitted]   = useState(() => Boolean(
    initialJournalState.savedToday?.text || initialJournalState.savedToday?.doodleData,
  ))
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(todayKey)
  const [expandedEntryDate, setExpandedEntryDate] = useState(null)
  const [saveError, setSaveError] = useState('')

  const todayMood = moodData[todayKey]
  const marginColor = todayMood ? MOOD_MAP[todayMood]?.color : '#ffffff'
  const hasEntryContent = Boolean(entryText.trim() || doodleData)
  const expandedEntry = expandedEntryDate ? entryHistory[expandedEntryDate] : null
  const expandedMood = expandedEntryDate ? moodData[expandedEntryDate] : null

  useEffect(() => {
    if (!calendarOpen && !expandedEntryDate) return

    function handleKeyDown(e) {
      if (e.key !== 'Escape') return
      if (expandedEntryDate) setExpandedEntryDate(null)
      else setCalendarOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [calendarOpen, expandedEntryDate])

  useEffect(() => {
    saveJournalEntries(entryHistory)
  }, [entryHistory])

  useEffect(() => {
    if (userLoading || !token) return

    let cancelled = false
    setSaveError('')

    fetchJournalEntries()
      .then((data) => {
        if (cancelled) return
        const backendEntries = data.entries ?? []
        const mergedHistory = mergeJournalEntries(loadJournalEntries(), backendEntries)
        const mergedMoods = mergeJournalMoods(loadJournalMoods(), backendEntries)
        setEntryHistory(mergedHistory)
        setMoodData(mergedMoods)
        const savedToday = mergedHistory[todayKey]
        setEntryText(savedToday?.text ?? '')
        setSubmitted(Boolean(savedToday?.text || savedToday?.doodleData))
      })
      .catch((error) => {
        if (!cancelled) setSaveError(error.message)
      })

    return () => {
      cancelled = true
    }
  }, [token, todayKey, userLoading])

  useEffect(() => {
    saveJournalMoods(moodData)
  }, [moodData])

  async function submit() {
    if (!hasEntryContent) return
    const tone = entryText.trim() ? analyzeEntry(entryText) : 'neutral'
    const nextEntry = { text: entryText, doodleData, tone }
    const nextHistory = { ...entryHistory, [todayKey]: nextEntry }

    if (token) {
      try {
        const data = await saveJournalEntry({
          date: todayKey,
          content: entryText,
          mood: todayMood ?? '',
        })
        const backendEntries = data.entries ?? []
        const mergedHistory = mergeJournalEntries(nextHistory, backendEntries)
        const mergedMoods = mergeJournalMoods({ ...moodData, [todayKey]: todayMood }, backendEntries)
        setEntryHistory(mergedHistory)
        setMoodData(mergedMoods)
        setSaveError('')
      } catch (error) {
        setSaveError(error.message)
        return
      }
    } else {
      setEntryHistory(nextHistory)
    }

    setSubmitted(true)
  }

  function editEntry() {
    setSubmitted(false)
  }

  function setTodayMood(moodId) {
    const nextMoods = { ...moodData, [todayKey]: moodId }
    setMoodData(nextMoods)

    if (!token) return

    saveJournalEntry({
      date: todayKey,
      mood: moodId,
    })
      .then((data) => {
        const backendEntries = data.entries ?? []
        setEntryHistory((currentHistory) => mergeJournalEntries(currentHistory, backendEntries))
        setMoodData((currentMoods) => mergeJournalMoods(currentMoods, backendEntries))
        setSaveError('')
      })
      .catch((error) => {
        setSaveError(error.message)
      })
  }

  return (
    <section className="page jn-page">
      <style>{JN_STYLES}</style>

      <header className="page-header jn-page-header">
        <div>
          <h2>Thought Journal</h2>
          <p>Track your mood, write freely, and doodle. Aurora reflects back when you're ready.</p>
        </div>
        <button className="jn-calendar-btn" onClick={() => setCalendarOpen(true)}>
          View calendar
        </button>
      </header>

      {saveError && <p className="jn-error">{saveError}</p>}

      {/* main journal editor */}
      <section className="jn-entry-focus">

        <div className="jn-entry-topline">
          <div>
            <div className="jn-section-label">Today's entry</div>
            <strong>{formatDateKey(todayKey)}</strong>
          </div>
        </div>

        <div className="jn-color-controls">
        <label className="jn-color-ctrl jn-mood-marker-ctrl">
          <span>Mood</span>
          <div className="jn-mood-picker-inline">
            <ColorSwatchPicker
              value={todayMood ? MOOD_MAP[todayMood]?.color : undefined}
              onChange={(color) => {
                const match = findMoodByColor(color.toString('hex'))
                if (match) setTodayMood(match.id)
              }}
              size="sm"
              aria-label="Today's mood"
            >
              {MOODS.map((mood) => (
                <ColorSwatchPicker.Item
                  key={mood.id}
                  color={mood.color}
                  aria-label={mood.label}
                  title={mood.label}
                >
                  <ColorSwatchPicker.Swatch />
                  <ColorSwatchPicker.Indicator />
                </ColorSwatchPicker.Item>
              ))}
            </ColorSwatchPicker>
            <strong className="jn-mood-selected-label">
              {todayMood ? MOOD_MAP[todayMood]?.label : 'Pick a mood'}
            </strong>
          </div>
        </label>
        <div className="jn-tab-toggle">
          <button className={`jn-tab-btn${tab === 'write' ? ' jn-tab-btn--on' : ''}`} onClick={() => setTab('write')}>Write</button>
          <button className={`jn-tab-btn${tab === 'doodle' ? ' jn-tab-btn--on' : ''}`} onClick={() => setTab('doodle')}>Doodle</button>
        </div>
        </div>

      {tab === 'write' && (
        <div className="jn-notebook" style={{ background: JOURNAL_PAGE_COLOR }}>
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
          <DoodleCanvas
            bgColor={JOURNAL_PAGE_COLOR}
            value={doodleData}
            onChange={setDoodleData}
            disabled={submitted}
          />
        </div>
      )}

      {!submitted ? (
        <button
          className="jn-submit-btn"
          onClick={submit}
          disabled={!hasEntryContent}
          style={{ opacity: hasEntryContent ? 1 : 0.45, cursor: hasEntryContent ? 'pointer' : 'not-allowed' }}
        >
          Submit entry →
        </button>
      ) : (
        <button className="jn-new-btn" onClick={editEntry}>Edit entry</button>
      )}

      {/* ── AI response ── */}
      {false && (
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

      {calendarOpen && (
        <div className="jn-modal-backdrop" onClick={() => setCalendarOpen(false)}>
          <div className="jn-calendar-modal" role="dialog" aria-modal="true" aria-labelledby="journal-calendar-title" onClick={e => e.stopPropagation()}>
            <div className="jn-modal-header">
              <div>
                <h3 id="journal-calendar-title">Journal calendar</h3>
                <p>Saved days are view-only.</p>
              </div>
              <button className="jn-modal-close" onClick={() => setCalendarOpen(false)} aria-label="Close calendar">
                x
              </button>
            </div>
            <Calendar
              moodData={moodData}
              entryHistory={entryHistory}
              selectedDate={selectedHistoryDate}
              onSelectDate={setSelectedHistoryDate}
              onOpenEntry={setExpandedEntryDate}
            />
          </div>
        </div>
      )}

      {expandedEntryDate && expandedEntry && (
        <div className="jn-modal-backdrop jn-detail-backdrop" onClick={() => setExpandedEntryDate(null)}>
          <div className="jn-entry-detail-modal" role="dialog" aria-modal="true" aria-labelledby="journal-entry-detail-title" onClick={e => e.stopPropagation()}>
            <div className="jn-modal-header">
              <div>
                <h3 id="journal-entry-detail-title">{formatDateKey(expandedEntryDate)}</h3>
                <p>{expandedMood ? MOOD_MAP[expandedMood]?.label : 'No mood logged'}</p>
              </div>
              <button className="jn-modal-close" onClick={() => setExpandedEntryDate(null)} aria-label="Close entry">
                x
              </button>
            </div>
            <div className="jn-entry-detail-body">
              {expandedEntry.text && <p>{expandedEntry.text}</p>}
              {expandedEntry.doodleData && (
                <img className="jn-entry-detail-doodle" src={expandedEntry.doodleData} alt="Saved doodle" />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const JN_STYLES = `
  .jn-page {
    min-height: calc(100vh - 220px);
    align-content: start;
  }

  .jn-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 14px;
    margin-bottom: -6px;
  }
  .jn-page-header h2 { font-size: 1.65rem; }
  .jn-page-header p {
    margin-top: 4px;
    font-size: 0.9rem;
    line-height: 1.4;
  }
  .jn-error {
    margin: 0;
    padding: 10px 14px;
    border-radius: 14px;
    border: 1px solid rgba(239,68,68,0.2);
    background: rgba(239,68,68,0.08);
    color: #b91c1c;
    font-size: 0.84rem;
    font-weight: 600;
  }
  .jn-calendar-btn {
    flex: none; padding: 8px 16px; border-radius: 999px;
    border: 1.5px solid var(--line); background: var(--panel-strong);
    color: var(--ink); font-size: 0.9rem; font-weight: 700;
    box-shadow: 0 4px 12px rgba(46,42,38,0.06);
    transition: border-color 140ms, transform 140ms;
  }
  .jn-calendar-btn:hover { border-color: var(--accent); transform: translateY(-1px); }

  .jn-section-label {
    font-size: 0.74rem; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
    margin-bottom: 4px;
  }

  .jn-entry-focus {
    display: flex; flex-direction: column; gap: 8px;
    padding: 14px; border-radius: 16px;
    background: rgba(255,255,255,0.56); border: 1px solid var(--line);
    box-shadow: 0 10px 30px rgba(46,42,38,0.08);
  }
  .jn-entry-topline {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap;
  }
  .jn-entry-topline strong { display: block; font-size: 1rem; color: var(--ink); }
  .jn-mood-picker-inline {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .jn-mood-picker-inline .color-swatch-picker { gap: 0.38rem; }
  .jn-mood-picker-inline .color-swatch-picker__item {
    box-shadow: inset 0 0 0 1px rgba(46,42,38,0.08);
  }
  .jn-mood-selected-label {
    color: var(--ink);
    font-size: 0.84rem;
    font-weight: 700;
  }
  .jn-mood-marker-ctrl { min-width: 232px; }

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
  .jn-cal-selects {
    display: flex; align-items: center; gap: 8px;
  }
  .jn-cal-picker { position: relative; }
  .jn-cal-nav-btn {
    width: 34px; height: 34px; border-radius: 50%;
    border: 1.5px solid var(--line); background: transparent;
    font-size: 1.1rem; color: var(--ink);
    display: flex; align-items: center; justify-content: center;
    transition: background 140ms, border-color 140ms;
  }
  .jn-cal-nav-btn:hover { background: var(--accent-soft); border-color: var(--accent); }
  .jn-cal-picker-btn {
    padding: 4px 2px;
    border: 0;
    background: transparent;
    color: var(--ink);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    transition: color 140ms;
  }
  .jn-cal-picker-btn:hover { color: var(--accent); }
  .jn-cal-picker-btn--year { min-width: 3.5ch; text-align: center; }
  .jn-cal-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 12;
    width: 140px;
    max-height: 180px;
    overflow-y: auto;
    padding: 8px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(250,244,232,0.98);
    box-shadow: 0 18px 36px rgba(46,42,38,0.16);
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .jn-cal-menu::-webkit-scrollbar { display: none; }
  .jn-cal-menu--months { width: 148px; }
  .jn-cal-menu--years { width: 108px; }
  .jn-cal-menu-item {
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--ink);
    font-size: 0.84rem;
    font-weight: 600;
    text-align: left;
    transition: background 140ms, color 140ms;
  }
  .jn-cal-menu-item:hover,
  .jn-cal-menu-item--active {
    background: var(--accent-soft);
    color: var(--accent-dark);
  }

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
  .jn-cal-day--today { border-color: var(--accent); border-width: 2px; box-shadow: 0 0 0 2px rgba(77,107,88,0.15); }
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
    background: rgba(210,228,220,0.3); border: 1px solid rgba(77,107,88,0.16);
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

  .jn-history-preview {
    margin-top: 14px; padding: 16px; border-radius: 14px;
    background: rgba(255,255,255,0.78); border: 1px solid var(--line);
  }
  .jn-history-meta {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 10px;
    font-size: 0.86rem; color: var(--muted);
  }
  .jn-history-meta strong { color: var(--ink); font-size: 0.84rem; }
  .jn-history-preview p {
    margin: 0; color: var(--ink); font-size: 0.92rem; line-height: 1.65;
    white-space: pre-wrap;
  }
  .jn-history-open {
    display: block; width: 100%; padding: 0; border: 0; background: transparent;
    color: inherit; text-align: left;
  }
  .jn-history-open:hover p { color: var(--blue-dark); }
  .jn-history-doodle {
    display: block; width: 100%; max-height: 120px; object-fit: contain;
    margin-top: 8px; border: 1px solid var(--line); border-radius: 10px;
    background: #fffbf0;
  }

  .jn-modal-backdrop {
    position: fixed; inset: 0; z-index: 50;
    display: flex; align-items: center; justify-content: center;
    padding: 18px; background: rgba(46,42,38,0.42);
  }
  .jn-calendar-modal {
    width: min(540px, 100%); max-height: calc(100vh - 36px);
    overflow: hidden; border-radius: 18px;
    background: var(--panel); border: 1px solid var(--line);
    box-shadow: 0 24px 80px rgba(46,42,38,0.28);
  }
  .jn-modal-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 14px; padding: 14px 16px 0;
  }
  .jn-modal-header h3 { margin: 0 0 2px; font-size: 1.05rem; color: var(--ink); }
  .jn-modal-header p { margin: 0; color: var(--muted); font-size: 0.8rem; }
  .jn-modal-close {
    width: 30px; height: 30px; border-radius: 50%;
    border: 1.5px solid var(--line); background: var(--panel-strong);
    color: var(--ink); font-size: 1rem; font-weight: 800;
  }
  .jn-calendar-modal .jn-cal-wrap {
    margin: 12px 16px 16px;
    padding: 14px;
    box-shadow: none;
  }
  .jn-calendar-modal .jn-cal-nav { margin-bottom: 10px; }
  .jn-calendar-modal .jn-cal-nav-btn { width: 28px; height: 28px; font-size: 0.92rem; }
  .jn-calendar-modal .jn-cal-selects { gap: 6px; }
  .jn-calendar-modal .jn-cal-picker-btn { font-size: 0.9rem; }
  .jn-calendar-modal .jn-cal-menu {
    top: calc(100% + 6px);
    max-height: 156px;
    padding: 6px;
  }
  .jn-calendar-modal .jn-cal-menu-item {
    padding: 7px 9px;
    font-size: 0.78rem;
  }
  .jn-calendar-modal .jn-cal-daynames,
  .jn-calendar-modal .jn-cal-grid {
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
  }
  .jn-calendar-modal .jn-cal-daynames { margin-bottom: 4px; }
  .jn-calendar-modal .jn-cal-grid { gap: 3px; }
  .jn-calendar-modal .jn-cal-day {
    border-radius: 8px;
    font-size: 0.72rem;
  }
  .jn-calendar-modal .jn-mood-legend {
    gap: 7px;
    margin-top: 10px;
    padding-top: 8px;
  }
  .jn-calendar-modal .jn-legend-item { font-size: 0.7rem; }
  .jn-calendar-modal .jn-history-preview {
    margin-top: 10px;
    padding: 10px 12px;
  }
  .jn-calendar-modal .jn-history-meta {
    margin-bottom: 5px;
    font-size: 0.78rem;
  }
  .jn-calendar-modal .jn-history-preview p {
    font-size: 0.8rem;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
  }
  .jn-calendar-modal .jn-history-doodle { max-height: 68px; margin-top: 6px; }
  .jn-detail-backdrop { z-index: 70; }
  .jn-entry-detail-modal {
    width: min(640px, 100%); max-height: calc(100vh - 42px);
    overflow: hidden; border-radius: 18px;
    background: var(--panel); border: 1px solid var(--line);
    box-shadow: 0 24px 80px rgba(46,42,38,0.32);
  }
  .jn-entry-detail-body {
    margin: 14px 16px 16px; padding: 14px;
    max-height: calc(100vh - 170px); overflow-y: auto;
    border: 1px solid var(--line); border-radius: 14px;
    background: rgba(255,255,255,0.74);
  }
  .jn-entry-detail-body p {
    margin: 0; color: var(--ink); font-size: 0.95rem; line-height: 1.6;
    white-space: pre-wrap;
  }
  .jn-entry-detail-doodle {
    display: block; width: 100%; max-height: 420px; object-fit: contain;
    margin-top: 12px; border: 1px solid var(--line); border-radius: 12px;
    background: #fffbf0;
  }

  /* color controls */
  .jn-color-controls {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    margin-bottom: 4px;
  }
  .jn-color-ctrl { display: flex; flex-direction: column; gap: 3px; font-size: 0.76rem; font-weight: 600; color: var(--muted); }
  .jn-color-ctrl-row { display: flex; align-items: center; gap: 6px; }
  .jn-tab-toggle { display: flex; gap: 4px; background: rgba(255,255,255,0.6); border: 1px solid var(--line); border-radius: 12px; padding: 3px; margin-left: auto; }
  .jn-tab-btn { padding: 5px 16px; border-radius: 9px; border: none; background: transparent; font-size: 0.82rem; font-weight: 600; color: var(--muted); transition: background 140ms, color 140ms; }
  .jn-tab-btn--on { background: var(--panel-strong); color: var(--ink); box-shadow: 0 2px 6px rgba(46,42,38,0.08); }

  /* notebook */
  .jn-notebook {
    position: relative; display: flex;
    border-radius: 14px; overflow: hidden;
    border: 1.5px solid var(--line);
    box-shadow: 0 8px 24px rgba(46,42,38,0.10);
    min-height: 250px;
  }
  .jn-margin { width: 56px; flex-shrink: 0; border-right: 2px solid rgba(0,0,0,0.12); }
  .jn-lines-overlay {
    position: absolute; inset: 0; left: 58px; pointer-events: none;
    background-size: 100% 28px; background-position: 0 6px;
  }
  .jn-textarea {
    flex: 1; resize: none; border: none; background: transparent;
    padding: 8px 16px; font-size: 0.9rem; line-height: 28px;
    color: var(--ink); outline: none; min-height: 250px;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }
  .jn-textarea:disabled { opacity: 0.7; }
  .jn-textarea::placeholder { color: rgba(46,42,38,0.3); }

  /* doodle */
  .jn-doodle-section { display: flex; flex-direction: column; gap: 6px; }
  .jn-doodle-note { margin: 0; font-size: 0.78rem; color: var(--muted); font-style: italic; }
  .jn-doodle-wrap {
    border: 1.5px solid var(--line); border-radius: 18px; overflow: hidden;
    box-shadow: 0 8px 24px rgba(46,42,38,0.10);
  }
  .jn-doodle-toolbar {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    padding: 10px 14px; background: rgba(255,255,255,0.9); border-bottom: 1px solid var(--line);
  }
  .jn-color-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .jn-color-row .color-swatch-picker { gap: 0.38rem; }
  .jn-color-row .color-swatch-picker__item {
    box-shadow: inset 0 0 0 1px rgba(46,42,38,0.08);
  }
  .cp-wrap { position: relative; }
  .cp-trigger {
    position: relative;
    width: 30px; height: 30px; padding: 0;
    border-radius: 999px; border: 1.5px solid var(--line);
    background: rgba(255,255,255,0.9);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(46,42,38,0.1);
    transition: transform 120ms, border-color 120ms, box-shadow 120ms;
  }
  .cp-trigger:hover:not(:disabled),
  .cp-trigger--open {
    transform: translateY(-1px);
    border-color: var(--accent);
    box-shadow: 0 8px 18px rgba(46,42,38,0.14);
  }
  .cp-trigger--selected {
    border-color: var(--ink);
    box-shadow: 0 4px 12px rgba(46,42,38,0.14);
  }
  .cp-trigger:disabled { cursor: not-allowed; opacity: 0.45; }
  .cp-trigger-wheel {
    width: 18px; height: 18px; border-radius: 50%;
    background: conic-gradient(#ff3b30, #ff9500, #ffcc00, #4cd964, #5ac8fa, #007aff, #5856d6, #ff2d55, #ff3b30);
  }
  .cp-trigger-check {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    color: #fff; pointer-events: none;
  }
  .cp-trigger-check--dark { color: var(--ink); }
  .cp-trigger-check svg {
    width: 11px; height: 11px;
    stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round;
    filter: drop-shadow(0 1px 2px rgba(46,42,38,0.28));
  }
  .cp-trigger-dot {
    position: absolute; right: -1px; bottom: -1px;
    width: 12px; height: 12px; border-radius: 50%;
    border: 2px solid var(--panel-strong);
    box-shadow: 0 2px 6px rgba(46,42,38,0.18);
  }
  .cp-popover {
    position: absolute; top: calc(100% + 8px); left: 0; z-index: 30;
    width: 220px; padding: 12px; border-radius: 16px;
    background: rgba(250,244,232,0.98); border: 1px solid var(--line);
    box-shadow: 0 18px 44px rgba(46,42,38,0.18);
    display: flex; flex-direction: column; gap: 10px;
    backdrop-filter: blur(10px);
  }
  .cp-square {
    position: relative; width: 100%; height: 132px;
    border-radius: 12px; overflow: hidden; cursor: crosshair;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.3);
  }
  .cp-square-handle {
    position: absolute; width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid #fff; box-shadow: 0 1px 8px rgba(0,0,0,0.2);
    transform: translate(-50%, -50%);
  }
  .cp-hue {
    width: 100%; margin: 0;
    appearance: none; height: 10px; border-radius: 999px; outline: none;
    background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
  }
  .cp-hue::-webkit-slider-thumb {
    appearance: none; width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid #fff; background: var(--ink); box-shadow: 0 1px 5px rgba(0,0,0,0.22);
  }
  .cp-hue::-moz-range-thumb {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid #fff; background: var(--ink); box-shadow: 0 1px 5px rgba(0,0,0,0.22);
  }
  .cp-input-row { display: flex; align-items: center; gap: 8px; }
  .cp-input {
    flex: 1; min-width: 0; height: 34px; padding: 0 10px;
    border-radius: 10px; border: 1.5px solid var(--line);
    background: rgba(255,255,255,0.85); color: var(--ink);
    font-size: 0.82rem; font-weight: 600;
  }
  .cp-input:focus { outline: 2px solid rgba(58,104,152,0.2); border-color: var(--blue); }
  .cp-preview {
    width: 34px; height: 34px; border-radius: 10px;
    border: 1.5px solid var(--line); flex-shrink: 0;
  }
  .jn-toolbar-right { display: flex; align-items: center; gap: 6px; margin-left: auto; }
  .jn-size-row { display: flex; align-items: center; gap: 4px; }
  .jn-size-btn { width: 30px; height: 30px; border-radius: 8px; border: 1.5px solid var(--line); background: transparent; display: flex; align-items: center; justify-content: center; transition: border-color 120ms, background 120ms; }
  .jn-size-btn--active { border-color: var(--accent); background: var(--accent-soft); }
  .jn-tool-btn { padding: 6px 12px; border-radius: 8px; border: 1.5px solid var(--line); background: transparent; font-size: 0.8rem; font-weight: 600; color: var(--muted); transition: border-color 120ms, color 120ms; }
  .jn-tool-btn--active { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
  .jn-tool-btn--danger:hover:not(:disabled) { border-color: #dc2626; color: #dc2626; }
  .jn-tool-btn:disabled,
  .jn-size-btn:disabled { cursor: not-allowed; opacity: 0.45; }
  .jn-canvas { display: block; width: 100%; height: 220px; }

  /* submit */
  .jn-submit-btn {
    margin-top: 2px; padding: 9px 22px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.9rem; font-weight: 700;
    transition: opacity 140ms, transform 140ms; align-self: flex-start;
  }
  .jn-submit-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .jn-new-btn {
    margin-top: 2px; padding: 9px 22px; border-radius: 999px;
    border: 1.5px solid var(--line); background: transparent;
    font-size: 0.92rem; font-weight: 600; color: var(--muted);
    transition: border-color 140ms, color 140ms;
  }
  .jn-new-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* AI response */
  .jn-ai-response {
    display: flex; gap: 10px; padding: 12px 14px;
    border: 1px solid; border-radius: 14px;
    animation: fade-up 220ms ease;
  }
  .jn-ai-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 900; font-size: 0.88rem; flex-shrink: 0;
  }
  .jn-ai-body { flex: 1; }
  .jn-ai-label { display: block; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }
  .jn-ai-text  { margin: 0 0 6px; font-size: 0.86rem; line-height: 1.45; color: var(--ink); }
  .jn-ai-links { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 0.82rem; color: var(--muted); }
  .jn-ai-sep   { opacity: 0.4; }

  @media (max-width: 640px) {
    .jn-page-header { flex-direction: column; }
    .jn-calendar-btn { width: 100%; }
    .jn-entry-focus { padding: 12px; }
    .jn-mood-marker-ctrl { min-width: 0; width: 100%; }
    .jn-cal-day { font-size: 0.72rem; border-radius: 8px; }
    .jn-color-controls { flex-direction: column; align-items: flex-start; }
    .jn-tab-toggle { margin-left: 0; }
    .jn-notebook,
    .jn-textarea { min-height: 240px; }
    .jn-modal-backdrop { padding: 12px; align-items: flex-start; }
    .jn-calendar-modal { max-height: calc(100vh - 24px); }
    .jn-entry-detail-modal { max-height: calc(100vh - 24px); }
    .jn-entry-detail-body { max-height: calc(100vh - 146px); }
    .jn-history-meta { flex-direction: column; align-items: flex-start; }
    .jn-mood-options { gap: 6px; }
    .jn-doodle-toolbar { flex-direction: column; align-items: flex-start; }
    .jn-toolbar-right { margin-left: 0; }
  }
`
