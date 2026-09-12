import { useEffect, useMemo, useRef, useState } from 'react'
import { AsyncButton } from '../components/ui/feedback.jsx'
import { useUser } from '../context/UserContext.jsx'
import {
  CRISIS_SUPPORT_URL,
  DISORDER_LABELS,
  DISORDERS,
  QUIZ_BANK,
  SOURCE_CHECKED_LABEL,
  WHO_OVERVIEW_URL,
} from './InfoLibrary.data.js'
import './InfoLibrary.css'

const QUIZ_STORAGE_VERSION = 2
const QUIZ_STORAGE_PREFIX = 'aurora.infoLibrary.quizSession.v2'
const TAB_STORAGE_PREFIX = 'aurora.infoLibrary.activeTab.v2'
const VALID_DISORDER_IDS = new Set(DISORDERS.map((item) => item.id))

function shuffle(items) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy
}

function buildQuizRound() {
  return shuffle(DISORDERS.map((disorder) => {
    const [clue, options, correct, explanation] = shuffle(QUIZ_BANK[disorder.id])[0]
    return { disorderId: disorder.id, clue, options: shuffle(options), correct, explanation }
  }))
}

function createQuizSession() {
  return {
    version: QUIZ_STORAGE_VERSION,
    questions: buildQuizRound(),
    idx: 0,
    selected: null,
    score: 0,
    done: false,
    answers: [],
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isQuizQuestion(value) {
  return value
    && typeof value === 'object'
    && VALID_DISORDER_IDS.has(value.disorderId)
    && isNonEmptyString(value.clue)
    && Array.isArray(value.options)
    && value.options.length === 4
    && value.options.every(isNonEmptyString)
    && new Set(value.options).size === value.options.length
    && value.options.includes(value.correct)
    && isNonEmptyString(value.explanation)
}

function isQuizAnswer(value, question) {
  return value
    && typeof value === 'object'
    && value.disorderId === question.disorderId
    && value.clue === question.clue
    && value.correct === question.correct
    && question.options.includes(value.selected)
    && value.explanation === question.explanation
}

function isValidQuizSession(value) {
  if (!value || typeof value !== 'object' || value.version !== QUIZ_STORAGE_VERSION) return false
  if (!Array.isArray(value.questions) || value.questions.length !== DISORDERS.length) return false
  if (!value.questions.every(isQuizQuestion)) return false
  if (new Set(value.questions.map((question) => question.disorderId)).size !== DISORDERS.length) return false
  if (!Number.isInteger(value.idx) || value.idx < 0 || value.idx >= value.questions.length) return false
  if (!Number.isInteger(value.score) || value.score < 0 || value.score > value.questions.length) return false
  if (typeof value.done !== 'boolean' || !Array.isArray(value.answers)) return false

  const currentQuestion = value.questions[value.idx]
  if (value.selected !== null && !currentQuestion.options.includes(value.selected)) return false
  if (value.done && value.selected === null) return false

  const expectedAnswers = value.done
    ? value.questions.length
    : value.idx + (value.selected === null ? 0 : 1)
  if (value.answers.length !== expectedAnswers) return false
  if (!value.answers.every((answer, index) => isQuizAnswer(answer, value.questions[index]))) return false

  const calculatedScore = value.answers.filter((answer) => answer.selected === answer.correct).length
  return calculatedScore === value.score
}

function getStorageScope(user) {
  return String(user?.id ?? user?.username ?? 'current-user')
}

function loadQuizSession(storageKey) {
  if (typeof window === 'undefined') return createQuizSession()
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(storageKey))
    return isValidQuizSession(stored) ? stored : createQuizSession()
  } catch {
    return createQuizSession()
  }
}

function loadActiveTab(storageKey) {
  if (typeof window === 'undefined') return 'library'
  try {
    return window.sessionStorage.getItem(storageKey) === 'quiz' ? 'quiz' : 'library'
  } catch {
    return 'library'
  }
}

