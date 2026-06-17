import { useState, useRef, useEffect } from 'react'

// ── mock AI logic ────────────────────────────────────────────────────────────

const KEYWORD_RESPONSES = {
  anxious:   "Anxiety can feel all-consuming, but we can work through it. Where in your body do you feel it most — chest, stomach, somewhere else?",
  anxiety:   "Anxiety can feel all-consuming, but we can work through it. Where in your body do you feel it most — chest, stomach, somewhere else?",
  sad:       "I'm sorry you're feeling that way. It's okay to sit with sadness — you don't have to rush to fix it. What do you think brought it on?",
  depressed: "Thank you for trusting me with that. What you're feeling is real and valid. I'd also like to gently suggest connecting with one of Aurora's licensed therapists — they're trained to help with exactly this.",
  angry:     "Anger is usually protecting something important. What do you think is underneath that feeling right now?",
  tired:     "Fatigue — mental or physical — is your body asking for something. When did you last feel genuinely rested?",
  stressed:  "Stress that doesn't let up is worth paying attention to. What's the single biggest source of pressure for you right now?",
  lonely:    "Loneliness is one of the hardest feelings to sit with. You're not alone in this conversation — and Aurora's Peer Support community connects you with others who understand. Want to know more?",
  help:      "I'm right here. Tell me what's going on and we'll work through it together.",
  fine:      "Sometimes 'fine' covers a lot. Is there anything beneath the surface that's been quietly bothering you?",
  good:      "I'm glad to hear that. What's been helping you feel good lately? It's worth naming those things.",
  bad:       "I'm sorry it's been a rough time. Can you tell me a bit more about what's making things feel bad right now?",
  hopeless:  "I hear you saying things feel hopeless right now, and I want you to know that feeling is real — but it's also something that can shift with the right support. Can we talk about what's driving that feeling?",
  therapist: "Connecting with a therapist is a really strong move. Aurora's Therapist Match feature can pair you with someone suited to exactly what you're going through. Have you tried it yet?",
}

const FALLBACK_POOL = [
  "I hear you. Can you tell me a bit more about what's been weighing on you most today?",
  "That makes sense given what you've described. Let's slow down and look at one piece of this at a time — what feels most urgent?",
  "Thank you for being open about that. How long have you been feeling this way?",
  "That's a really common feeling, and it doesn't mean something is wrong with you. What does a better day look like for you?",
  "It sounds like you're putting a lot of pressure on yourself. What would you say to a close friend who came to you with this exact situation?",
  "I want to gently push back on that — that way of thinking about yourself might not be as accurate as it feels right now. What's the evidence for and against it?",
  "You don't have to figure all of this out at once. What's one small thing you could do today — even something tiny — that might help?",
  "That took real courage to say. I'm glad you shared it. How are you feeling right now, in this moment?",
  "I'm noticing a pattern in what you're sharing. Persistent stress like that takes a real toll. Have you been sleeping and eating okay?",
  "It might also help to connect with others who've been through something similar. Aurora's Peer Support community is anonymous and safe.",
  "Self-awareness like that is genuinely the first step. What do you think is driving that feeling underneath?",
  "I hear that. Sometimes just naming what we're feeling out loud helps it feel less overwhelming. What else is coming up for you?",
]

function pickResponse(input) {
  const lower = input.toLowerCase()
  for (const [kw, response] of Object.entries(KEYWORD_RESPONSES)) {
    if (lower.includes(kw)) return response
  }
  return FALLBACK_POOL[Math.floor(Math.random() * FALLBACK_POOL.length)]
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── sub-components ───────────────────────────────────────────────────────────

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

// ── intro screen ─────────────────────────────────────────────────────────────

const highlights = [
  { label: 'Honest, not just agreeable', body: 'Aurora will push back if something sounds harmful or disconnected from reality — gently but directly.' },
  { label: 'Personalized to you',        body: 'The chatbot draws on your check-ins and journal entries to give advice that actually fits your situation.' },
  { label: 'Knows its limits',           body: 'If your condition appears to be worsening, Aurora will refer you to a licensed therapist rather than try to handle it alone.' },
  { label: 'Connected to the platform',  body: "It can point you toward Peer Support, Therapist Match, and other Aurora features when they'd help more." },
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
          night. It is designed to be easy to talk to and give realistic, grounded advice — drawing
          on what it knows about you from your check-ins and thought journal to make every
          conversation more personal and relevant.
        </p>

        <div className="highlights-grid">
          {highlights.map((h) => (
            <div key={h.label} className="highlight-card">
              <strong>{h.label}</strong>
              <p>{h.body}</p>
            </div>
          ))}
        </div>

        <div className="disclaimer-box">
          <div className="disclaimer-icon">!</div>
          <p>
            Aurora&apos;s chatbot is <strong>not a replacement for professional mental health
            care.</strong> If your condition appears to be worsening, it will recommend connecting
            with a licensed therapist through our Therapist Match feature.
          </p>
        </div>

        <button className="start-btn" onClick={onStart}>
          Start chatting →
        </button>
      </div>
    </section>
  )
}

