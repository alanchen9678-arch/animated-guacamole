import { useEffect, useRef, useState } from 'react'

import { ChatInput, ChatInputSubmit, ChatInputTextArea } from '../components/ui/chat-input.jsx'
import { fetchChatHistory, sendChatMessage } from '../services/api.js'
import { FeedbackNotice, LoadingState } from '../components/ui/feedback.jsx'

const CHATBOT_ONBOARDING_STORAGE_KEY = 'aurora.chatbot.onboarding'

function loadChatbotOnboardingState() {
  try {
    return window.localStorage.getItem(CHATBOT_ONBOARDING_STORAGE_KEY) === 'started'
  } catch {
    return false
  }
}

function saveChatbotOnboardingState() {
  try {
    window.localStorage.setItem(CHATBOT_ONBOARDING_STORAGE_KEY, 'started')
  } catch {
    // Storage can be unavailable in some private browsing modes.
  }
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatMessageTime(value) {
  if (!value) return timestamp()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return timestamp()
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function defaultGreeting() {
  return {
    id: 0,
    role: 'ai',
    text: "Hi, I'm Aurora. I'm here to listen with warmth and honesty. What's on your mind today?",
    time: timestamp(),
  }
}

function TypingIndicator() {
  return (
    <div className="msg-row msg-row--ai" role="status" aria-live="polite" aria-label="Aurora is typing">
      <div className="msg-avatar" aria-hidden="true">A</div>
      <div className="bubble bubble--ai typing-bubble">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`msg-row${isUser ? ' msg-row--user' : ' msg-row--ai'}`}>
      <span className="chat-speaker-label">{isUser ? 'You' : 'Aurora'}</span>
      {!isUser && <div className="msg-avatar" aria-hidden="true">A</div>}
      <div className={`bubble${isUser ? ' bubble--user' : ' bubble--ai'}`}>
        <p className="bubble-text">{msg.text}</p>
        <span className="bubble-time">{msg.time}</span>
      </div>
    </div>
  )
}

function ChatbotIntro({ onStart }) {
  return (
    <section className="page">
      <div className="intro-wrap">
        <p className="intro-eyebrow">Aurora · AI Chatbot</p>
        <h2 className="intro-heading">Your 24/7 Mental Wellness Companion</h2>

        <p className="intro-body">
          Aurora gives you access to an interactive AI chatbot you can reach any time of day or
          night. It is designed to feel calm, supportive, and realistic while staying connected to
          the rest of the platform.
        </p>

        <div className="intro-actions">
          <div className="disclaimer-box">
            <div className="disclaimer-icon">!</div>
            <p>
              Aurora&apos;s chatbot is <strong>not a replacement for professional mental health
              care.</strong> If someone seems at risk, they should be directed to a crisis line,
              emergency services, or a licensed clinician.
            </p>
          </div>

          <button className="start-btn" onClick={onStart}>
            Start chatting →
          </button>
        </div>
      </div>
    </section>
  )
}

function ChatbotChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [chatError, setChatError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const messagesRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    let isActive = true

    async function loadHistory() {
      setIsLoadingHistory(true)
      setChatError(null)
      try {
        const history = await fetchChatHistory()
        if (!isActive) return

        if (history.length === 0) {
          setMessages([defaultGreeting()])
          return
        }

        setMessages(
          history.map((message) => ({
            id: message.id,
            role: message.role === 'assistant' ? 'ai' : message.role,
            text: message.content,
            time: formatMessageTime(message.timestamp),
          })),
        )
      } catch (error) {
        if (!isActive) return
        setMessages([defaultGreeting()])
        setChatError({
          type: 'history',
          message: error.message || 'Your previous conversation could not be loaded.',
        })
      } finally {
        if (isActive) setIsLoadingHistory(false)
      }
    }

    loadHistory()

    return () => {
      isActive = false
    }
  }, [reloadKey])

  useEffect(() => {
    const messagesEl = messagesRef.current
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'auto' })
    inputRef.current?.focus()
  }, [isLoadingHistory])

  useEffect(() => {
    const messagesEl = messagesRef.current
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' })
    if (!isTyping) inputRef.current?.focus()
  }, [messages, isTyping])

  async function sendMessage() {
    const text = input.trim()
    if (!text || isTyping || isLoadingHistory) return

    const userMsg = { id: Date.now(), role: 'user', text, time: timestamp() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    await deliverMessage(text)
  }

  async function deliverMessage(text) {
    setIsTyping(true)
    setChatError(null)

    try {
      const reply = await sendChatMessage(text)
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'ai', text: reply, time: timestamp() },
      ])
    } catch (error) {
      setChatError({
        type: 'send',
        message: error.message || "I'm having trouble reaching the server right now.",
        lastText: text,
      })
    } finally {
      setIsTyping(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="chat-root">
      <div className="chat-messages" ref={messagesRef}>
        <div className="chat-conversation">
          {isLoadingHistory && <LoadingState label="Loading your conversation…" compact skeletonLines={3} />}
          {messages.map((message) => <Message key={message.id} msg={message} />)}
          {isTyping && <TypingIndicator />}
          {chatError && (
            <FeedbackNotice
              variant="error"
              title={chatError.type === 'history' ? 'Could not load your conversation' : 'Message not sent'}
              message={chatError.message}
              onRetry={chatError.type === 'history'
                ? () => setReloadKey((key) => key + 1)
                : () => deliverMessage(chatError.lastText)}
              retryLabel={chatError.type === 'history' ? 'Reload conversation' : 'Retry message'}
              compact
            />
          )}
        </div>
      </div>

      <div className="chat-input-bar">
        <ChatInput
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onSubmit={sendMessage}
          loading={isTyping || isLoadingHistory}
          className="chat-compose"
        >
          <ChatInputTextArea
            ref={inputRef}
            className="chat-textarea"
            placeholder={'Message Aurora\u2026'}
            disabled={isTyping || isLoadingHistory}
          />
          <ChatInputSubmit
            className="send-btn"
            disabled={isLoadingHistory}
          />
        </ChatInput>
      </div>
    </div>
  )
}

