import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const NEAR_BOTTOM_THRESHOLD = 112

function parseTimestamp(value) {
  const parsed = value ? new Date(value) : new Date()
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export function isSameMessageDay(left, right) {
  if (!left || !right) return false
  const a = parseTimestamp(left)
  const b = parseTimestamp(right)
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function formatMessageTime(value) {
  return parseTimestamp(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatConversationDate(value, now = new Date()) {
  const date = parseTimestamp(value)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDifference = Math.round((today - messageDay) / 86400000)
  if (dayDifference === 0) return 'Today'
  if (dayDifference === 1) return 'Yesterday'
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ConversationDateSeparator({ timestamp }) {
  return (
    <div className="conversation-date-separator" role="separator" aria-label={formatConversationDate(timestamp)}>
      <span>{formatConversationDate(timestamp)}</span>
    </div>
  )
}

export function CopyMessageButton({ text, inverse = false }) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef(null)

  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.clearTimeout(resetTimer.current)
      resetTimer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      className={`conversation-copy${inverse ? ' conversation-copy--inverse' : ''}`}
      type="button"
      onClick={copyMessage}
      aria-label={copied ? 'Message copied' : 'Copy message'}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function NewMessagesButton({ count, onClick }) {
  if (!count) return null
  return (
    <button className="conversation-new-messages" type="button" onClick={onClick}>
      {count === 1 ? '1 new message' : `${count} new messages`}
    </button>
  )
}

export function LoadEarlierButton({ loading, onClick }) {
  return (
    <button className="conversation-load-earlier" type="button" onClick={onClick} disabled={loading}>
      {loading ? 'Loading earlier messages...' : 'Load earlier messages'}
    </button>
  )
}

export function useConversationScroll(messages, { loading = false, reduceMotion = false } = {}) {
  const containerRef = useRef(null)
  const initialScrollDone = useRef(false)
  const nearBottomRef = useRef(true)
  const pendingScrollRef = useRef(null)
  const prependSnapshotRef = useRef(null)
  const [newMessageCount, setNewMessageCount] = useState(0)

  const updateNearBottom = useCallback(() => {
    const element = containerRef.current
    if (!element) return true
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= NEAR_BOTTOM_THRESHOLD
    nearBottomRef.current = nearBottom
    if (nearBottom) setNewMessageCount(0)
    return nearBottom
  }, [])

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const element = containerRef.current
    if (!element) return
    element.scrollTo({
      top: element.scrollHeight,
      behavior: reduceMotion || behavior === 'auto' ? 'auto' : 'smooth',
    })
    nearBottomRef.current = true
    setNewMessageCount(0)
  }, [reduceMotion])

  const prepareAppend = useCallback((count = 1) => {
    const shouldFollow = nearBottomRef.current
    pendingScrollRef.current = shouldFollow ? 'bottom' : null
    if (!shouldFollow && count > 0) setNewMessageCount((current) => current + count)
  }, [])

  const preparePrepend = useCallback(() => {
    const element = containerRef.current
    if (!element) return
    prependSnapshotRef.current = {
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    }
  }, [])

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element || loading) return

    if (prependSnapshotRef.current) {
      const snapshot = prependSnapshotRef.current
      prependSnapshotRef.current = null
      element.scrollTop = snapshot.scrollTop + (element.scrollHeight - snapshot.scrollHeight)
      return
    }

    if (!initialScrollDone.current) {
      initialScrollDone.current = true
      scrollToBottom('auto')
      return
    }

    if (pendingScrollRef.current === 'bottom') {
      pendingScrollRef.current = null
      scrollToBottom()
    }
  }, [loading, messages, scrollToBottom])

  return {
    containerRef,
    newMessageCount,
    onScroll: updateNearBottom,
    prepareAppend,
    preparePrepend,
    scrollToBottom,
  }
}