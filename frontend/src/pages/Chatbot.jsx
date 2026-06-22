import { useEffect, useRef, useState } from 'react'

import { sendChatMessage } from '../services/api.js'

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

function TypingIndicator() {
  return (
    <div className="msg-row msg-row--ai">
      <div className="msg-avatar">A</div>
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
      {!isUser && <div className="msg-avatar">A</div>}
      <div className={`bubble${isUser ? ' bubble--user' : ' bubble--ai'}`}>
        <p className="bubble-text">{msg.text}</p>
        <span className="bubble-time">{msg.time}</span>
      </div>
      {isUser && <div className="msg-avatar msg-avatar--user">You</div>}
    </div>
  )
}

const highlights = [
  { label: 'Honest, not just agreeable', body: 'Aurora can respond thoughtfully and ground the conversation instead of only mirroring you back.' },
  { label: 'Personalized to you', body: 'This chat can evolve into a real backend service that uses your check-ins and journal data later.' },
  { label: 'Knows its limits', body: 'The assistant is supportive, but not a substitute for licensed mental health care.' },
  { label: 'Connected to the platform', body: 'It can eventually point people toward Peer Support, Therapist Match, and other Aurora features.' },
]

function ChatbotIntro({ onStart }) {
  return (
    <section className="page">
      <div className="intro-wrap">
        <p className="intro-eyebrow">Aurora · AI Chatbot</p>
        <h2 className="intro-heading">Your 24/7 mental wellness companion</h2>
        <span className="intro-badge">Available around the clock</span>

        <p className="intro-body">
          Aurora gives you access to an interactive AI chatbot you can reach any time of day or
          night. It is designed to feel calm, supportive, and realistic while staying connected to
          the rest of the platform.
        </p>

        <div className="highlights-grid">
          {highlights.map((highlight) => (
            <div key={highlight.label} className="highlight-card">
              <strong>{highlight.label}</strong>
              <p>{highlight.body}</p>
            </div>
          ))}
        </div>

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
    </section>
  )
}

function ChatbotChat() {
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'ai',
      text: "Hi, I'm Aurora. I'm here to listen with warmth and honesty. What's on your mind today?",
      time: timestamp(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const messagesEl = messagesRef.current
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'auto' })
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const messagesEl = messagesRef.current
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' })
    if (!isTyping) inputRef.current?.focus()
  }, [messages, isTyping])

  async function sendMessage() {
    const text = input.trim()
    if (!text || isTyping) return

    const userMsg = { id: Date.now(), role: 'user', text, time: timestamp() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const reply = await sendChatMessage(text)
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'ai', text: reply, time: timestamp() },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: error.message || "I'm having trouble reaching the server right now. Please try again in a moment.",
          time: timestamp(),
        },
      ])
    } finally {
      setIsTyping(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-root">
      <div className="chat-header">
        <div className="chat-header-avatar">A</div>
        <div>
          <strong className="chat-header-name">Aurora</strong>
          <span className="chat-header-status">Online · backend connected</span>
        </div>
      </div>

      <div className="chat-messages" ref={messagesRef}>
        {messages.map((message) => <Message key={message.id} msg={message} />)}
        {isTyping && <TypingIndicator />}
      </div>

      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder="Type a message... (Enter to send)"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isTyping}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || isTyping}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

const styles = `
  .intro-wrap { max-width: 680px; }
  .intro-eyebrow {
    margin: 0 0 10px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .intro-heading { margin: 0 0 10px; font-size: 2rem; letter-spacing: -0.03em; }
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
  .intro-body { color: var(--muted); font-size: 1rem; line-height: 1.7; margin: 0 0 28px; }
  .highlights-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 28px;
  }
  .highlight-card {
    background: var(--panel-strong);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 18px 20px;
    box-shadow: 0 4px 14px rgba(46, 42, 38, 0.06);
  }
  .highlight-card strong { display: block; margin-bottom: 6px; font-size: 0.92rem; }
  .highlight-card p { margin: 0; font-size: 0.86rem; color: var(--muted); line-height: 1.55; }
  .disclaimer-box {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 16px;
    padding: 16px 18px;
    margin-bottom: 32px;
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
    display: flex;
    flex-direction: column;
    height: calc(100vh - 180px);
    min-height: 480px;
    background: var(--panel-strong);
    border: 1px solid var(--line);
    border-radius: 22px;
    overflow: hidden;
  }
  .chat-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.9);
    flex: none;
  }
  .chat-header-avatar,
  .msg-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4d6b58, #3a6898);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 800;
    font-size: 0.9rem;
    flex: none;
  }
  .chat-header-name { display: block; font-size: 0.95rem; }
  .chat-header-status { font-size: 0.76rem; color: var(--accent); font-weight: 600; }
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px 20px 8px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    scroll-behavior: smooth;
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
  .msg-avatar--user { background: linear-gradient(135deg, #334155, #64748b); }
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
    border: 1px solid rgba(58, 104, 152, 0.14);
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
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 12px 14px;
    border-top: 1px solid rgba(46, 42, 38, 0.12);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(250, 244, 232, 0.96)), var(--panel-strong);
    flex: none;
    box-shadow: 0 -8px 24px rgba(46, 42, 38, 0.04);
  }
  .chat-textarea {
    flex: 1;
    resize: none;
    border: 1.5px solid rgba(77, 107, 88, 0.18);
    border-radius: 18px;
    padding: 12px 15px;
    min-height: 44px;
    max-height: 120px;
    overflow-y: auto;
    font-size: 0.92rem;
    line-height: 1.45;
    background: rgba(255, 255, 255, 0.82);
    color: var(--ink);
    outline: none;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92), 0 4px 14px rgba(46, 42, 38, 0.05);
  }
  .chat-textarea::placeholder { color: rgba(46, 42, 38, 0.38); }
  .chat-textarea:focus {
    border-color: rgba(77, 107, 88, 0.58);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(77, 107, 88, 0.12), 0 8px 20px rgba(46, 42, 38, 0.07);
  }
  .chat-textarea:disabled { opacity: 0.6; }
  .send-btn {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 15px;
    border: 1px solid rgba(58, 82, 68, 0.24);
    background: linear-gradient(135deg, var(--accent), var(--blue));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 22px rgba(77, 107, 88, 0.22);
  }
  .send-btn:disabled {
    background: #d8ded8;
    color: rgba(46, 42, 38, 0.38);
    box-shadow: none;
    cursor: not-allowed;
    border-color: transparent;
  }
  @media (max-width: 640px) {
    .highlights-grid { grid-template-columns: 1fr; }
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