const styles = `
  .intro-wrap {
    width: min(100%, 820px);
    padding-top: clamp(12px, 4vh, 42px);
    font-family: "Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }
  .intro-eyebrow {
    display: none;
  }
  .intro-heading {
    margin: 0 0 10px;
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: var(--type-page-title);
    font-weight: var(--weight-page-title);
    line-height: 1.15;
    letter-spacing: -0.03em;
  }
  .intro-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 0.78rem;
    font-weight: 700;
    margin-bottom: 20px;
  }
  .intro-body {
    max-width: 62ch;
    color: var(--muted);
    font-size: var(--type-body);
    font-weight: 400;
    line-height: 1.65;
    margin: 0;
  }
  .intro-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 24px;
    margin-top: clamp(32px, 6vh, 64px);
    padding-top: 24px;
    border-top: 1px solid var(--line);
  }
  .disclaimer-box {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 16px;
    padding: 16px 18px;
    margin: 0;
  }
  .disclaimer-icon {
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(251, 191, 36, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78rem;
    font-weight: 800;
    color: #92400e;
    margin-top: 1px;
  }
  .disclaimer-box p { margin: 0; font-size: 0.88rem; color: #78350f; line-height: 1.55; }
  .start-btn {
    white-space: nowrap;
    padding: 14px 36px;
    border-radius: 999px;
    border: none;
    background: var(--accent);
    color: #fff;
    font-size: 1rem;
    font-weight: 700;
    transition: opacity 140ms, transform 140ms;
  }
  .start-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .chat-root {
    --chat-column-width: 940px;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    background: var(--panel-strong);
    border: 1px solid var(--line);
    border-radius: 22px;
    overflow: hidden;
    box-sizing: border-box;
  }
  .msg-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--accent-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 800;
    font-size: 0.9rem;
    flex: none;
  }
  .chat-messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable;
    scroll-behavior: smooth;
  }
  .chat-conversation {
    width: 100%;
    min-height: 100%;
    padding: 20px 20px 8px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-sizing: border-box;
  }
  .msg-row {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    animation: fade-up 180ms ease;
  }
  .msg-row--user { flex-direction: row-reverse; }
  .msg-avatar {
    width: 30px;
    height: 30px;
    font-size: 0.65rem;
    margin-bottom: 2px;
  }
  .msg-avatar--user {
    background-image: none;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.24);
  }
  .bubble {
    max-width: 68%;
    padding: 11px 15px 8px;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bubble--ai {
    background: #e8f1f9;
    border: none;
    border-bottom-left-radius: 6px;
  }
  .bubble--user {
    background: var(--accent);
    border-bottom-right-radius: 6px;
  }
  .bubble-text {
    margin: 0;
    font-size: 0.92rem;
    line-height: 1.55;
    color: var(--ink);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .bubble--user .bubble-text { color: #fff; }
  .bubble-time {
    font-size: 0.68rem;
    color: rgba(46, 42, 38, 0.4);
    align-self: flex-end;
    white-space: nowrap;
  }
  .bubble--user .bubble-time { color: rgba(255, 255, 255, 0.65); }
  .typing-bubble {
    padding: 14px 18px;
    flex-direction: row;
    align-items: center;
    gap: 5px;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--muted);
    animation: dot-bounce 1.2s infinite ease-in-out;
    flex: none;
  }
  .dot:nth-child(2) { animation-delay: 0.18s; }
  .dot:nth-child(3) { animation-delay: 0.36s; }
  @keyframes dot-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
    30% { transform: translateY(-6px); opacity: 1; }
  }
  .chat-input-bar {
    padding: 12px 14px;
    border-top: 1px solid rgba(46, 42, 38, 0.12);
    background: transparent;
    flex: none;
    box-shadow: 0 -8px 24px rgba(46, 42, 38, 0.04);
  }
  .chat-compose { width: 100%; }
  .chat-textarea {
    min-height: 26px;
    max-height: 120px;
  }
  .send-btn {
    width: 40px;
    height: 40px;
  }
  .send-btn.aurora-chat-input__submit {
    background: var(--accent-dark);
    border-color: rgba(58, 82, 68, 0.34);
  }
  .send-btn.aurora-chat-input__submit:hover:not(:disabled) {
    background: #31483a;
  }
  .send-btn.aurora-chat-input__submit:disabled {
    background: var(--accent-dark);
    border-color: rgba(58, 82, 68, 0.22);
    opacity: 0.42;
  }
  /* Quiet Care Workspace: the app shell is the chat container. */
  .app-root .chat-root {
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .app-root .chat-messages {
    width: 100%;
    margin-inline: 0;
    padding: 0;
  }
  .app-root .chat-conversation {
    width: min(100%, var(--chat-column-width));
    margin-inline: auto;
    padding: 24px 8px 20px;
    gap: 18px;
  }
  .app-root .msg-row {
    align-items: flex-start;
    gap: 10px;
  }
  .chat-speaker-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .app-root .msg-row--user {
    flex-direction: row;
    justify-content: flex-end;
  }
  .app-root .msg-avatar {
    width: 28px;
    height: 28px;
    margin: 2px 0 0;
    font-size: 0.62rem;
  }
  .app-root .bubble {
    padding: 12px 14px 9px;
    border-radius: 14px;
    gap: 5px;
  }
  .app-root .bubble--ai {
    max-width: 75%;
    border: 1px solid var(--line);
    border-bottom-left-radius: 14px;
    background: var(--panel-soft);
  }
  .app-root .bubble--user {
    max-width: 70%;
    border-bottom-right-radius: 14px;
    background: var(--accent-dark);
  }
  .app-root .bubble-text {
    font-size: 0.9375rem;
    line-height: 1.6;
  }
  .app-root .bubble-time {
    margin-top: 2px;
    color: var(--muted);
    font-size: 0.6875rem;
    line-height: 1.2;
  }
  .app-root .bubble--user .bubble-time {
    color: rgba(255, 255, 255, 0.72);
  }
  .app-root .typing-bubble {
    padding: 12px 14px;
  }
  .app-root .chat-conversation > .feedback-notice {
    width: min(560px, calc(100% - 38px));
    margin-left: 38px;
  }
  .app-root .chat-input-bar {
    width: min(100%, var(--chat-column-width));
    margin-inline: auto;
    padding: 10px 8px 2px;
    border-top: 0;
    background: transparent;
    box-shadow: none;
  }
  .app-root .chat-compose.aurora-chat-input--default {
    min-height: 52px;
    padding: 6px 7px 6px 14px;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--line-strong);
    border-radius: 14px;
    background: var(--panel-raised);
  }
  .app-root .chat-compose.aurora-chat-input--default:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(77, 107, 88, 0.14);
  }
  .app-root .chat-textarea {
    min-height: 22px;
    max-height: 128px;
    padding: 0;
    line-height: 1.5;
  }
  .app-root .chat-textarea::placeholder {
    color: var(--muted);
  }
  .app-root .send-btn.aurora-chat-input__submit {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border-color: var(--accent-dark);
    background: var(--accent-dark);
    color: var(--panel-raised);
  }
  .app-root .send-btn.aurora-chat-input__submit:disabled {
    border-color: var(--line);
    background: #d8ded8;
    color: var(--muted-soft);
    opacity: 1;
  }
  @media (max-width: 720px) {
    .intro-wrap { padding-top: 8px; }
    .intro-actions { grid-template-columns: 1fr; gap: 18px; margin-top: 32px; }
    .start-btn { width: 100%; }
  }
  @media (max-width: 640px) {
    .chat-root { height: calc(100vh - 140px); }
    .bubble { max-width: 85%; }
  }
`

export default function Chatbot() {
  const [started, setStarted] = useState(loadChatbotOnboardingState)

  function handleStart() {
    saveChatbotOnboardingState()
    setStarted(true)
  }

  return (
    <>
      <style>{styles}</style>
      {started
        ? <ChatbotChat />
        : <ChatbotIntro onStart={handleStart} />
      }
    </>
  )
}
