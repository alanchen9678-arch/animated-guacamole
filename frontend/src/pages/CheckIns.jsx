import { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '../context/UserContext'
import { fetchCheckIns, submitCheckIn } from '../services/api'
import { AsyncButton, FeedbackNotice, LoadingState } from '../components/ui/feedback.jsx'

// ─── personality questions (30 questions, 5 dimensions) ───────────────────────

const PERSONALITY_SCHEMA_VERSION = 2
const PERSONALITY_DIMENSIONS = [
  { id: 'socialEnergy', label: 'Social Energy', low: 'Reflective', high: 'Engaging' },
  { id: 'cooperationTrust', label: 'Cooperation & Trust', low: 'Independent-Minded', high: 'Cooperative' },
  { id: 'selfManagement', label: 'Self-Management', low: 'Flexible', high: 'Structured' },
  { id: 'emotionalRecovery', label: 'Emotional Reactivity & Recovery', low: 'Responsive', high: 'Steady' },
  { id: 'opennessCuriosity', label: 'Openness & Curiosity', low: 'Grounded', high: 'Exploratory' },
]
const PERSONALITY_RESPONSE_OPTIONS = [
  { text: 'Very unlike me', value: 1 },
  { text: 'Somewhat unlike me', value: 2 },
  { text: 'It depends / somewhere in between', value: 3 },
  { text: 'Somewhat like me', value: 4 },
  { text: 'Very much like me', value: 5 },
]
function personalityQuestion(id, dimension, text, reverse = false) {
  return { id, dimension, text, reverse, options: PERSONALITY_RESPONSE_OPTIONS }
}
const PERSONALITY_QUESTIONS = [
  personalityQuestion('p1', 'socialEnergy', 'Being around other people often gives me a boost of energy.'),
  personalityQuestion('p2', 'socialEnergy', "I am usually comfortable starting a conversation with someone I don't know well."),
  personalityQuestion('p3', 'socialEnergy', 'In a group, I am comfortable speaking up when I have something to contribute.'),
  personalityQuestion('p4', 'socialEnergy', 'I often prefer spending free time on my own rather than joining a group activity.', true),
  personalityQuestion('p5', 'socialEnergy', 'After a lot of social interaction, I usually want substantial time to myself.', true),
  personalityQuestion('p6', 'socialEnergy', 'I usually prefer observing a group conversation before becoming actively involved.', true),
  personalityQuestion('p7', 'cooperationTrust', 'When I disagree with someone, I try to understand how they reached their point of view.'),
  personalityQuestion('p8', 'cooperationTrust', 'I usually consider how my decisions may affect other people.'),
  personalityQuestion('p9', 'cooperationTrust', 'Unless I have a reason not to, I generally expect people to deal with me fairly.'),
  personalityQuestion('p10', 'cooperationTrust', "I tend to question people's intentions until I have enough reason to trust them.", true),
  personalityQuestion('p11', 'cooperationTrust', 'When I believe something is wrong, I am comfortable saying so even if it creates disagreement.', true),
  personalityQuestion('p12', 'cooperationTrust', "When making a decision, I can set aside other people's preferences if I believe another choice makes more sense.", true),
  personalityQuestion('p13', 'selfManagement', 'Before starting a demanding task, I usually decide how I am going to approach it.'),
  personalityQuestion('p14', 'selfManagement', 'I keep track of commitments so that I can follow through on them.'),
  personalityQuestion('p15', 'selfManagement', 'I usually keep working on an important task even after the interesting part is over.'),
  personalityQuestion('p16', 'selfManagement', 'I often put off starting things until the deadline feels close.', true),
  personalityQuestion('p17', 'selfManagement', 'I sometimes lose track of details I intended to take care of.', true),
  personalityQuestion('p18', 'selfManagement', 'If my priorities change, I am comfortable abandoning my original plan and figuring things out as I go.', true),
  personalityQuestion('p19', 'emotionalRecovery', 'After something upsetting happens, I usually return to my normal emotional state fairly quickly.'),
  personalityQuestion('p20', 'emotionalRecovery', 'When several things go wrong at once, I can usually stay composed enough to decide what to do next.'),
  personalityQuestion('p21', 'emotionalRecovery', 'When plans suddenly change, I usually adjust without staying frustrated for very long.'),
  personalityQuestion('p22', 'emotionalRecovery', 'Small setbacks can stay on my mind longer than I would like.', true),
  personalityQuestion('p23', 'emotionalRecovery', 'Uncertainty can keep me mentally on edge even when there is nothing I can do about it yet.', true),
  personalityQuestion('p24', 'emotionalRecovery', 'My emotional reaction to an event sometimes lasts longer than the event itself.', true),
  personalityQuestion('p25', 'opennessCuriosity', 'I enjoy exploring ideas that challenge the way I normally think.'),
  personalityQuestion('p26', 'opennessCuriosity', 'I like experimenting with new ways to solve familiar problems.'),
  personalityQuestion('p27', 'opennessCuriosity', 'Imaginative or creative ideas can hold my attention even when they have no immediate practical use.'),
  personalityQuestion('p28', 'opennessCuriosity', 'When an established approach works, I usually prefer sticking with it rather than experimenting.', true),
  personalityQuestion('p29', 'opennessCuriosity', 'I usually prefer concrete, practical topics over highly abstract ideas.', true),
  personalityQuestion('p30', 'opennessCuriosity', "Once I understand something well enough to use it, I usually don't feel much need to explore it further.", true),
]
// ─── initial disorder questions (10, selected from INITIAL_QUESTIONS) ─────────

const INITIAL_DISORDER_QUESTIONS = [
  { id: 1,  cat: 'anxiety',    text: 'How often do you feel excessive worry about things that may happen in the future?' },
  { id: 3,  cat: 'anxiety',    text: 'How often do you avoid situations because you feel nervous, afraid, or overwhelmed?' },
  { id: 5,  cat: 'loneliness', text: 'How often do you feel disconnected from the people around you, even when you are with others?' },
  { id: 7,  cat: 'loneliness', text: 'How often do you feel left out or like you do not belong?' },
  { id: 9,  cat: 'grief',      text: 'How often do you find yourself struggling to accept a major change, loss, or ending in your life?' },
  { id: 11, cat: 'grief',      text: 'How often do feelings related to a past loss affect your ability to focus or enjoy things?' },
  { id: 13, cat: 'burnout',    text: 'How often do you feel emotionally exhausted from your responsibilities or daily demands?' },
  { id: 15, cat: 'burnout',    text: 'How often do you feel detached, unmotivated, or uninterested in things you normally care about?' },
  { id: 17, cat: 'stress',     text: 'How often do you feel overwhelmed by the number of tasks, problems, or expectations in your life?' },
  { id: 21, cat: 'confidence', text: 'How often do you doubt your abilities or question whether you can succeed?' },
]

// ─── weekly question bank (60 questions, 10 per category) ────────────────────

const WEEKLY_QUESTION_BANK = [
  { id: 101, cat: 'anxiety', text: 'I tend to rehearse conversations or situations in my head before they happen.' },
  { id: 102, cat: 'anxiety', text: 'Unexpected changes to plans can leave me unsettled for a while.' },
  { id: 103, cat: 'anxiety', text: 'I often notice potential problems before others do.' },
  { id: 104, cat: 'anxiety', text: "Even small mistakes can stay on my mind longer than I'd like." },
  { id: 105, cat: 'anxiety', text: 'I like having backup plans "just in case."' },
  { id: 106, cat: 'anxiety', text: 'It is difficult for me to fully relax, even during free time.' },
  { id: 107, cat: 'anxiety', text: 'I frequently think about what could go wrong in the future.' },
  { id: 108, cat: 'anxiety', text: 'I become mentally preoccupied when waiting for important news.' },
  { id: 109, cat: 'anxiety', text: 'I prefer certainty over spontaneity whenever possible.' },
  { id: 110, cat: 'anxiety', text: 'My mind often feels active when I wish it would slow down.' },
  { id: 111, cat: 'loneliness', text: "I often feel that people around me don't fully understand me." },
  { id: 112, cat: 'loneliness', text: 'I have many interactions that feel superficial rather than meaningful.' },
  { id: 113, cat: 'loneliness', text: 'I wish I had more people I could genuinely rely on.' },
  { id: 114, cat: 'loneliness', text: 'Even in groups, I sometimes feel like an outsider.' },
  { id: 115, cat: 'loneliness', text: 'I hesitate to share my deeper thoughts with others.' },
  { id: 116, cat: 'loneliness', text: 'I often handle emotional struggles on my own.' },
  { id: 117, cat: 'loneliness', text: 'I rarely feel truly seen or appreciated for who I am.' },
  { id: 118, cat: 'loneliness', text: 'I wish more people checked in on me without being asked.' },
  { id: 119, cat: 'loneliness', text: 'I sometimes avoid reaching out because I assume others are busy.' },
  { id: 120, cat: 'loneliness', text: 'I miss having stronger connections in my life.' },
  { id: 121, cat: 'grief', text: 'Certain memories still affect me more than I expect.' },
  { id: 122, cat: 'grief', text: 'I occasionally catch myself wishing things could return to how they once were.' },
  { id: 123, cat: 'grief', text: 'I carry experiences that changed me in lasting ways.' },
  { id: 124, cat: 'grief', text: 'Anniversaries, places, or reminders can bring up strong emotions.' },
  { id: 125, cat: 'grief', text: 'There are losses in my life that still influence my daily perspective.' },
  { id: 126, cat: 'grief', text: "I sometimes struggle to accept changes I didn't choose." },
  { id: 127, cat: 'grief', text: 'I find myself revisiting "what if" scenarios about the past.' },
  { id: 128, cat: 'grief', text: 'I keep parts of certain memories close because they remain meaningful.' },
  { id: 129, cat: 'grief', text: 'I have moments where emotions connected to the past resurface unexpectedly.' },
  { id: 130, cat: 'grief', text: 'Some chapters of my life still feel unfinished emotionally.' },
  { id: 131, cat: 'burnout', text: 'Tasks that used to feel manageable now require more effort.' },
  { id: 132, cat: 'burnout', text: 'I often feel mentally drained before the day is over.' },
  { id: 133, cat: 'burnout', text: 'I struggle to maintain enthusiasm for responsibilities I once cared about.' },
  { id: 134, cat: 'burnout', text: 'I frequently push through exhaustion because things still need to get done.' },
  { id: 135, cat: 'burnout', text: 'I find myself operating on autopilot.' },
  { id: 136, cat: 'burnout', text: "Rest doesn't always leave me feeling recharged." },
  { id: 137, cat: 'burnout', text: 'Small demands sometimes feel disproportionately overwhelming.' },
  { id: 138, cat: 'burnout', text: 'I have less patience than I used to.' },
  { id: 139, cat: 'burnout', text: 'It is difficult to find motivation, even for important tasks.' },
  { id: 140, cat: 'burnout', text: 'I feel like I have been giving more of myself than I can sustain.' },
  { id: 141, cat: 'stress', text: 'I usually have several responsibilities competing for my attention.' },
  { id: 142, cat: 'stress', text: 'I often feel pressed for time.' },
  { id: 143, cat: 'stress', text: 'It can be difficult to mentally disconnect from obligations.' },
  { id: 144, cat: 'stress', text: 'I feel like there is always something important waiting to be done.' },
  { id: 145, cat: 'stress', text: 'I frequently juggle multiple priorities at once.' },
  { id: 146, cat: 'stress', text: 'I have trouble fully enjoying downtime because I think about unfinished tasks.' },
  { id: 147, cat: 'stress', text: 'My schedule often feels packed or demanding.' },
  { id: 148, cat: 'stress', text: 'I feel pressure to meet expectations placed on me.' },
  { id: 149, cat: 'stress', text: 'I sometimes wish I could pause life long enough to catch up.' },
  { id: 150, cat: 'stress', text: 'I tend to carry a lot of responsibility at the same time.' },
  { id: 151, cat: 'confidence', text: 'I compare my abilities to others more than I would like.' },
  { id: 152, cat: 'confidence', text: 'I hesitate to speak up unless I am sure I am right.' },
  { id: 153, cat: 'confidence', text: 'I sometimes underestimate what I can accomplish.' },
  { id: 154, cat: 'confidence', text: 'Praise from others can be difficult for me to fully believe.' },
  { id: 155, cat: 'confidence', text: 'I worry that people may notice my shortcomings more than my strengths.' },
  { id: 156, cat: 'confidence', text: 'I second-guess decisions after making them.' },
  { id: 157, cat: 'confidence', text: 'I need reassurance before feeling confident in unfamiliar situations.' },
  { id: 158, cat: 'confidence', text: 'I tend to focus on what I could have done better rather than what went well.' },
  { id: 159, cat: 'confidence', text: 'I avoid certain opportunities because I doubt my capabilities.' },
  { id: 160, cat: 'confidence', text: 'I often hold myself to standards I struggle to meet.' },
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

// ─── mock history ─────────────────────────────────────────────────────────────

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

// ─── storage key ──────────────────────────────────────────────────────────────

const CHECKIN_DRAFT_VERSION = 1
const CHECKIN_QUESTION_BY_ID = new Map(
  [...INITIAL_DISORDER_QUESTIONS, ...PERSONALITY_QUESTIONS, ...WEEKLY_QUESTION_BANK]
    .map((question) => [String(question.id), question]),
)

function getCheckInDraftStorageKey(user) {
  return `aurora.checkin.draft.v${CHECKIN_DRAFT_VERSION}:${user?.id ?? 'guest'}`
}

function loadCheckInDraft(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const draft = JSON.parse(raw)
    if (
      draft?.version !== CHECKIN_DRAFT_VERSION
      || !['initial', 'personality', 'weekly'].includes(draft.surveyType)
      || !Array.isArray(draft.questionIds)
      || !draft.questionIds.length
      || (draft.surveyType !== 'weekly' && draft.personalityInstrument !== 'aurora-personality-v2')
    ) return null

    const questions = draft.questionIds.map((id) => CHECKIN_QUESTION_BY_ID.get(String(id)))
    if (questions.some((question) => !question)) return null

    const answers = {}
    for (const question of questions) {
      const answer = draft.answers?.[question.id]
      if (Number.isInteger(answer)) answers[question.id] = answer
    }

    return {
      surveyType: draft.surveyType,
      questions,
      answers,
      currentIndex: Math.min(
        Math.max(Number.isInteger(draft.currentIndex) ? draft.currentIndex : 0, 0),
        questions.length - 1,
      ),
    }
  } catch {
    return null
  }
}

function saveCheckInDraft(storageKey, { surveyType, questions, answers, currentIndex }) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      version: CHECKIN_DRAFT_VERSION,
      surveyType,
      personalityInstrument: surveyType !== 'weekly' ? 'aurora-personality-v2' : null,
      questionIds: questions.map((question) => question.id),
      answers,
      currentIndex,
      updatedAt: new Date().toISOString(),
    }))
  } catch {
    // Draft saving is best-effort when browser storage is unavailable.
  }
}