function ExternalContext() {
  return <span className='il-visually-hidden'> (opens in a new tab)</span>
}

function DisorderCard({ disorder, open, onToggle }) {
  const triggerId = `il-condition-${disorder.id}-trigger`
  const panelId = `il-condition-${disorder.id}-panel`

  return (
    <article className={`il-card${open ? ' il-card--open' : ''}`}>
      <button
        className='il-card-header'
        id={triggerId}
        type='button'
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className='il-card-dot' style={{ backgroundColor: disorder.color }} aria-hidden='true' />
        <span className='il-card-title'>{disorder.title}</span>
        <span className='il-chevron' aria-hidden='true'>{open ? 'Close' : 'Open'}</span>
      </button>

      {open && (
        <div className='il-card-body' id={panelId} role='region' aria-labelledby={triggerId}>
          <div className='il-source-row'>
            <span className='il-source-heading'>Source</span>
            <a href={disorder.sourceUrl} target='_blank' rel='noopener noreferrer'>
              {disorder.source}
              <ExternalContext />
            </a>
            <span className='il-source-date'>{SOURCE_CHECKED_LABEL}</span>
          </div>

          <section className='il-section il-section--definition'>
            <h4 className='il-section-label'>What it is</h4>
            <p className='il-section-text'>{disorder.what}</p>
          </section>

          <div className='il-cols'>
            <section className='il-section'>
              <h4 className='il-section-label'>Common signs and experiences</h4>
              <ul className='il-list'>
                {disorder.symptoms.map((symptom) => <li key={symptom}>{symptom}</li>)}
              </ul>
            </section>
            <section className='il-section'>
              <h4 className='il-section-label'>Contributing factors</h4>
              <ul className='il-list'>
                {disorder.causes.map((cause) => <li key={cause}>{cause}</li>)}
              </ul>
            </section>
          </div>

          <section className='il-section il-section--treatment'>
            <h4 className='il-section-label'>Treatment and support</h4>
            <ul className='il-list'>
              {disorder.treatment.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <a className='il-article-link' href={disorder.sourceUrl} target='_blank' rel='noopener noreferrer'>
            Read the source article <span aria-hidden='true'>↗</span>
            <ExternalContext />
          </a>
        </div>
      )}
    </article>
  )
}

function LibraryTab({ openConditions, onToggleCondition }) {
  return (
    <div className='il-library'>
      <aside className='il-source-note' aria-labelledby='il-source-note-title'>
        <div className='il-source-note-copy'>
          <strong id='il-source-note-title'>Eight mental health conditions and condition groups</strong>
          <p>
            Concise educational summaries based on linked Mayo Clinic condition pages and the{' '}
            <a href={WHO_OVERVIEW_URL} target='_blank' rel='noopener noreferrer'>
              WHO mental disorders overview
              <ExternalContext />
            </a>.
          </p>
          <p className='il-source-note-meta'>{SOURCE_CHECKED_LABEL}</p>
        </div>
        <div className='il-care-note'>
          <strong>Information, not diagnosis.</strong>
          <p>
            These summaries and the quiz cannot diagnose a condition or replace care from a qualified professional.
            If you may act on thoughts of suicide or self-harm, call or text 988 in the U.S. or contact local emergency services.
          </p>
          <a href={CRISIS_SUPPORT_URL} target='_blank' rel='noopener noreferrer'>
            Visit the 988 Lifeline
            <ExternalContext />
          </a>
        </div>
      </aside>

      <div className='il-disorders-list'>
        {DISORDERS.map((disorder) => (
          <DisorderCard
            key={disorder.id}
            disorder={disorder}
            open={openConditions.has(disorder.id)}
            onToggle={() => onToggleCondition(disorder.id)}
          />
        ))}
      </div>
    </div>
  )
}

function QuizTab({ session, setSession, active, onReviewLibrary, onReviewTopic }) {
  const { questions, idx, selected, score, done, answers } = session
  const feedbackRef = useRef(null)
  const questionRef = useRef(null)
  const resultsHeadingRef = useRef(null)
  const pendingFeedbackFocusRef = useRef(false)
  const pendingResultsFocusRef = useRef(false)
  const previousIdxRef = useRef(idx)
  const question = questions[idx]
  const total = questions.length

  useEffect(() => {
    if (!active || !selected || !pendingFeedbackFocusRef.current || !feedbackRef.current) return
    pendingFeedbackFocusRef.current = false
    feedbackRef.current.focus({ preventScroll: true })
    feedbackRef.current.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [active, selected])

  useEffect(() => {
    if (!active || previousIdxRef.current === idx) return
    previousIdxRef.current = idx
    questionRef.current?.focus({ preventScroll: true })
    questionRef.current?.scrollIntoView({ block: 'nearest' })
  }, [active, idx])

  useEffect(() => {
    if (!active || !done || !pendingResultsFocusRef.current) return
    pendingResultsFocusRef.current = false
    resultsHeadingRef.current?.focus({ preventScroll: true })
    resultsHeadingRef.current?.scrollIntoView({ block: 'nearest' })
  }, [active, done])

  function choose(option) {
    if (selected) return
    pendingFeedbackFocusRef.current = true
    setSession((previous) => {
      const currentQuestion = previous.questions[previous.idx]
      const correct = option === currentQuestion.correct
      return {
        ...previous,
        selected: option,
        score: correct ? previous.score + 1 : previous.score,
        answers: [...previous.answers, {
          disorderId: currentQuestion.disorderId,
          clue: currentQuestion.clue,
          correct: currentQuestion.correct,
          selected: option,
          explanation: currentQuestion.explanation,
        }],
      }
    })
  }

  function next() {
    if (idx + 1 >= total) pendingResultsFocusRef.current = true
    setSession((previous) => {
      if (previous.idx + 1 >= previous.questions.length) {
        return { ...previous, done: true }
      }
      return { ...previous, idx: previous.idx + 1, selected: null }
    })
  }

  function restart() {
    setSession(createQuizSession())
  }

  if (done) {
    const percentage = Math.round((score / total) * 100)
    const missed = answers.filter((answer) => answer.selected !== answer.correct)
    const result = percentage >= 90
      ? {
          title: 'Strong understanding',
          message: 'You identified the central ideas across these conditions and condition groups.',
        }
      : percentage >= 70
        ? {
            title: 'A solid foundation',
            message: 'Review the explanations below, then revisit any topics that still feel unclear.',
          }
        : {
            title: 'Review and revisit',
            message: 'Use the explanations below as a guide, then return to the Library when you are ready.',
          }

    return (
      <div className='il-results' aria-labelledby='il-results-heading'>
        <div className='il-results-summary'>
          <div className='il-results-score' role='img' aria-label={`${score} out of ${total} correct`}>
            <span className='il-results-num'>{score}<span className='il-results-total'>/{total}</span></span>
            <span className='il-results-sub'>correct</span>
          </div>
          <div className='il-results-copy'>
            <p className='il-results-kicker'>Quiz complete</p>
            <h3 className='il-results-heading' id='il-results-heading' ref={resultsHeadingRef} tabIndex='-1'>{result.title}</h3>
            <p className='il-results-msg'>{result.message}</p>
          </div>
        </div>

        {missed.length > 0 && (
          <section className='il-missed-section' aria-labelledby='il-missed-heading'>
            <h4 className='il-missed-label' id='il-missed-heading'>Review missed questions</h4>
            <div className='il-missed-list'>
              {missed.map((answer, index) => (
                <article key={`${answer.clue}-${index}`} className='il-missed-card'>
                  <h5 className='il-missed-clue'>{answer.clue}</h5>
                  <dl className='il-missed-answer-row'>
                    <div className='il-missed-answer'>
                      <dt>Your answer</dt>
                      <dd className='il-missed-wrong'>{answer.selected}</dd>
                    </div>
                    <div className='il-missed-answer'>
                      <dt>Correct answer</dt>
                      <dd className='il-missed-right'>{answer.correct}</dd>
                    </div>
                  </dl>
                  <p className='il-missed-note'>{answer.explanation}</p>
                  <button className='il-review-link' type='button' onClick={() => onReviewTopic(answer.disorderId)}>
                    Review {DISORDER_LABELS[answer.disorderId]}
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className='il-results-actions'>
          <button className='il-secondary-btn' type='button' onClick={onReviewLibrary}>Review library</button>
          <button className='il-primary-btn' type='button' onClick={restart}>Try another quiz</button>
        </div>
      </div>
    )
  }

  const answeredCorrectly = selected === question.correct

  return (
    <div className='il-quiz'>
      <p className='il-quiz-guidance' id='il-quiz-guidance'>
        Eight questions check your understanding of the Library. This quiz cannot assess or diagnose a mental health condition.
      </p>

      <div className='il-quiz-header'>
        <div
          className='il-progress-bar'
          role='progressbar'
          aria-label='Quiz progress'
          aria-valuemin='1'
          aria-valuemax={total}
          aria-valuenow={idx + 1}
          aria-valuetext={`Question ${idx + 1} of ${total}`}
        >
          <div className='il-progress-fill' style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
        <span className='il-progress-label' aria-hidden='true'>{idx + 1} / {total}</span>
      </div>

      <div className='il-clue-card'>
        <p className='il-clue-eyebrow'>Choose the most accurate answer</p>
        <h3 className='il-clue-text' id='il-quiz-question' ref={questionRef} tabIndex='-1'>{question.clue}</h3>
      </div>

      <div className='il-options' role='group' aria-labelledby='il-quiz-question' aria-describedby='il-quiz-guidance'>
        {question.options.map((option) => {
          const isSelected = selected === option
          const isCorrect = option === question.correct
          const showCorrect = Boolean(selected && isCorrect)
          const showWrong = Boolean(selected && isSelected && !isCorrect)
          const resultLabel = showCorrect ? 'Correct answer' : showWrong ? 'Your answer' : null

          return (
            <button
              key={option}
              type='button'
              className={`il-option${showCorrect ? ' il-option--correct' : ''}${showWrong ? ' il-option--wrong' : ''}${selected && !isSelected && !isCorrect ? ' il-option--dim' : ''}`}
              onClick={() => choose(option)}
              disabled={Boolean(selected)}
              aria-pressed={isSelected}
            >
              <span className='il-option-text'>{option}</span>
              {resultLabel && <span className='il-option-result'>{resultLabel}</span>}
            </button>
          )
        })}
      </div>

      {selected && (
        <div
          className={`il-feedback${answeredCorrectly ? ' il-feedback--correct' : ' il-feedback--wrong'}`}
          ref={feedbackRef}
          role='status'
          aria-live='polite'
          aria-atomic='true'
          tabIndex='-1'
        >
          <strong>{answeredCorrectly ? 'Correct' : `The most accurate answer is: ${question.correct}`}</strong>
          <p>{question.explanation}</p>
          <div className='il-feedback-actions'>
            <button className='il-review-link' type='button' onClick={() => onReviewTopic(question.disorderId)}>
              Review {DISORDER_LABELS[question.disorderId]}
            </button>
            <AsyncButton className='il-next-btn' onClick={next}>
              {idx + 1 >= total ? 'See results' : 'Next question'}
            </AsyncButton>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InfoLibrary() {
  const { user } = useUser()
  const storageScope = useMemo(() => getStorageScope(user), [user?.id, user?.username])
  const quizStorageKey = `${QUIZ_STORAGE_PREFIX}:${storageScope}`
  const tabStorageKey = `${TAB_STORAGE_PREFIX}:${storageScope}`
  const [tab, setTab] = useState(() => loadActiveTab(tabStorageKey))
  const [quizSession, setQuizSession] = useState(() => loadQuizSession(quizStorageKey))
  const [openConditions, setOpenConditions] = useState(() => new Set())
  const tabRefs = useRef({})
  const focusFrameRef = useRef(null)

  useEffect(() => {
    try {
      window.sessionStorage.setItem(quizStorageKey, JSON.stringify(quizSession))
    } catch {
      // The quiz still works when browser storage is unavailable.
    }
  }, [quizSession, quizStorageKey])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(tabStorageKey, tab)
    } catch {
      // Tab selection remains available for the current render.
    }
  }, [tab, tabStorageKey])

  useEffect(() => () => {
    if (focusFrameRef.current) cancelAnimationFrame(focusFrameRef.current)
  }, [])

  function selectTab(nextTab, moveFocus = false) {
    setTab(nextTab)
    if (!moveFocus) return
    if (focusFrameRef.current) cancelAnimationFrame(focusFrameRef.current)
    focusFrameRef.current = requestAnimationFrame(() => tabRefs.current[nextTab]?.focus())
  }

  function toggleCondition(disorderId) {
    setOpenConditions((previous) => {
      const next = new Set(previous)
      if (next.has(disorderId)) next.delete(disorderId)
      else next.add(disorderId)
      return next
    })
  }

  function reviewTopic(disorderId) {
    setOpenConditions((previous) => new Set(previous).add(disorderId))
    selectTab('library')
    if (focusFrameRef.current) cancelAnimationFrame(focusFrameRef.current)
    focusFrameRef.current = requestAnimationFrame(() => {
      const trigger = document.getElementById(`il-condition-${disorderId}-trigger`)
      trigger?.focus({ preventScroll: true })
      trigger?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  function handleTabKeyDown(event) {
    const tabs = ['library', 'quiz']
    const currentIndex = tabs.indexOf(tab)
    let nextIndex = null

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    selectTab(tabs[nextIndex], true)
  }

  return (
    <section className='page il-page'>
      <header className='il-page-header'>
        <h2 className='il-page-title'>Mental Health Library</h2>
        <p className='il-page-sub'>
          Clear introductions to eight conditions and condition groups, with a quiz to reinforce what you learn.
        </p>
      </header>

      <div className='il-tabs' role='tablist' aria-label='Information library sections' onKeyDown={handleTabKeyDown}>
        <button
          className={`il-tab${tab === 'library' ? ' il-tab--active' : ''}`}
          id='il-tab-library'
          ref={(node) => { tabRefs.current.library = node }}
          type='button'
          role='tab'
          aria-selected={tab === 'library'}
          aria-controls='il-panel-library'
          tabIndex={tab === 'library' ? 0 : -1}
          onClick={() => selectTab('library')}
        >
          Library
        </button>
        <button
          className={`il-tab${tab === 'quiz' ? ' il-tab--active' : ''}`}
          id='il-tab-quiz'
          ref={(node) => { tabRefs.current.quiz = node }}
          type='button'
          role='tab'
          aria-selected={tab === 'quiz'}
          aria-controls='il-panel-quiz'
          tabIndex={tab === 'quiz' ? 0 : -1}
          onClick={() => selectTab('quiz')}
        >
          Quiz
        </button>
      </div>

      <div id='il-panel-library' role='tabpanel' aria-labelledby='il-tab-library' hidden={tab !== 'library'}>
        <LibraryTab openConditions={openConditions} onToggleCondition={toggleCondition} />
      </div>
      <div id='il-panel-quiz' role='tabpanel' aria-labelledby='il-tab-quiz' hidden={tab !== 'quiz'}>
        <QuizTab
          session={quizSession}
          setSession={setQuizSession}
          active={tab === 'quiz'}
          onReviewLibrary={() => selectTab('library', true)}
          onReviewTopic={reviewTopic}
        />
      </div>
    </section>
  )
}
