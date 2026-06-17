import { useState, useRef, useEffect } from 'react'

// Anonymous identity

const WORD_A = ['Calm','Quiet','Gentle','Steady','Brave','Kind','Warm','Still','Soft','Clear','Bold','Light']
const WORD_N = ['Maple','River','Stone','Dawn','Forest','Lake','Ember','Cloud','Tide','Ridge','Pine','Brook']
const ONBOARDING_STORAGE_KEY = 'aurora.peerSupport.onboarding'
const PEER_STATE_STORAGE_KEY = 'aurora.peerSupport.state'

function makeAnonName() {
  const a = WORD_A[Math.floor(Math.random() * WORD_A.length)]
  const n = WORD_N[Math.floor(Math.random() * WORD_N.length)]
  return `${a}${n}${10 + Math.floor(Math.random() * 89)}`
}

function loadOnboardingState() {
  try {
    const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored)
    if (parsed?.acceptedGuidelines && typeof parsed.anonName === 'string') {
      return parsed
    }
  } catch {
    return null
  }

  return null
}

function saveOnboardingState(anonName) {
  try {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ acceptedGuidelines: true, anonName }),
    )
  } catch {
    // Storage can be unavailable in some private browsing modes.
  }
}

function loadPeerSupportState() {
  try {
    const stored = window.localStorage.getItem(PEER_STATE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function savePeerSupportState(state) {
  try {
    window.localStorage.setItem(PEER_STATE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in some private browsing modes.
  }
}

// Moderation engine

const MOD_RULES = [
  {
    type: 'crisis', blocked: false,
    terms: ['suicide','suicidal','kill myself','end my life','end it all','want to die','dont want to live','do not want to live'],
    patterns: [],
    label: 'We noticed something serious',
    message: "It sounds like you might be in a really dark place right now. You are not alone. Please reach out to the 988 Suicide & Crisis Lifeline (call or text 988, available 24/7). You can also connect with a therapist through Aurora's Therapist Match.",
    color: '#dc2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.22)',
  },
  {
    type: 'harassment', blocked: true,
    terms: ['idiot','stupid','loser','worthless','shut up','you suck','hate you','go away','moron','dumb'],
    patterns: [],
    label: 'Message blocked: harassment',
    message: "This message was flagged for potential harassment and wasn't sent. Please keep interactions respectful. Everyone here is going through something difficult.",
    color: '#d97706', bg: 'rgba(217,119,6,0.06)', border: 'rgba(217,119,6,0.22)',
  },
  {
    type: 'contact', blocked: true,
    terms: ['instagram','snapchat','whatsapp','telegram','discord','facebook','twitter','tiktok'],
    patterns: [/@\S+/, /\b\d{3}[.\-\s]?\d{3}[.\-\s]?\d{4}\b/, /\.com\b|\.net\b|\.org\b/],
    label: 'Personal info blocked',
    message: "Sharing contact details, social handles, or links isn't allowed in anonymous chats. This keeps everyone safe. Your message was not sent.",
    color: '#3a6898', bg: 'rgba(58,104,152,0.06)', border: 'rgba(58,104,152,0.22)',
  },
  {
    type: 'harmful', blocked: true,
    terms: ['cut yourself','self harm','self-harm','stop taking medication','stop your meds','dont take your meds','harm yourself','hurt yourself'],
    patterns: [],
    label: 'Harmful content blocked',
    message: "This message was flagged for potentially harmful advice and wasn't sent. If you or someone else is struggling, please reach out to a licensed professional.",
    color: '#dc2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.22)',
  },
]

function moderate(text) {
  const lower = text.toLowerCase()
  for (const rule of MOD_RULES) {
    const termHit    = rule.terms.some(t => lower.includes(t))
    const patternHit = rule.patterns.some(p => p.test(text))
    if (termHit || patternHit) return rule
  }
  return null
}

// Mock data

const ROOM_SEED = [
  { id: 1,  user: 'GentleStone28', color: '#3a6898', text: "Does anyone else get anxiety spikes first thing in the morning before anything has even happened?", day: 3 },
  { id: 2,  user: 'SteadyTide44',  color: '#b45309', text: "Yes, every single morning. I wake up with this dread and I can't explain where it's coming from.", day: 3 },
  { id: 3,  user: 'BoldForest12',  color: '#15803d', text: "Morning anxiety is real. I've started 5 minutes of slow breathing before I check my phone. It helps a little.", day: 3 },
  { id: 4,  user: 'QuietDawn67',   color: '#1d4ed8', text: "I keep telling myself the feeling will pass and it usually does. It just takes a while.", day: 2 },
  { id: 5,  user: 'SoftCloud91',   color: '#be185d', text: "The hardest part is not knowing what triggered it. Makes it hard to address.", day: 2 },
  { id: 6,  user: 'GentleStone28', color: '#3a6898', text: "Exactly. There's no clear trigger. It's just... there.", day: 2 },
  { id: 7,  user: 'CalmRidge35',   color: '#0891b2', text: "My therapist called it 'free-floating anxiety.' Knowing there's a name for it actually helped me.", day: 1 },
  { id: 8,  user: 'SteadyTide44',  color: '#b45309', text: "That's a great term. Has therapy been helping overall?", day: 1 },
  { id: 9,  user: 'CalmRidge35',   color: '#0891b2', text: "Slowly, yes. It's not a quick fix but I feel like I'm actually building tools.", day: 1 },
  { id: 10, user: 'WarmEmber20',   color: '#9333ea', text: "I tried meditation apps but couldn't stay consistent. What's actually worked for you all?", day: 0 },
  { id: 11, user: 'BoldForest12',  color: '#15803d', text: "Journaling, honestly. Getting it out of my head and onto something outside me.", day: 0 },
  { id: 12, user: 'QuietDawn67',   color: '#1d4ed8', text: "Walking. Even 10 minutes. I don't know why it helps but it does.", day: 0 },
]

const DAY_LABEL = { 3: '3 days ago', 2: '2 days ago', 1: 'Yesterday', 0: 'Today' }

const VISIBLE_MATCH_COUNT = 5

const PEER_LIST = [
  { id: 1, name: 'QuietRiver33',  color: '#3a6898', status: 'none' },
  { id: 2, name: 'SteadyCloud19', color: '#0891b2', status: 'none' },
  { id: 3, name: 'BraveEmber55',  color: '#b45309', status: 'none' },
  { id: 4, name: 'SoftDawn41',    color: '#15803d', status: 'none' },
  { id: 5, name: 'GentleTide27',  color: '#be185d', status: 'none' },
  { id: 6, name: 'ClearBrook64',  color: '#2563eb', status: 'none' },
  { id: 7, name: 'WarmPine82',    color: '#c2410c', status: 'none' },
  { id: 8, name: 'StillLake38',   color: '#4f7c3a', status: 'none' },
  { id: 9, name: 'LightStone73',  color: '#a21caf', status: 'none' },
  { id: 10, name: 'KindMaple46',  color: '#047857', status: 'none' },
]

function mergeSavedPeers(savedPeers) {
  if (!Array.isArray(savedPeers)) return PEER_LIST.map(p => ({ ...p }))

  return PEER_LIST.map(peer => {
    const saved = savedPeers.find(p => p.id === peer.id)
    return saved ? { ...peer, status: saved.status ?? peer.status } : { ...peer }
  })
}

function makeInitialDmMessages(peer, anonName) {
  return [{
    id: 0,
    role: 'them',
    text: `Hey ${anonName}! Glad we matched. How are you doing lately?`,
    time: ts(),
  }]
}

const PEER_REPLIES = [
  "Hey, thanks for reaching out. It's good to talk to someone who actually gets it.",
  "I've been dealing with the same thing. How long have you been struggling with this?",
  "That really resonates with me. What's been helping you get through it lately?",
  "Some days are better than others for me too. What's been your biggest challenge?",
  "It's reassuring to know I'm not the only one feeling this way.",
  "Yeah, it comes in waves. Have you found anything that helps when it gets bad?",
]

const GUIDELINES = [
  'Be kind and respectful. Everyone here is going through something difficult.',
  'Stay anonymous. Do not share your real name, phone number, email, or social media handles.',
  'Do not harass, bully, or demean other community members.',
  'Do not give medical advice or encourage others to stop taking medication.',
  'If someone expresses a crisis, encourage them to seek professional help.',
  'Conversations are AI-moderated 24/7. Serious or repeated violations may result in removal.',
]

// Shared utils

function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function AnonAvatar({ name, color, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.3, flexShrink: 0,
    }}>{name.slice(0, 2)}</div>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}

function ModAlert({ rule, onDismiss }) {
  return (
    <div className="ps-mod-alert" style={{ background: rule.bg, borderColor: rule.border }}>
      <div className="ps-mod-body">
        <strong style={{ color: rule.color }}>{rule.label}</strong>
        <p>{rule.message}</p>
      </div>
      <button className="ps-mod-dismiss" onClick={onDismiss} aria-label="Dismiss">x</button>
    </div>
  )
}

function LeaveConfirmBubble({ label, onCancel, onConfirm }) {
  return (
    <div className="ps-leave-confirm">
      <p>{label}</p>
      <div className="ps-leave-confirm-actions">
        <button className="ps-confirm-cancel" onClick={onCancel}>Cancel</button>
        <button className="ps-confirm-danger" onClick={onConfirm}>Leave</button>
      </div>
    </div>
  )
}

// Onboarding

function OnboardingView({ anonName, onDone }) {
  const [agreed, setAgreed] = useState(false)
  const [step, setStep]     = useState(1)

  if (step === 2) {
    return (
      <section className="page">
        <div className="ps-center-wrap">
          <p className="ps-eyebrow">All set</p>
          <h2 className="ps-heading">Meet your anonymous identity</h2>
          <p className="ps-sub">
            This name represents you in the Aurora community. No one will ever know your real identity.
          </p>
          <div className="ps-name-reveal">
            <AnonAvatar name={anonName} color="#4f7c3a" size={72} />
            <div className="ps-name-big">{anonName}</div>
            <p className="ps-name-note">Randomly assigned - cannot be changed</p>
          </div>
          <button className="ps-primary-btn" onClick={onDone}>Enter the community</button>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="ps-center-wrap ps-center-wrap--wide">
        <p className="ps-eyebrow">Aurora - Peer Support</p>
        <h2 className="ps-heading">Community guidelines</h2>
        <p className="ps-sub">
          Aurora's peer community connects you with others who share similar experiences.
          To keep this space safe for everyone, please read and agree before continuing.
        </p>
        <div className="ps-guidelines">
          {GUIDELINES.map((g, i) => (
            <div key={i} className="ps-guideline-row">
              <div className="ps-guide-num">{i + 1}</div>
              <p>{g}</p>
            </div>
          ))}
        </div>
        <label className="ps-agree-label">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span>I have read and agree to these community guidelines.</span>
        </label>
        <button
          className="ps-primary-btn"
          disabled={!agreed}
          style={{ opacity: agreed ? 1 : 0.45, cursor: agreed ? 'pointer' : 'not-allowed' }}
          onClick={() => setStep(2)}
        >
          Continue
        </button>
      </div>
    </section>
  )
}

// Hub

function HubView({ anonName, peers, setPeers, onRoom, onDM }) {
  const connected = peers.filter(p => p.status === 'connected').length
  const pending = peers.filter(p => p.status === 'pending').length

  return (
    <section className="page">
      <div className="ps-hub-identity">
        <AnonAvatar name={anonName} color="#4f7c3a" size={42} />
        <div>
          <p className="ps-hub-name">{anonName}</p>
          <p className="ps-hub-name-sub">Your anonymous identity</p>
        </div>
      </div>

      <div className="ps-hub-cards">
        <button className="ps-hub-card" onClick={onRoom}>
          <div className="ps-hub-card-icon ps-hub-card-icon--purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="ps-hub-card-text">
            <strong>Anxiety Support Room</strong>
            <p>Your assigned group - 14 members - Active now</p>
          </div>
          <span className="ps-hub-arrow">-&gt;</span>
        </button>

        {false && <button className="ps-hub-card" onClick={() => {}}>
          <div className="ps-hub-card-icon ps-hub-card-icon--teal">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
          </div>
          <div className="ps-hub-card-text">
            <strong>Peer Matches</strong>
            <p>
              5 matched
              {connected > 0 ? ` - ${connected} connected` : ''}
              {pending > 0   ? ` - ${pending} pending` : ''}
            </p>
          </div>
          <span className="ps-hub-arrow">-&gt;</span>
        </button>}
      </div>

      <PeerMatchesSection peers={peers} setPeers={setPeers} onDM={onDM} />

      <div className="ps-hub-pills">
        <span className="ps-pill">All chats anonymous</span>
        <span className="ps-pill">AI-moderated 24/7</span>
        <span className="ps-pill">7-day message history</span>
        <span className="ps-pill">Room capped at 15 members</span>
      </div>
    </section>
  )
}

// Room chat

function RoomView({ anonName, messages, setMessages, onBack, onLeave }) {
  const [input, setInput]       = useState('')
  const [modAlert, setModAlert] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const messagesRef             = useRef(null)
  const shouldScrollRef         = useRef(false)

  useEffect(() => {
    if (!shouldScrollRef.current) {
      return
    }
    shouldScrollRef.current = false
    const messagesEl = messagesRef.current
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function send() {
    const text = input.trim()
    if (!text) return
    const flag = moderate(text)
    if (flag?.blocked) { setModAlert(flag); setInput(''); return }
    if (flag) setModAlert(flag)
    shouldScrollRef.current = true
    setMessages(prev => [...prev, { id: Date.now(), user: anonName, color: '#4f7c3a', text, day: 0, self: true }])
    setInput('')
  }

  const uniqueDays = [...new Set(messages.map(m => m.day))].sort((a, b) => b - a)

  return (
    <div className="ps-chat-root">
      <div className="ps-chat-header">
        <button className="ps-back-btn" onClick={onBack}>Back</button>
        <div className="ps-room-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div>
          <strong className="ps-chat-name">Anxiety Support Room</strong>
          <span className="ps-chat-sub">14 members - 7-day history - AI-moderated</span>
        </div>
        <div className="ps-leave-wrap">
          <button className="ps-leave-btn" onClick={() => setConfirmLeave(true)}>Leave room</button>
          {confirmLeave && (
            <LeaveConfirmBubble
              label="Leave this room?"
              onCancel={() => setConfirmLeave(false)}
              onConfirm={onLeave}
            />
          )}
        </div>
      </div>

      {modAlert && <ModAlert rule={modAlert} onDismiss={() => setModAlert(null)} />}

      <div className="ps-messages" ref={messagesRef}>
        {uniqueDays.map(day => (
          <div key={day}>
            <div className="ps-day-sep">{DAY_LABEL[day]}</div>
            {messages.filter(m => m.day === day).map(m => (
              <div key={m.id} className={`ps-msg-row${m.self ? ' ps-msg-row--self' : ''}`}>
                {!m.self && <AnonAvatar name={m.user} color={m.color} size={28} />}
                <div className={`ps-bubble${m.self ? ' ps-bubble--self' : ' ps-bubble--other'}`}>
                  {!m.self && <span className="ps-bubble-name" style={{ color: m.color }}>{m.user}</span>}
                  <p className="ps-bubble-text">{m.text}</p>
                  {m.self && <span className="ps-bubble-time">Now</span>}
                </div>
                {m.self && <div className="ps-self-dot" style={{ background: '#4f7c3a' }}>{anonName.slice(0, 2)}</div>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="ps-input-bar">
        <textarea
          className="chat-textarea"
          placeholder="Send a message to the room"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        />
        <button className="send-btn" onClick={send} disabled={!input.trim()} aria-label="Send">
          <SendIcon />
        </button>
      </div>
    </div>
  )
}

// Peer list

function PeerMatchesSection({ peers, setPeers, onDM, onBack }) {
  const activeChats = peers.filter(p => p.status === 'connected')
  const recommendedPeers = peers
    .filter(p => p.status !== 'connected' && p.status !== 'left')
    .slice(0, VISIBLE_MATCH_COUNT)

  function sendRequest(id) {
    setPeers(prev => prev.map(p => p.id === id ? { ...p, status: 'pending' } : p))
    setTimeout(() => {
      setPeers(prev => prev.map(p => p.id === id ? { ...p, status: 'connected' } : p))
    }, 1800)
  }

  return (
    <section className="page">
      <button className="ps-back-btn" style={{ marginBottom: 12 }} onClick={onBack}>Community Hub</button>
      <header className="page-header">
        <h2>Your peer matches</h2>
        <p>Recommended anonymous peers. Both users must accept before a chat opens.</p>
      </header>

      <div>
        <div className="ps-section-heading">
          <span>Active chats</span>
          <strong>{activeChats.length}</strong>
        </div>
        <div className="ps-peers-list">
          {activeChats.length === 0 && (
            <div className="ps-active-empty">Accepted peer requests will appear here.</div>
          )}
          {activeChats.map(p => (
            <div key={p.id} className="ps-peer-card ps-peer-card--active">
              <AnonAvatar name={p.name} color={p.color} size={48} />
              <div className="ps-peer-info">
                <strong>{p.name}</strong>
                <p className="ps-peer-concerns">Active anonymous chat</p>
              </div>
              <button className="ps-req-btn ps-req-btn--on" onClick={() => onDM(p)}>Message</button>
            </div>
          ))}
        </div>
      </div>

      <div className="ps-section-heading">
        <span>Recommended matches</span>
        <strong>{recommendedPeers.length}</strong>
      </div>

      <div className="ps-peers-list">
        {recommendedPeers.map(p => (
          <div key={p.id} className="ps-peer-card">
            <AnonAvatar name={p.name} color={p.color} size={48} />
            <div className="ps-peer-info">
              <strong>{p.name}</strong>
            </div>
            <div>
              {p.status === 'none'      && <button className="ps-req-btn" onClick={() => sendRequest(p.id)}>Send request</button>}
              {p.status === 'pending'   && <span className="ps-req-pending">Pending...</span>}
              {p.status === 'connected' && <button className="ps-req-btn ps-req-btn--on" onClick={() => onDM(p)}>Message</button>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// DM chat

function DMView({ peer, anonName, messages, setMessages, onBack, onLeave }) {
  const [input, setInput]       = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [modAlert, setModAlert] = useState(null)
  const [replyIdx, setReplyIdx] = useState(0)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const messagesRef             = useRef(null)
  const shouldScrollRef         = useRef(false)

  useEffect(() => {
    if (!shouldScrollRef.current) {
      return
    }
    shouldScrollRef.current = false
    const messagesEl = messagesRef.current
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  function send() {
    const text = input.trim()
    if (!text || isTyping) return
    const flag = moderate(text)
    if (flag?.blocked) { setModAlert(flag); setInput(''); return }
    if (flag) setModAlert(flag)
    shouldScrollRef.current = true
    setMessages(prev => [...prev, { id: Date.now(), role: 'me', text, time: ts() }])
    setInput('')
    shouldScrollRef.current = true
    setIsTyping(true)
    setTimeout(() => {
      shouldScrollRef.current = true
      setIsTyping(false)
      setReplyIdx(i => i + 1)
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'them',
        text: PEER_REPLIES[replyIdx % PEER_REPLIES.length],
        time: ts(),
      }])
    }, 1000 + Math.random() * 900)
  }

  return (
    <div className="ps-chat-root">
      <div className="ps-chat-header">
        <button className="ps-back-btn" onClick={onBack}>Back</button>
        <AnonAvatar name={peer.name} color={peer.color} size={34} />
        <div>
          <strong className="ps-chat-name">{peer.name}</strong>
          <span className="ps-chat-sub">Anonymous</span>
        </div>
        <div className="ps-leave-wrap">
          <button className="ps-leave-btn" onClick={() => setConfirmLeave(true)}>Leave chat</button>
          {confirmLeave && (
            <LeaveConfirmBubble
              label="Leave this chat?"
              onCancel={() => setConfirmLeave(false)}
              onConfirm={() => onLeave(peer.id)}
            />
          )}
        </div>
      </div>

      <div className="ps-anon-notice">
        Anonymous chat - Do not share personal info, contact details, or social media handles
      </div>

      {modAlert && <ModAlert rule={modAlert} onDismiss={() => setModAlert(null)} />}

      <div className="ps-messages" ref={messagesRef}>
        {messages.map(m => {
          const isMe = m.role === 'me'
          return (
            <div key={m.id} className={`ps-msg-row${isMe ? ' ps-msg-row--self' : ''}`}>
              {!isMe && <AnonAvatar name={peer.name} color={peer.color} size={28} />}
              <div className={`ps-bubble${isMe ? ' ps-bubble--self' : ' ps-bubble--other'}`}>
                <p className="ps-bubble-text">{m.text}</p>
                <span className="ps-bubble-time">{m.time}</span>
              </div>
              {isMe && <div className="ps-self-dot" style={{ background: '#4f7c3a' }}>{anonName.slice(0, 2)}</div>}
            </div>
          )
        })}
        {isTyping && (
          <div className="ps-msg-row">
            <AnonAvatar name={peer.name} color={peer.color} size={28} />
            <div className="ps-bubble ps-bubble--other" style={{ padding: '14px 16px' }}>
              <span className="dot"/><span className="dot"/><span className="dot"/>
            </div>
          </div>
        )}
      </div>

      <div className="ps-input-bar">
        <textarea
          className="chat-textarea"
          placeholder="Message"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          disabled={isTyping}
        />
        <button className="send-btn" onClick={send} disabled={!input.trim() || isTyping} aria-label="Send">
          <SendIcon />
        </button>
      </div>
    </div>
  )
}

// Root

export default function PeerSupport() {
  const [savedOnboarding]           = useState(loadOnboardingState)
  const [savedPeerState]            = useState(loadPeerSupportState)
  const [anonName]                  = useState(() => savedOnboarding?.anonName ?? makeAnonName())
  const [view, setView]             = useState(() => savedOnboarding?.acceptedGuidelines ? 'hub' : 'onboarding')
  const [peers, setPeers]           = useState(() => mergeSavedPeers(savedPeerState?.peers))
  const [roomMessages, setRoomMessages] = useState(() => (
    Array.isArray(savedPeerState?.roomMessages)
      ? savedPeerState.roomMessages
      : ROOM_SEED.map(m => ({ ...m }))
  ))
  const [dmHistories, setDmHistories] = useState(() => (
    savedPeerState?.dmHistories && typeof savedPeerState.dmHistories === 'object'
      ? savedPeerState.dmHistories
      : {}
  ))
  const [activePeer, setActivePeer] = useState(null)

  useEffect(() => {
    savePeerSupportState({ peers, roomMessages, dmHistories })
  }, [peers, roomMessages, dmHistories])

  function setDmMessages(peerId, updater) {
    setDmHistories(prev => {
      const current = prev[peerId] ?? makeInitialDmMessages(activePeer ?? { id: peerId, name: 'Peer' }, anonName)
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [peerId]: next }
    })
  }

  function openDM(peer) {
    setDmHistories(prev => (
      prev[peer.id] ? prev : { ...prev, [peer.id]: makeInitialDmMessages(peer, anonName) }
    ))
    setActivePeer(peer)
    setView('dm')
  }
  function finishOnboarding() { saveOnboardingState(anonName); setView('hub') }
  function leaveDM(peerId) {
    setPeers(prev => prev.map(p => p.id === peerId ? { ...p, status: 'left' } : p))
    setActivePeer(null)
    setView('hub')
  }

  return (
    <>
      <style>{PS_STYLES}</style>
      {view === 'onboarding' && <OnboardingView anonName={anonName} onDone={finishOnboarding} />}
      {view === 'hub'        && <HubView anonName={anonName} peers={peers} setPeers={setPeers} onRoom={() => setView('room')} onDM={openDM} />}
      {view === 'room'       && <RoomView anonName={anonName} messages={roomMessages} setMessages={setRoomMessages} onBack={() => setView('hub')} onLeave={() => setView('hub')} />}
      {view === 'dm'         && activePeer && (
        <DMView
          peer={activePeer}
          anonName={anonName}
          messages={dmHistories[activePeer.id] ?? makeInitialDmMessages(activePeer, anonName)}
          setMessages={(updater) => setDmMessages(activePeer.id, updater)}
          onBack={() => setView('hub')}
          onLeave={leaveDM}
        />
      )}
    </>
  )
}

// Styles

const PS_STYLES = `
  .ps-eyebrow {
    margin: 0 0 10px; font-size: 0.78rem; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent);
  }
  .ps-heading { margin: 0 0 8px; font-size: 2rem; letter-spacing: -0.03em; }
  .ps-sub { margin: 0 0 24px; color: var(--muted); font-size: 1rem; line-height: 1.65; max-width: 60ch; }
  .ps-primary-btn {
    padding: 13px 32px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.95rem; font-weight: 700;
    transition: opacity 140ms, transform 140ms; display: inline-block;
  }
  .ps-primary-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .ps-back-btn { background: none; border: none; color: var(--muted); font-size: 0.88rem; font-weight: 600; padding: 0; cursor: pointer; }

  /* onboarding */
  .ps-center-wrap { max-width: 560px; }
  .ps-center-wrap--wide { max-width: 680px; }
  .ps-guidelines { display: grid; gap: 10px; margin-bottom: 22px; }
  .ps-guideline-row {
    display: flex; gap: 12px; align-items: flex-start;
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 14px; padding: 12px 16px;
  }
  .ps-guide-num {
    width: 24px; height: 24px; border-radius: 50%;
    background: var(--accent-soft); color: var(--accent);
    font-size: 0.76rem; font-weight: 800;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ps-guideline-row p { margin: 0; font-size: 0.88rem; color: var(--ink); line-height: 1.5; }
  .ps-agree-label { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; margin-bottom: 20px; cursor: pointer; }
  .ps-agree-label input { width: 16px; height: 16px; accent-color: var(--accent); }

  .ps-name-reveal {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    background: var(--panel-strong); border: 1px solid var(--line); border-radius: 22px;
    padding: 32px; margin-bottom: 28px; text-align: center;
    box-shadow: 0 8px 24px rgba(46,42,38,0.08);
  }
  .ps-name-big { font-size: 2rem; font-weight: 900; letter-spacing: -0.03em; }
  .ps-name-note { font-size: 0.78rem; color: var(--muted); margin: 0; }

  /* hub */
  .ps-hub-identity {
    display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 18px; padding: 16px 18px;
  }
  .ps-hub-name { margin: 0; font-weight: 700; font-size: 1rem; }
  .ps-hub-name-sub { margin: 2px 0 0; font-size: 0.76rem; color: var(--muted); }

  .ps-hub-cards { display: grid; gap: 12px; margin-bottom: 14px; }
  .ps-hub-cards + .page {
    gap: 14px;
  }
  .ps-hub-cards + .page > .ps-back-btn {
    display: none;
  }
  .ps-hub-cards + .page .page-header h2 {
    font-size: 1.2rem;
  }
  .ps-hub-cards + .page .page-header p {
    font-size: 0.86rem;
  }
  .ps-hub-card {
    display: flex; align-items: center; gap: 14px;
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 20px; padding: 18px 20px;
    box-shadow: 0 6px 18px rgba(46,42,38,0.06);
    cursor: pointer; text-align: left; width: 100%;
    transition: transform 140ms, box-shadow 140ms;
  }
  .ps-hub-card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(46,42,38,0.10); }
  .ps-hub-card-icon { width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ps-hub-card-icon--purple { background: rgba(58,104,152,0.10); color: #3a6898; }
  .ps-hub-card-icon--teal   { background: rgba(79,124,58,0.10); color: var(--accent); }
  .ps-hub-card-text { flex: 1; }
  .ps-hub-card-text strong { display: block; font-size: 0.95rem; margin-bottom: 3px; }
  .ps-hub-card-text p { margin: 0; font-size: 0.8rem; color: var(--muted); }
  .ps-hub-arrow { font-size: 1.1rem; color: var(--muted); }

  .ps-hub-pills { display: flex; flex-wrap: wrap; gap: 8px; }
  .ps-pill { padding: 5px 12px; border-radius: 999px; border: 1px solid var(--line); font-size: 0.76rem; color: var(--muted); background: rgba(255,255,255,0.7); }

  /* peers */
  .ps-section-heading {
    display: flex; align-items: center; justify-content: space-between;
    margin: 8px 0 10px; color: var(--muted);
    font-size: 0.76rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .ps-section-heading strong {
    display: flex; align-items: center; justify-content: center;
    min-width: 24px; height: 24px; border-radius: 999px;
    background: var(--accent-soft); color: var(--accent); font-size: 0.74rem;
  }
  .ps-peers-list { display: grid; gap: 12px; }
  .ps-peer-card {
    display: flex; align-items: center; gap: 14px;
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 18px; padding: 16px 18px;
    box-shadow: 0 4px 14px rgba(46,42,38,0.06);
    transition: transform 140ms;
  }
  .ps-peer-card:hover { transform: translateY(-1px); }
  .ps-peer-card--active {
    border-color: rgba(79,124,58,0.26);
    background: rgba(214,234,204,0.34);
  }
  .ps-active-empty {
    border: 1px dashed var(--line); border-radius: 18px;
    padding: 16px 18px; color: var(--muted); font-size: 0.88rem;
    background: rgba(255,255,255,0.58);
  }
  .ps-peer-info { flex: 1; }
  .ps-peer-info strong { display: block; font-size: 0.95rem; margin-bottom: 3px; }
  .ps-peer-concerns { margin: 0; font-size: 0.78rem; color: var(--muted); }
  .ps-req-btn {
    padding: 8px 16px; border-radius: 999px;
    border: 1.5px solid var(--accent); background: transparent;
    color: var(--accent); font-size: 0.82rem; font-weight: 700;
    white-space: nowrap; transition: background 140ms, color 140ms;
  }
  .ps-req-btn:hover { background: var(--accent); color: #fff; }
  .ps-req-btn--on { background: var(--accent); color: #fff; }
  .ps-req-pending { font-size: 0.82rem; color: var(--muted); white-space: nowrap; }

  /* chat shell */
  .ps-chat-root {
    display: flex; flex-direction: column;
    width: 100%;
    height: calc(100dvh - 168px);
    max-height: calc(100dvh - 168px);
    min-height: 0;
    background: transparent;
    border: 0;
    border-radius: 0;
    overflow: hidden;
    box-sizing: border-box;
  }
  .ps-chat-header {
    display: flex; align-items: center; gap: 10px;
    padding: 0 0 14px; border-bottom: 1px solid var(--line);
    background: transparent; flex-shrink: 0;
  }
  .ps-chat-name { display: block; font-size: 0.92rem; }
  .ps-chat-sub { font-size: 0.72rem; color: var(--muted); }
  .ps-leave-btn {
    margin-left: auto; padding: 6px 14px; border-radius: 999px;
    border: 1.5px solid rgba(220,38,38,0.35); background: transparent;
    color: #dc2626; font-size: 0.8rem; font-weight: 700; transition: background 140ms;
  }
  .ps-leave-btn:hover { background: rgba(220,38,38,0.06); }
  .ps-leave-wrap {
    position: relative;
    margin-left: auto;
  }
  .ps-leave-wrap .ps-leave-btn {
    margin-left: 0;
  }
  .ps-leave-confirm {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 20;
    width: 220px;
    padding: 12px;
    border: 1px solid rgba(220,38,38,0.20);
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 12px 28px rgba(46,42,38,0.14);
  }
  .ps-leave-confirm p {
    margin: 0 0 10px;
    color: var(--ink);
    font-size: 0.84rem;
    font-weight: 700;
  }
  .ps-leave-confirm-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .ps-confirm-cancel,
  .ps-confirm-danger {
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 0.78rem;
    font-weight: 700;
  }
  .ps-confirm-cancel {
    border: 1px solid var(--line);
    background: transparent;
    color: var(--muted);
  }
  .ps-confirm-danger {
    border: 1px solid #dc2626;
    background: #dc2626;
    color: #fff;
  }
  .ps-room-badge { width: 34px; height: 34px; border-radius: 10px; background: rgba(58,104,152,0.1); color: #3a6898; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ps-anon-notice { padding: 9px 0; font-size: 0.74rem; color: var(--muted); background: transparent; border-bottom: 1px solid var(--line); text-align: center; flex-shrink: 0; }

  /* messages */
  .ps-messages { flex: 1; overflow-y: auto; padding: 16px 0 8px; display: flex; flex-direction: column; gap: 10px; }
  .ps-messages::-webkit-scrollbar { width: 5px; }
  .ps-messages::-webkit-scrollbar-thumb { background: rgba(46,42,38,0.12); border-radius: 999px; }
  .ps-day-sep { text-align: center; font-size: 0.72rem; font-weight: 600; color: var(--muted); padding: 6px 0; letter-spacing: 0.04em; }
  .ps-msg-row { display: flex; align-items: flex-end; gap: 8px; animation: fade-up 180ms ease; }
  .ps-msg-row--self { flex-direction: row-reverse; }
  .ps-bubble { max-width: 72%; padding: 9px 13px 7px; border-radius: 18px; display: flex; flex-direction: column; gap: 3px; }
  .ps-bubble--other { background: #f1f5f9; border-bottom-left-radius: 5px; }
  .ps-bubble--self  { background: var(--accent); border-bottom-right-radius: 5px; }
  .ps-bubble-name  { font-size: 0.7rem; font-weight: 700; margin-bottom: 2px; }
  .ps-bubble-text  { margin: 0; font-size: 0.9rem; line-height: 1.5; color: var(--ink); word-break: break-word; }
  .ps-bubble--self .ps-bubble-text { color: #fff; }
  .ps-bubble-time  { font-size: 0.66rem; color: rgba(46,42,38,0.35); align-self: flex-end; }
  .ps-bubble--self .ps-bubble-time { color: rgba(255,255,255,0.6); }
  .ps-self-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.6rem; font-weight: 800; flex-shrink: 0; }

  /* moderation */
  .ps-mod-alert {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px; border-top: 1px solid; border-bottom: 1px solid;
    flex-shrink: 0; animation: fade-up 180ms ease;
  }
  .ps-mod-body { flex: 1; }
  .ps-mod-body strong { display: block; font-size: 0.88rem; margin-bottom: 4px; }
  .ps-mod-body p { margin: 0; font-size: 0.82rem; color: var(--ink); line-height: 1.5; }
  .ps-mod-dismiss { background: none; border: none; font-size: 1.3rem; color: var(--muted); cursor: pointer; padding: 0; flex-shrink: 0; }

  /* input bar */
  .ps-input-bar { display: flex; align-items: flex-end; gap: 10px; padding: 12px 0 0; border-top: 1px solid var(--line); background: transparent; flex-shrink: 0; }

  /* typing dots */
  .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--muted); margin: 0 2px; animation: dot-bounce 1.2s infinite ease-in-out; }
  .dot:nth-child(2) { animation-delay: 0.18s; }
  .dot:nth-child(3) { animation-delay: 0.36s; }
  @keyframes dot-bounce {
    0%,60%,100% { transform: translateY(0); opacity: 0.5; }
    30%          { transform: translateY(-6px); opacity: 1; }
  }

  @media (max-width: 640px) {
    .ps-peer-card { flex-wrap: wrap; }
    .ps-chat-root {
      height: calc(100dvh - 120px);
      max-height: calc(100dvh - 120px);
    }
    .ps-bubble { max-width: 85%; }
  }
`