function clearCheckInDraft(storageKey) {
  try {
    localStorage.removeItem(storageKey)
  } catch {
    // Browser storage can be unavailable in private browsing modes.
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function diffDays(fromDate, toDate) {
  const msPerDay = 24 * 60 * 60 * 1000
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
  return Math.floor((to - from) / msPerDay)
}

function getLatestEntry(history) {
  if (!history.length) return null
  return [...history].sort((a, b) => parseDateKey(a.date) - parseDateKey(b.date))[history.length - 1]
}

function getLatestWeeklyEntry(history) {
  const weeklyEntries = history
    .filter((entry) => entry.type === 'weekly')
    .sort((a, b) => parseDateKey(a.date) - parseDateKey(b.date))
  return weeklyEntries[weeklyEntries.length - 1] ?? null
}

function getWeeklyStreak(history, today = new Date()) {
  const weeklyEntries = history
    .filter((entry) => entry.type === 'weekly')
    .sort((a, b) => parseDateKey(b.date) - parseDateKey(a.date))

  if (!weeklyEntries.length) return 0

  const latestWeeklyDate = parseDateKey(weeklyEntries[0].date)
  if (diffDays(latestWeeklyDate, today) > 7) return 0

  let streak = 1
  for (let index = 1; index < weeklyEntries.length; index++) {
    const newer = parseDateKey(weeklyEntries[index - 1].date)
    const older = parseDateKey(weeklyEntries[index].date)
    if (diffDays(older, newer) <= 8) streak += 1
    else break
  }

  return streak
}

function isWeeklyCheckInDue(history, today = new Date()) {
  const latestWeeklyEntry = getLatestWeeklyEntry(history)
  if (!latestWeeklyEntry) return true
  return diffDays(parseDateKey(latestWeeklyEntry.date), today) >= 7
}

function buildSurvey(type, lastDisorderQIds = []) {
  if (type === 'initial') {
    // 40 questions: 10 disorder first, then 30 personality
    return [...INITIAL_DISORDER_QUESTIONS, ...PERSONALITY_QUESTIONS]
  }
  if (type === 'personality') return [...PERSONALITY_QUESTIONS]
  // Weekly: 12 disorder questions total, 2 from each of the 6 categories.
  const disorderQs = CATEGORIES.flatMap(({ id: cat }) => {
    const pool = WEEKLY_QUESTION_BANK.filter(q => q.cat === cat)
    const unused = shuffle(pool.filter(q => !lastDisorderQIds.includes(q.id))).slice(0, 2)
    if (unused.length === 2) return unused

    const seen = new Set(unused.map(q => q.id))
    const fallback = shuffle(pool.filter(q => !seen.has(q.id))).slice(0, 2 - unused.length)
    return [...unused, ...fallback]
  })
  return shuffle(disorderQs)
}

function computeDisorderScores(answers, questions) {
  const disorderQs = questions.filter(q => q.cat)
  const raw = {}, count = {}
  for (const c of CATEGORIES) { raw[c.id] = 0; count[c.id] = 0 }
  for (const q of disorderQs) {
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

function computePersonalityProfile(answers, questions) {
  const dimensions = {}

  for (const dimension of PERSONALITY_DIMENSIONS) {
    const values = questions
      .filter((question) => question.dimension === dimension.id)
      .map((question) => {
        const selectedIndex = answers[question.id]
        const selectedValue = question.options?.[selectedIndex]?.value
        if (selectedValue == null) return null
        return question.reverse ? 6 - selectedValue : selectedValue
      })
      .filter((value) => value != null)

    const score = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 3
    const variance = values.length
      ? values.reduce((sum, value) => sum + (value - score) ** 2, 0) / values.length
      : 0
    const standardDeviation = Math.sqrt(variance)
    const consistency = Math.max(0, Math.min(1, 1 - standardDeviation / 2))
    const directionalStrength = Math.abs(score - 3) / 2
    const confidence = directionalStrength * consistency
    const signalStrength = consistency < 0.45
      ? 'inconsistent'
      : confidence >= 0.55
        ? 'strong'
        : confidence >= 0.25
          ? 'moderate'
          : 'weak'

    dimensions[dimension.id] = {
      score: Number(score.toFixed(2)),
      consistency: Number(consistency.toFixed(2)),
      signalStrength,
    }
  }

  return {
    schemaVersion: PERSONALITY_SCHEMA_VERSION,
    instrument: 'aurora-personality-v2',
    dimensions,
    updatedAt: new Date().toISOString(),
  }
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
  const d = parseDateKey(str)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── hub view ─────────────────────────────────────────────────────────────────

function HubView({ streak, dueToday, lastCheckInDate, hasInitialAssessment, hasCurrentPersonalityAssessment, onStart }) {
  const needsPersonalityUpgrade = hasInitialAssessment && !hasCurrentPersonalityAssessment
  return (
    <div className="ci-hub">
      {/* streak + due banner */}
      <div className="ci-top-row">
        <div className="ci-streak-card">
          <div className="ci-streak-num">{streak}</div>
          <div className="ci-streak-label">week streak</div>
          <div className="ci-streak-sub">{lastCheckInDate ? `Last check-in ${fmtDate(lastCheckInDate)}` : 'No check-ins yet'}</div>
        </div>

        <div className={`ci-due-card${(!hasCurrentPersonalityAssessment || dueToday) ? ' ci-due-card--due' : ''}`}>
          {needsPersonalityUpgrade ? (
            <>
              <div className="ci-due-badge">Update required</div>
              <p className="ci-due-text">Aurora's personalization assessment has changed. Complete the new 30-question assessment to continue using Aurora. Your previous check-ins and wellness history will be preserved.</p>
              <button className="ci-start-btn" onClick={() => onStart('personality')}>Take updated assessment</button>
            </>
          ) : !hasInitialAssessment ? (
            <>
              <div className="ci-due-badge">Get started</div>
              <p className="ci-due-text">Before weekly check-ins begin, complete your 40-question initial assessment to set your wellness baseline and help Aurora personalize its support.</p>
              <button className="ci-start-btn" onClick={() => onStart('initial')}>Start initial assessment</button>
            </>
          ) : dueToday ? (
            <>
              <div className="ci-due-badge">Due today</div>
              <p className="ci-due-text">Your weekly check-in is ready. It takes about 5 minutes and covers all six well-being categories for a fuller profile update.</p>
              <button className="ci-start-btn" onClick={() => onStart('weekly')}>Start weekly check-in →</button>
            </>
          ) : (
            <>
              <div className="ci-due-badge ci-due-badge--ok">Up to date</div>
              <p className="ci-due-text">Your next check-in is due in a few days. Come back then to keep your streak going.</p>
            </>
          )}
        </div>
      </div>

      <p className="ci-disclaimer">
        These check-ins are tools for self-reflection and trend awareness — not diagnostic tools. They do not determine whether you have a mental health condition.
      </p>
    </div>
  )
}

// ─── intro view ───────────────────────────────────────────────────────────────

function IntroView({ type, onStart, onBack }) {
  const isInitial = type === 'initial'
  const isPersonality = type === 'personality'
  const count     = isInitial ? 40 : isPersonality ? 30 : 12
  const time      = isInitial ? '~15' : isPersonality ? '~10' : '~5'
  const title     = isInitial ? 'Initial Assessment' : isPersonality ? 'Updated Personalization Assessment' : 'Weekly Check-In'
  const desc      = isInitial
    ? 'This one-time assessment establishes your baseline across six well-being dimensions and gives Aurora general personalization signals. It takes about 15 minutes and does not diagnose or define who you are.'
    : isPersonality
      ? 'Aurora now uses five continuous personalization signals instead of fixed personality types. Complete these 30 questions to keep using Aurora. Your existing wellness history will not be changed.'
    : "This weekly check-in tracks how you've been doing across all six well-being dimensions. Aurora uses it to keep your score profile current and spot meaningful changes over time."

  return (
    <div className="ci-intro">
      <h3 className="ci-intro-title">{title}</h3>
      <p className="ci-intro-desc">{desc}</p>

      <div className="ci-intro-stats">
        <div className="ci-stat">
          <div className="ci-stat-num">{count}</div>
          <div className="ci-stat-label">questions</div>
        </div>
        <div className="ci-stat">
          <div className="ci-stat-num">{time}</div>
          <div className="ci-stat-label">minutes</div>
        </div>
        <div className="ci-stat">
          <div className="ci-stat-num">{isInitial ? '1' : '6'}</div>
          <div className="ci-stat-label">{isInitial ? 'wellness + personalization profile' : 'categories scored'}</div>
        </div>
      </div>

      <p className="ci-intro-note">
        {isInitial
          ? 'For well-being questions, consider the past 1–2 weeks. For personalization statements, answer based on how you are most of the time. There are no right or wrong answers.'
          : "Answer based on how you've been feeling over the past 1–2 weeks, not just today. There are no right or wrong answers."}
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

function SurveyView({ questions, answers, setAnswers, initialIndex = 0, onIndexChange, onDone, onBack, submitting }) {
  const [idx, setIdx] = useState(() => Math.min(Math.max(initialIndex, 0), questions.length - 1))
  const [flashChoice, setFlashChoice] = useState(null)
  const advanceTimerRef = useRef(null)
  const q          = questions[idx]
  const total      = questions.length
  const isPersonality = q.dimension != null && q.options
  const selected   = answers[q.id]
  const pct        = (idx / total) * 100

  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
  }, [])

  useEffect(() => {
    onIndexChange?.(idx)
  }, [idx, onIndexChange])

  function pickAndAdvance(val) {
    if (submitting) return
    const isNewAnswer = selected == null
    const nextAnswers = { ...answers, [q.id]: val }
    setAnswers(nextAnswers)

    if (!isNewAnswer) return

    setFlashChoice(val)
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      setFlashChoice(null)
      if (idx < total - 1) setIdx((current) => current + 1)
      else onDone(nextAnswers)
    }, 180)
  }

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
        <span
          className="ci-type-badge"
          style={isPersonality
            ? { background: 'var(--accent-soft)', color: 'var(--accent-dark)', borderColor: 'rgba(77,107,88,0.25)' }
            : { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'rgba(77,107,88,0.25)' }
          }
        >
          {isPersonality ? 'Personalization' : 'Well-being'}
        </span>
      </div>

      {/* question */}
      <p className="ci-question-text">{q.text}</p>

      {/* answer input */}
      {isPersonality ? (
        <div className="ci-choice-grid">
          {q.options.map((opt, i) => (
            <button
              key={i}
              className={`ci-choice-btn${selected === i ? ' ci-choice-btn--on' : ''}${flashChoice === i ? ' ci-choice-btn--flash' : ''}`}
              onClick={() => pickAndAdvance(i)}
              disabled={submitting}
            >
              {opt.text}
            </button>
          ))}
        </div>
      ) : (
        <div className="ci-scale">
          <div className="ci-scale-btns">
            {[1, 2, 3, 4, 5, 6, 7].map(v => (
              <button
                key={v}
                className={`ci-scale-btn${selected === v ? ' ci-scale-btn--on' : ''}${flashChoice === v ? ' ci-scale-btn--flash' : ''}`}
                style={selected === v ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : {}}
                onClick={() => pickAndAdvance(v)}
                disabled={submitting}
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
      )}

      {/* nav */}
      <div className="ci-survey-nav">
        <button className="ci-back-btn" onClick={back} disabled={submitting}>← Back</button>
        <AsyncButton
          className="ci-next-btn"
          onClick={next}
          disabled={selected == null || submitting}
          pending={submitting && idx === total - 1}
          pendingLabel="Submitting…"
          style={{ opacity: selected != null ? 1 : 0.4, cursor: selected != null ? 'pointer' : 'not-allowed' }}
        >
          {idx === total - 1 ? 'Submit' : 'Next →'}
        </AsyncButton>
      </div>
    </div>
  )
}

// ─── results view ─────────────────────────────────────────────────────────────

function ResultsView({ surveyType, scores, prevScores, onDone }) {
  if (surveyType !== 'weekly') {
    return (
      <div className="ci-results ci-results--initial">
        <div className="ci-results-header">
          <h3 className="ci-results-title">Thanks — your check-in is complete.</h3>
          <p className="ci-results-sub">
            Your answers help Aurora adapt suggestions and approaches to what may work better for you over time.
          </p>
          <p className="ci-results-privacy">
            Personality responses are used as general personalization signals, not as a diagnosis or fixed description of who you are.
          </p>
        </div>
        <button className="ci-done-btn" onClick={onDone}>Continue to Aurora →</button>
      </div>
    )
  }

  const title = 'Check-in complete'
  const summary = 'Your responses have been saved. Come back next week to keep your streak going and continue tracking how you are doing.'

  const insightText = scores
    ? generateInsight(scores, prevScores)
    : 'Thank you for checking in. You can return to the dashboard whenever you are ready.'

  return (
    <div className="ci-results">
      <div className="ci-results-header">
        <h3 className="ci-results-title">{title}</h3>
        <p className="ci-results-sub">{summary}</p>
      </div>

      {/* aurora insight */}
      <div className="ci-insight">
        <div className="ci-insight-icon" style={{ background: '#3a6898' }}>A</div>
        <div className="ci-insight-body">
          <strong className="ci-insight-label" style={{ color: '#3a6898' }}>Aurora</strong>
          <p className="ci-insight-text">{insightText}</p>
        </div>
      </div>

      <button className="ci-done-btn" onClick={onDone}>Return to dashboard →</button>
    </div>
  )
}

// ─── root component ───────────────────────────────────────────────────────────

export default function CheckIns() {
  const { token, user, loading: userLoading, refreshUser } = useUser()
  const [view,    setView]    = useState('hub')
  const [surveyType, setSurveyType] = useState('weekly')
  const [questions,  setQuestions]  = useState([])
  const [answers,    setAnswers]    = useState({})
  const [draftIndex, setDraftIndex] = useState(0)
  const [draftRestored, setDraftRestored] = useState(false)
  const [latestScores, setLatestScores] = useState(null)
  const [latestPrevScores, setLatestPrevScores] = useState(null)
  const [history,  setHistory]  = useState(MOCK_HISTORY)
  const [serverSummary, setServerSummary] = useState({
    streak: getWeeklyStreak(MOCK_HISTORY),
    dueToday: isWeeklyCheckInDue(MOCK_HISTORY),
    lastCheckInDate: getLatestEntry(MOCK_HISTORY)?.date ?? null,
    hasInitialAssessment: MOCK_HISTORY.some((entry) => entry.type === 'initial'),
    hasCurrentPersonalityAssessment: true,
  })
  const [loadingState, setLoadingState] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [errorContext, setErrorContext] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const draftRestoreAttemptRef = useRef(null)
  const draftStorageKey = useMemo(() => getCheckInDraftStorageKey(user), [user])

  useEffect(() => {
    if (userLoading) return
    setHistoryLoaded(false)
    if (!token) {
      setHistory(MOCK_HISTORY)
      setServerSummary({
        streak: getWeeklyStreak(MOCK_HISTORY),
        dueToday: isWeeklyCheckInDue(MOCK_HISTORY),
        lastCheckInDate: getLatestEntry(MOCK_HISTORY)?.date ?? null,
        hasInitialAssessment: MOCK_HISTORY.some((entry) => entry.type === 'initial'),
        hasCurrentPersonalityAssessment: true,
      })
      setHistoryLoaded(true)
      return
    }

    let cancelled = false
    setLoadingState(true)
    setSaveError('')
    setErrorContext('')

    fetchCheckIns()
      .then((data) => {
        if (cancelled) return
        setHistory(data.history?.length ? data.history : [])
        setServerSummary({
          streak: data.streak ?? 0,
          dueToday: Boolean(data.dueThisWeek),
          lastCheckInDate: data.lastCheckInDate ?? null,
          hasInitialAssessment: Boolean(data.hasInitialAssessment),
          hasCurrentPersonalityAssessment: data.hasCurrentPersonalityAssessment === true,
        })
      })
      .catch((error) => {
        if (!cancelled) {
          setSaveError(error.message)
          setErrorContext('load')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingState(false)
          setHistoryLoaded(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, userLoading, reloadKey])

  useEffect(() => {
    if (!historyLoaded || draftRestoreAttemptRef.current === draftStorageKey) return
    draftRestoreAttemptRef.current = draftStorageKey
    const draft = loadCheckInDraft(draftStorageKey)
    if (!draft) return

    const isNoLongerValid = (
      draft.surveyType !== 'weekly' && serverSummary.hasCurrentPersonalityAssessment
    ) || (
      draft.surveyType === 'weekly'
      && (!serverSummary.hasCurrentPersonalityAssessment || !serverSummary.dueToday)
    )
    if (isNoLongerValid) {
      clearCheckInDraft(draftStorageKey)
      return
    }

    setSurveyType(draft.surveyType)
    setQuestions(draft.questions)
    setAnswers(draft.answers)
    setDraftIndex(draft.currentIndex)
    setDraftRestored(true)
    setView('survey')
  }, [draftStorageKey, historyLoaded, serverSummary])

  useEffect(() => {
    if (view !== 'survey' || !questions.length) return
    saveCheckInDraft(draftStorageKey, {
      surveyType,
      questions,
      answers,
      currentIndex: draftIndex,
    })
  }, [answers, draftIndex, draftStorageKey, questions, surveyType, view])

  function startSurvey(type) {
    const lastEntry = history[history.length - 1]
    const lastDisorderQIds = lastEntry?.qIds ?? []
    const qs = buildSurvey(type, lastDisorderQIds)
    setSurveyType(type)
    setQuestions(qs)
    setAnswers({})
    setDraftIndex(0)
    setDraftRestored(false)
    clearCheckInDraft(draftStorageKey)
    setView('intro')
  }

  function beginAnswering() { setView('survey') }

  async function onSurveyDone(completedAnswers = answers) {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setSaveError('')
    setErrorContext('')
    const scores = computeDisorderScores(completedAnswers, questions)
    setLatestScores(scores)

    // Personalization remains an internal, continuous signal rather than a user-facing type.
    let personality = null
    const hasPersonalityQs = questions.some(q => q.dimension != null)
    if (hasPersonalityQs) {
      personality = computePersonalityProfile(completedAnswers, questions)
    }

    if (token) {
      // save prev scores for insight before updating
      const prevEntry = getLatestWeeklyEntry(history)
      if (prevEntry) setLatestPrevScores(prevEntry.scores)

      try {
        const payload = {
          type: surveyType,
          qIds: questions.filter(q => q.cat).map(q => q.id),
          scores: surveyType === 'personality' ? {} : scores,
        }
        if (personality) payload.personality = personality
        const data = await submitCheckIn(payload)
        clearCheckInDraft(draftStorageKey)
        setDraftRestored(false)
        setHistory(data.history?.length ? data.history : [])
        setServerSummary({
          streak: data.streak ?? 0,
          dueToday: Boolean(data.dueThisWeek),
          lastCheckInDate: data.lastCheckInDate ?? null,
          hasInitialAssessment: Boolean(data.hasInitialAssessment),
          hasCurrentPersonalityAssessment: data.hasCurrentPersonalityAssessment === true,
        })
        // The check-in is already committed once this response arrives. A
        // profile refresh failure must not invite a duplicate submission.
        await refreshUser().catch(() => {})
        setSaveError('')
      } catch (error) {
        setSaveError(error.message)
        setErrorContext('submit')
        submittingRef.current = false
        setSubmitting(false)
        return
      }
    } else {
      const prevEntry = getLatestWeeklyEntry(history)
      if (prevEntry) setLatestPrevScores(prevEntry.scores)

      const newEntry = {
        id: `w${history.length + 1}`,
        date: formatDateKey(new Date()),
        type: surveyType,
        qIds: questions.filter(q => q.cat).map(q => q.id),
        scores,
      }
      const nextHistory = [...history, newEntry]
      clearCheckInDraft(draftStorageKey)
      setDraftRestored(false)
      setHistory(nextHistory)
      setServerSummary({
        streak: getWeeklyStreak(nextHistory),
        dueToday: isWeeklyCheckInDue(nextHistory),
        lastCheckInDate: getLatestEntry(nextHistory)?.date ?? null,
        hasInitialAssessment: nextHistory.some((entry) => entry.type === 'initial'),
        hasCurrentPersonalityAssessment: surveyType !== 'weekly' || serverSummary.hasCurrentPersonalityAssessment,
      })
      setSaveError('')
    }

    localStorage.setItem('aurora.checkin.last-completed', formatDateKey(new Date()))
    submittingRef.current = false
    setSubmitting(false)
    setView('results')
  }

  function onResultsDone() {
    setView('hub')
    setLatestScores(null)
    setLatestPrevScores(null)
  }

  const hasInitialAssessment = useMemo(() => serverSummary.hasInitialAssessment, [serverSummary])
  const hasCurrentPersonalityAssessment = useMemo(
    () => serverSummary.hasCurrentPersonalityAssessment,
    [serverSummary],
  )
  const streak = useMemo(() => serverSummary.streak, [serverSummary])
  const dueToday = useMemo(() => serverSummary.dueToday, [serverSummary])
  const latestEntryDate = useMemo(() => serverSummary.lastCheckInDate, [serverSummary])
  return (
    <section className="page ci-page">
      <style>{CI_STYLES}</style>

      <header className="page-header">
        <h2>Check-Ins</h2>
        <p>Short, regular surveys that track your well-being across six dimensions so Aurora can support you proactively.</p>
      </header>

      {saveError && (
        <FeedbackNotice
          variant="error"
          title={errorContext === 'load' ? 'Could not load your check-ins' : 'Could not submit your check-in'}
          message={saveError}
          onRetry={errorContext === 'load' ? () => setReloadKey((key) => key + 1) : () => onSurveyDone()}
          retryLabel={errorContext === 'load' ? 'Reload check-ins' : 'Retry submission'}
        />
      )}
      {loadingState && view === 'hub' && <LoadingState label="Loading your check-ins…" skeletonLines={3} />}
      {draftRestored && view === 'survey' && (
        <FeedbackNotice variant="info" message="Your unfinished check-in was restored." compact />
      )}

      {view === 'hub' && (
        <HubView
          streak={streak}
          dueToday={dueToday}
          lastCheckInDate={latestEntryDate}
          hasInitialAssessment={hasInitialAssessment}
          hasCurrentPersonalityAssessment={hasCurrentPersonalityAssessment}
          onStart={startSurvey}
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
          initialIndex={draftIndex}
          onIndexChange={setDraftIndex}
          onDone={onSurveyDone}
          onBack={() => setView('intro')}
          submitting={submitting}
        />
      )}

      {view === 'results' && (
        <ResultsView
          surveyType={surveyType}
          scores={latestScores}
          prevScores={latestPrevScores}
          onDone={onResultsDone}
        />
      )}
    </section>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const CI_STYLES = `
  .ci-page {
    min-height: calc(100vh - 220px);
    align-content: start;
  }

  .ci-section-label {
    font-size: var(--type-section-title); font-weight: var(--weight-section-title);
    letter-spacing: 0.02em; color: var(--muted);
    margin-bottom: 8px;
  }
  .ci-error {
    margin: 0 0 14px;
    padding: 10px 14px;
    border-radius: 14px;
    border: 1px solid rgba(239,68,68,0.2);
    background: rgba(239,68,68,0.08);
    color: #b91c1c;
    font-size: 0.84rem;
    font-weight: 600;
  }
  .ci-draft-restored {
    margin: 0 0 14px;
    padding: 10px 14px;
    border: 1px solid rgba(77,107,88,0.25);
    border-radius: 14px;
    background: var(--accent-soft);
    color: var(--accent-dark);
    font-size: 0.88rem;
    font-weight: 700;
  }
  .ci-loading {
    margin: 0 0 14px;
    color: var(--muted);
    font-size: 0.84rem;
  }

  /* ── hub ── */
  .ci-hub { display: flex; flex-direction: column; gap: 18px; }

  .ci-top-row { display: grid; grid-template-columns: 160px 1fr; gap: 14px; align-items: start; }

  .ci-streak-card {
    background: linear-gradient(135deg, #4d6b58, #3a5244);
    color: #fff; border-radius: 20px; padding: 20px;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    box-shadow: 0 8px 24px rgba(77,107,88,0.28);
    text-align: center;
  }
  .ci-streak-num   { font-size: 3rem; font-weight: 900; line-height: 1; }
  .ci-streak-label { font-size: 0.82rem; font-weight: 700; opacity: 0.88; letter-spacing: 0.04em; }
  .ci-streak-sub   { font-size: 0.73rem; opacity: 0.6; margin-top: 4px; }

  .ci-due-card {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 20px; padding: 20px 22px;
    display: flex; flex-direction: column; gap: 10px;
    box-shadow: var(--shadow);
  }
  .ci-due-card--due { border-color: rgba(77,107,88,0.28); background: rgba(210,228,220,0.4); }

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
    box-shadow: var(--shadow);
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
    box-shadow: var(--shadow);
    display: flex; flex-direction: column; gap: 16px;
    width: 100%;
    animation: fade-up 200ms ease;
  }
  .ci-intro-title {
    margin: 0;
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .ci-intro-desc  { margin: 0; font-size: 0.92rem; color: var(--muted); line-height: 1.6; }

  .ci-intro-stats { display: flex; gap: 24px; }
  .ci-stat { text-align: center; }
  .ci-stat-num   {
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 1.8rem;
    font-weight: 900;
    color: var(--ink);
    line-height: 1;
  }
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
    width: 100%;
    display: flex; flex-direction: column; gap: 20px;
    animation: fade-up 180ms ease;
  }

  .ci-prog-bar { height: 6px; border-radius: 999px; background: rgba(46,42,38,0.08); overflow: hidden; }
  .ci-prog-fill { height: 100%; border-radius: inherit; background: var(--accent); transition: width 280ms ease; }
  .ci-prog-row { display: flex; align-items: center; justify-content: space-between; }
  .ci-prog-count { font-size: 0.78rem; color: var(--muted); font-weight: 600; }
  .ci-type-badge {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px; border: 1px solid;
  }
  .ci-cat-tag {
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px; border: 1px solid;
  }

  .ci-question-text {
    margin: 0; font-size: 1.1rem; font-weight: 600;
    color: var(--ink); line-height: 1.5; letter-spacing: -0.01em;
  }

  /* personality choice buttons */
  .ci-choice-grid { display: flex; flex-direction: column; gap: 10px; }
  .ci-choice-btn {
    width: 100%; padding: 14px 18px; border-radius: 14px; text-align: left;
    border: 1.5px solid var(--line); background: var(--panel-strong);
    font-size: 0.92rem; font-weight: 500; color: var(--ink);
    transition: border-color 140ms, background 140ms, transform 120ms;
    cursor: pointer; line-height: 1.4;
  }
  .ci-choice-btn:hover { border-color: var(--accent); background: var(--accent-soft); transform: translateX(3px); }
  .ci-choice-btn--on {
    border-color: var(--accent); background: var(--accent-soft); font-weight: 700;
    transform: translateX(3px); box-shadow: 0 4px 14px rgba(77,107,88,0.14);
  }
  .ci-choice-btn--flash { animation: ci-choice-flash 180ms ease; }

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
  .ci-scale-btn--flash { animation: ci-scale-flash 180ms ease; }
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

  @keyframes ci-choice-flash {
    0% { transform: translateX(3px) scale(1); }
    50% { transform: translateX(3px) scale(1.015); }
    100% { transform: translateX(3px) scale(1); }
  }

  @keyframes ci-scale-flash {
    0% { transform: scale(1.06); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1.06); }
  }

  /* ── results ── */
  .ci-results { display: flex; flex-direction: column; gap: 20px; animation: fade-up 200ms ease; }
  .ci-results-header { }
  .ci-results-title {
    margin: 0;
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .ci-results-sub   { margin: 6px 0 0; color: var(--muted); font-size: 0.88rem; }
  .ci-results-privacy { margin: 14px 0 0; color: var(--muted); font-size: 0.82rem; line-height: 1.55; }
  .ci-results--initial { max-width: 680px; }

  .ci-score-bars { display: flex; flex-direction: column; gap: 10px; }
  .ci-score-row  { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .ci-score-cat  { font-size: 0.88rem; font-weight: 700; }

  .ci-band-legend { display: flex; flex-wrap: wrap; gap: 12px; }
  .ci-band-item { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--muted); }
  .ci-band-dot  { width: 10px; height: 10px; border-radius: 50%; }

  .ci-insight {
    display: flex; gap: 12px; padding: 16px 18px;
    background: rgba(77,107,88,0.06); border: 1px solid rgba(77,107,88,0.18);
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