// ── chat screen ──────────────────────────────────────────────────────────────

function ChatbotChat() {
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'ai',
      text: "Hi, I'm Aurora. I'm here to listen — no judgment, just honest support. What's on your mind today?",
      time: timestamp(),
    },
  ])
  const [input, setInput]       = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef               = useRef(null)
  const inputRef                = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function sendMessage() {
    const text = input.trim()
    if (!text || isTyping) return

    const userMsg = { id: Date.now(), role: 'user', text, time: timestamp() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    const delay = 1000 + Math.random() * 900
    setTimeout(() => {
      setIsTyping(false)
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'ai', text: pickResponse(text), time: timestamp() },
      ])
    }, delay)

    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-root">
      <div className="chat-header">
        <div className="chat-header-avatar">A</div>
        <div>
          <strong className="chat-header-name">Aurora</strong>
          <span className="chat-header-status">Online · always available</span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((m) => <Message key={m.id} msg={m} />)}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder="Type a message… (Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
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

// ── styles ───────────────────────────────────────────────────────────────────

const styles = `
  /* intro */
  .intro-wrap { max-width: 680px; }
  .intro-eyebrow {
    margin: 0 0 10px;
    font-size: 0.78rem; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--accent);
  }
  .intro-heading { margin: 0 0 10px; font-size: 2rem; letter-spacing: -0.03em; }
  .intro-badge {
    display: inline-block; padding: 3px 12px; border-radius: 999px;
    background: var(--accent-soft); color: var(--accent);
    font-size: 0.78rem; font-weight: 700; margin-bottom: 20px;
  }
  .intro-body { color: var(--muted); font-size: 1rem; line-height: 1.7; margin: 0 0 28px; }
  .highlights-grid {
    display: grid; grid-template-columns: repeat(2,minmax(0,1fr));
    gap: 14px; margin-bottom: 28px;
  }
  .highlight-card {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 18px; padding: 18px 20px;
    box-shadow: 0 4px 14px rgba(104,98,93,0.06);
  }
  .highlight-card strong { display: block; margin-bottom: 6px; font-size: 0.92rem; }
  .highlight-card p { margin: 0; font-size: 0.86rem; color: var(--muted); line-height: 1.55; }
  .disclaimer-box {
    display: flex; gap: 14px; align-items: flex-start;
    background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3);
    border-radius: 16px; padding: 16px 18px; margin-bottom: 32px;
  }
  .disclaimer-icon {
    flex: none; width: 22px; height: 22px; border-radius: 50%;
    background: rgba(251,191,36,0.25); display: flex;
    align-items: center; justify-content: center;
    font-size: 0.78rem; font-weight: 800; color: #92400e; margin-top: 1px;
  }
  .disclaimer-box p { margin: 0; font-size: 0.88rem; color: #78350f; line-height: 1.55; }
  .start-btn {
    padding: 14px 36px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 1rem; font-weight: 700;
    transition: opacity 140ms, transform 140ms;
  }
  .start-btn:hover { opacity: 0.88; transform: translateY(-1px); }

  /* chat shell */
  .chat-root {
    display: flex; flex-direction: column;
    height: calc(100vh - 180px); min-height: 480px;
    background: var(--panel-strong);
    border: 1px solid var(--line); border-radius: 22px;
    overflow: hidden;
  }

  /* header */
  .chat-header {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--line);
    background: rgba(255,255,255,0.9);
    flex: none;
  }
  .chat-header-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: linear-gradient(135deg,#a6b58a,#879ebf);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 800; font-size: 0.9rem; flex: none;
  }
  .chat-header-name { display: block; font-size: 0.95rem; }
  .chat-header-status { font-size: 0.76rem; color: var(--accent); font-weight: 600; }

  /* messages */
  .chat-messages {
    flex: 1; overflow-y: auto; padding: 20px 20px 8px;
    display: flex; flex-direction: column; gap: 16px;
    scroll-behavior: smooth;
  }
  .chat-messages::-webkit-scrollbar { width: 6px; }
  .chat-messages::-webkit-scrollbar-thumb { background: rgba(104,98,93,0.12); border-radius: 999px; }

  .msg-row {
    display: flex; align-items: flex-end; gap: 10px;
    animation: fade-up 180ms ease;
  }
  .msg-row--user { flex-direction: row-reverse; }

  .msg-avatar {
    flex: none; width: 30px; height: 30px; border-radius: 50%;
    background: linear-gradient(135deg,#a6b58a,#879ebf);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 0.65rem; font-weight: 800;
    margin-bottom: 2px;
  }
  .msg-avatar--user {
    background: linear-gradient(135deg,#334155,#64748b);
  }

  .bubble {
    max-width: 68%; padding: 11px 15px 8px;
    border-radius: 20px; display: flex; flex-direction: column; gap: 4px;
  }
  .bubble--ai {
    background: #f1f5f9;
    border-bottom-left-radius: 6px;
  }
  .bubble--user {
    background: var(--accent);
    border-bottom-right-radius: 6px;
  }
  .bubble-text {
    margin: 0; font-size: 0.92rem; line-height: 1.55;
    color: var(--ink);
    white-space: pre-wrap; word-break: break-word;
  }
  .bubble--user .bubble-text { color: #fff; }
  .bubble-time {
    font-size: 0.68rem; color: rgba(104,98,93,0.4);
    align-self: flex-end; white-space: nowrap;
  }
  .bubble--user .bubble-time { color: rgba(255,255,255,0.65); }

  /* typing dots */
  .typing-bubble {
    padding: 14px 18px; flex-direction: row; align-items: center; gap: 5px;
  }
  .dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--muted);
    animation: dot-bounce 1.2s infinite ease-in-out;
    flex: none;
  }
  .dot:nth-child(2) { animation-delay: 0.18s; }
  .dot:nth-child(3) { animation-delay: 0.36s; }
  @keyframes dot-bounce {
    0%,60%,100% { transform: translateY(0); opacity: 0.5; }
    30%          { transform: translateY(-6px); opacity: 1; }
  }

  /* input bar */
  .chat-input-bar {
    display: flex; align-items: flex-end; gap: 10px;
    padding: 14px 16px;
    border-top: 1px solid var(--line);
    background: rgba(255,255,255,0.95);
    flex: none;
  }
  .chat-textarea {
    flex: 1; resize: none; border: 1.5px solid var(--line);
    border-radius: 16px; padding: 10px 14px;
    font-size: 0.92rem; line-height: 1.5;
    background: #f8fafc; color: var(--ink);
    outline: none; max-height: 120px; overflow-y: auto;
    transition: border-color 140ms;
  }
  .chat-textarea:focus { border-color: var(--accent); background: #fff; }
  .chat-textarea:disabled { opacity: 0.6; }
  .send-btn {
    flex: none; width: 42px; height: 42px; border-radius: 50%;
    border: none; background: var(--accent); color: #fff;
    display: flex; align-items: center; justify-content: center;
    transition: opacity 140ms, transform 140ms;
  }
  .send-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(1.05); }
  .send-btn:disabled { background: #cbd5e1; cursor: not-allowed; }

  @media (max-width: 640px) {
    .highlights-grid { grid-template-columns: 1fr; }
    .chat-root { height: calc(100vh - 140px); }
    .bubble { max-width: 85%; }
  }
`

// ── root export ──────────────────────────────────────────────────────────────

export default function Chatbot() {
  const [started, setStarted] = useState(false)

  return (
    <>
      <style>{styles}</style>
      {started
        ? <ChatbotChat />
        : <ChatbotIntro onStart={() => setStarted(true)} />
      }
    </>
  )
}
