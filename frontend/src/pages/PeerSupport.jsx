import { useState, useRef, useEffect, useCallback } from 'react'
import {
  fetchPeerProfile,
  completePeerOnboarding,
  fetchPeerRooms,
  fetchRoomMessages,
  sendRoomMessage,
  fetchPeers,
  connectPeer,
  fetchDMs,
  sendDM,
} from '../services/api.js'

// Moderation engine

const MOD_RULES = [
  {
    type: 'severe_abuse', blocked: true,
    terms: ['fuck you','kill yourself','kys','kms','kill myself','murder'],
    patterns: [],
    label: 'Message blocked: unsafe language',
    message: "This message was flagged for unsafe or abusive language and wasn't sent. Please keep interactions respectful and safe for everyone here.",
    color: '#dc2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.22)',
  },
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
    terms: ['idiot','stupid','loser','worthless','shut up','you suck','hate you','go away','moron','dumb','retard'],
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

const GUIDELINES = [
  'Be kind and respectful. Everyone here is going through something difficult.',
  'Stay anonymous. Do not share your real name, phone number, email, or social media handles.',
  'Do not harass, bully, or demean other community members.',
  'Do not give medical advice or encourage others to stop taking medication.',
  'If someone expresses a crisis, encourage them to seek professional help.',
  'Conversations are AI-moderated 24/7. Serious or repeated violations may result in removal.',
]

function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function AnonAvatar({ name, color, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.3, flexShrink: 0,
    }}>{(name || '?').slice(0, 2)}</div>
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

function OnboardingView({ onDone, loading }) {
  const [agreed, setAgreed] = useState(false)
  const [step, setStep]     = useState(1)

  if (step === 2) {
    return (
      <section className="page">
        <div className="ps-center-wrap">
          <p className="ps-eyebrow">Almost there</p>
          <h2 className="ps-heading">Assigning your anonymous identity</h2>
          <p className="ps-sub">
            You will receive a unique anonymous name. No one will ever know your real identity.
          </p>
          <button
            className="ps-primary-btn"
            onClick={onDone}
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Setting up...' : 'Enter the community'}
          </button>
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

function HubView({ profile, rooms, peers, setPeers, onRoom, onDM, loadingPeers }) {
  const activeChats  = peers.filter(p => p.status === 'connected')
  const recommended  = peers.filter(p => p.status !== 'connected' && p.status !== 'declined').slice(0, 8)
  const room         = rooms[0]

  async function handleConnect(userId) {
    setPeers(prev => prev.map(p => p.userId === userId ? { ...p, status: 'pending' } : p))
    try {
      const res = await connectPeer(userId)
      setPeers(prev => prev.map(p => p.userId === userId ? { ...p, status: res.status } : p))
    } catch {
      setPeers(prev => prev.map(p => p.userId === userId ? { ...p, status: 'none' } : p))
    }
  }

  return (
    <section className="page">
      <div className="ps-hub-identity">
        <AnonAvatar name={profile.anonymousName} color={profile.avatarColor} size={42} />
        <div>
          <p className="ps-hub-name">{profile.anonymousName}</p>
          <p className="ps-hub-name-sub">Your anonymous identity</p>
        </div>
      </div>

      {room && (
        <div className="ps-hub-cards">
          <button className="ps-hub-card" onClick={() => onRoom(room)}>
            <div className="ps-hub-card-icon ps-hub-card-icon--purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="ps-hub-card-text">
              <strong>{room.name}</strong>
              <p>{room.memberCount} {room.memberCount === 1 ? 'member' : 'members'} - Live chat - AI-moderated</p>
            </div>
            <span className="ps-hub-arrow">→</span>
          </button>
        </div>
      )}

      {/* Active chats */}
      {activeChats.length > 0 && (
        <div>
          <div className="ps-section-heading">
            <span>Active chats</span>
            <strong>{activeChats.length}</strong>
          </div>
          <div className="ps-peers-list">
            {activeChats.map(p => (
              <div key={p.userId} className="ps-peer-card ps-peer-card--active">
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
      )}

      {/* Peer matches */}
      <div>
        <div className="ps-section-heading">
          <span>Peer matches</span>
          <strong>{recommended.length}</strong>
        </div>
        <div className="ps-peers-list">
          {loadingPeers && <div className="ps-active-empty">Loading peers...</div>}
          {!loadingPeers && recommended.length === 0 && (
            <div className="ps-active-empty">No other members yet. Invite others to join Aurora.</div>
          )}
          {recommended.map(p => (
            <div key={p.userId} className="ps-peer-card">
              <AnonAvatar name={p.name} color={p.color} size={48} />
              <div className="ps-peer-info">
                <strong>{p.name}</strong>
              </div>
              <div>
                {p.status === 'none'    && <button className="ps-req-btn" onClick={() => handleConnect(p.userId)}>Connect</button>}
                {p.status === 'pending' && !p.isRequester && <button className="ps-req-btn" onClick={() => handleConnect(p.userId)}>Accept</button>}
                {p.status === 'pending' && p.isRequester  && <span className="ps-req-pending">Pending...</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ps-hub-pills">
        <span className="ps-pill">All chats anonymous</span>
        <span className="ps-pill">AI-moderated 24/7</span>
        <span className="ps-pill">Messages saved securely</span>
      </div>
    </section>
  )
}

// Room chat

function RoomView({ profile, room, onBack }) {
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [modAlert, setModAlert]     = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [sending, setSending]       = useState(false)
  const [error, setError]           = useState(null)
  const messagesRef                 = useRef(null)
  const inputRef                    = useRef(null)
  const lastIdRef                   = useRef(null)
  const initialLoad                 = useRef(true)

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior })
  }, [])

  const loadMessages = useCallback(async (initial = false) => {
    try {
      const data = await fetchRoomMessages(room.id, initial ? null : lastIdRef.current)
      if (!data.length) return
      setMessages(prev => {
        const existing = new Set(prev.map(m => m.id))
        const fresh = data.filter(m => !existing.has(m.id))
        if (!fresh.length) return prev
        return [...prev, ...fresh]
      })
      lastIdRef.current = data[data.length - 1].id
    } catch {
      // silently ignore poll errors
    }
  }, [room.id])

  useEffect(() => {
    loadMessages(true).then(() => {
      scrollToBottom('auto')
      inputRef.current?.focus()
      initialLoad.current = false
    })
    const interval = setInterval(() => loadMessages(false), 5000)
    return () => clearInterval(interval)
  }, [loadMessages, scrollToBottom])

  useEffect(() => {
    if (!initialLoad.current) scrollToBottom()
  }, [messages, scrollToBottom])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    const flag = moderate(text)
    if (flag?.blocked) { setModAlert(flag); setInput(''); return }
    if (flag) setModAlert(flag)
    setSending(true)
    setInput('')
    try {
      const msg = await sendRoomMessage(room.id, text)
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      lastIdRef.current = msg.id
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="ps-chat-root">
      <div className="ps-chat-header">
        <button className="ps-back-btn" onClick={onBack}>Back</button>
        <div className="ps-room-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div>
          <strong className="ps-chat-name">{room.name}</strong>
          <span className="ps-chat-sub">Live chat - AI-moderated - updates every 5s</span>
        </div>
        <div className="ps-leave-wrap">
          <button className="ps-leave-btn" onClick={() => setConfirmLeave(true)}>Leave room</button>
          {confirmLeave && (
            <LeaveConfirmBubble
              label="Leave this room?"
              onCancel={() => setConfirmLeave(false)}
              onConfirm={onBack}
            />
          )}
        </div>
      </div>

      {modAlert && <ModAlert rule={modAlert} onDismiss={() => setModAlert(null)} />}
      {error && <div className="ps-error-bar">{error} <button onClick={() => setError(null)}>✕</button></div>}

      <div className="ps-messages" ref={messagesRef}>
        {messages.length === 0 && (
          <div className="ps-empty-chat">No messages yet. Be the first to say something.</div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`ps-msg-row${m.self ? ' ps-msg-row--self' : ''}`}>
            {!m.self && <AnonAvatar name={m.user} color={m.color} size={28} />}
            <div className={`ps-bubble${m.self ? ' ps-bubble--self' : ' ps-bubble--other'}`}>
              {!m.self && <span className="ps-bubble-name" style={{ color: m.color }}>{m.user}</span>}
              <p className="ps-bubble-text">{m.text}</p>
              <span className="ps-bubble-time">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {m.self && <div className="ps-self-dot" style={{ background: profile.avatarColor }}>{profile.anonymousName.slice(0, 2)}</div>}
          </div>
        ))}
      </div>

      <div className="ps-input-bar">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder="Send a message to the room"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          disabled={sending}
        />
        <button className="send-btn" onClick={send} disabled={!input.trim() || sending} aria-label="Send">
          <SendIcon />
        </button>
      </div>
    </div>
  )
}

// DM chat

function DMView({ peer, profile, onBack, onLeave }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [modAlert, setModAlert] = useState(null)
  const [sending, setSending]   = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [error, setError]       = useState(null)
  const messagesRef             = useRef(null)
  const inputRef                = useRef(null)
  const lastIdRef               = useRef(null)
  const initialLoad             = useRef(true)

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior })
  }, [])

  const loadMessages = useCallback(async (initial = false) => {
    try {
      const data = await fetchDMs(peer.userId, initial ? null : lastIdRef.current)
      if (!data.length) return
      setMessages(prev => {
        const existing = new Set(prev.map(m => m.id))
        const fresh = data.filter(m => !existing.has(m.id))
        if (!fresh.length) return prev
        return [...prev, ...fresh]
      })
      lastIdRef.current = data[data.length - 1].id
    } catch {
      // silently ignore
    }
  }, [peer.userId])

  useEffect(() => {
    loadMessages(true).then(() => {
      scrollToBottom('auto')
      inputRef.current?.focus()
      initialLoad.current = false
    })
    const interval = setInterval(() => loadMessages(false), 5000)
    return () => clearInterval(interval)
  }, [loadMessages, scrollToBottom])

  useEffect(() => {
    if (!initialLoad.current) scrollToBottom()
  }, [messages, scrollToBottom])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    const flag = moderate(text)
    if (flag?.blocked) { setModAlert(flag); setInput(''); return }
    if (flag) setModAlert(flag)
    setSending(true)
    setInput('')
    try {
      const msg = await sendDM(peer.userId, text)
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      lastIdRef.current = msg.id
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="ps-chat-root">
      <div className="ps-chat-header">
        <button className="ps-back-btn" onClick={onBack}>Back</button>
        <AnonAvatar name={peer.name} color={peer.color} size={34} />
        <div>
          <strong className="ps-chat-name">{peer.name}</strong>
          <span className="ps-chat-sub">Anonymous - updates every 5s</span>
        </div>
        <div className="ps-leave-wrap">
          <button className="ps-leave-btn" onClick={() => setConfirmLeave(true)}>Leave chat</button>
          {confirmLeave && (
            <LeaveConfirmBubble
              label="Leave this chat?"
              onCancel={() => setConfirmLeave(false)}
              onConfirm={onLeave}
            />
          )}
        </div>
      </div>

      <div className="ps-anon-notice">
        Anonymous chat — Do not share personal info, contact details, or social media handles
      </div>

      {modAlert && <ModAlert rule={modAlert} onDismiss={() => setModAlert(null)} />}
      {error && <div className="ps-error-bar">{error} <button onClick={() => setError(null)}>✕</button></div>}

      <div className="ps-messages" ref={messagesRef}>
        {messages.length === 0 && (
          <div className="ps-empty-chat">Start the conversation.</div>
        )}
        {messages.map(m => {
          const isMe = m.role === 'me'
          return (
            <div key={m.id} className={`ps-msg-row${isMe ? ' ps-msg-row--self' : ''}`}>
              {!isMe && <AnonAvatar name={peer.name} color={peer.color} size={28} />}
              <div className={`ps-bubble${isMe ? ' ps-bubble--self' : ' ps-bubble--other'}`}>
                <p className="ps-bubble-text">{m.text}</p>
                <span className="ps-bubble-time">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {isMe && <div className="ps-self-dot" style={{ background: profile.avatarColor }}>{profile.anonymousName.slice(0, 2)}</div>}
            </div>
          )
        })}
      </div>

      <div className="ps-input-bar">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder="Message"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          disabled={sending}
        />
        <button className="send-btn" onClick={send} disabled={!input.trim() || sending} aria-label="Send">
          <SendIcon />
        </button>
      </div>
    </div>
  )
}

// Root

export default function PeerSupport() {
  const [profile, setProfile]     = useState(null)
  const [rooms, setRooms]         = useState([])
  const [peers, setPeers]         = useState([])
  const [loadingPeers, setLoadingPeers] = useState(false)
  const [view, setView]           = useState('loading')
  const [activeRoom, setActiveRoom] = useState(null)
  const [activePeer, setActivePeer] = useState(null)
  const [onboardingLoading, setOnboardingLoading] = useState(false)

  useEffect(() => {
    fetchPeerProfile()
      .then(data => {
        setProfile(data)
        setView(data.isOnboarded ? 'hub' : 'onboarding')
      })
      .catch(() => setView('onboarding'))
  }, [])

  useEffect(() => {
    if (view !== 'hub') return
    fetchPeerRooms().then(setRooms).catch(() => {})
    setLoadingPeers(true)
    fetchPeers().then(setPeers).catch(() => {}).finally(() => setLoadingPeers(false))
  }, [view])

  async function finishOnboarding() {
    setOnboardingLoading(true)
    try {
      const data = await completePeerOnboarding()
      setProfile(data)
      setView('hub')
    } catch {
      // stay on onboarding
    } finally {
      setOnboardingLoading(false)
    }
  }

  function openRoom(room) { setActiveRoom(room); setView('room') }
  function openDM(peer)   { setActivePeer(peer); setView('dm') }

  if (view === 'loading') {
    return (
      <>
        <style>{PS_STYLES}</style>
        <section className="page"><p style={{ color: 'var(--muted)' }}>Loading...</p></section>
      </>
    )
  }

  return (
    <>
      <style>{PS_STYLES}</style>
      {view === 'onboarding' && (
        <OnboardingView onDone={finishOnboarding} loading={onboardingLoading} />
      )}
      {view === 'hub' && profile && (
        <HubView
          profile={profile}
          rooms={rooms}
          peers={peers}
          setPeers={setPeers}
          onRoom={openRoom}
          onDM={openDM}
          loadingPeers={loadingPeers}
        />
      )}
      {view === 'room' && profile && activeRoom && (
        <RoomView
          profile={profile}
          room={activeRoom}
          onBack={() => setView('hub')}
        />
      )}
      {view === 'dm' && profile && activePeer && (
        <DMView
          peer={activePeer}
          profile={profile}
          onBack={() => setView('hub')}
          onLeave={() => { setActivePeer(null); setView('hub') }}
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
  .ps-heading {
    margin: 0 0 8px;
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 2rem;
    letter-spacing: -0.03em;
  }
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

  /* hub */
  .ps-hub-identity {
    display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 18px; padding: 16px 18px;
  }
  .ps-hub-name { margin: 0; font-weight: 700; font-size: 1rem; }
  .ps-hub-name-sub { margin: 2px 0 0; font-size: 0.76rem; color: var(--muted); }

  .ps-hub-cards { display: grid; gap: 12px; margin-bottom: 14px; }
  .ps-hub-card {
    display: flex; align-items: center; gap: 14px;
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 20px; padding: 18px 20px;
    box-shadow: var(--shadow);
    cursor: pointer; text-align: left; width: 100%;
    transition: transform 140ms, box-shadow 140ms;
  }
  .ps-hub-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
  .ps-hub-card-icon { width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ps-hub-card-icon--purple { background: rgba(58,104,152,0.10); color: #3a6898; }
  .ps-hub-card-text { flex: 1; }
  .ps-hub-card-text strong { display: block; font-size: 0.95rem; margin-bottom: 3px; }
  .ps-hub-card-text p { margin: 0; font-size: 0.8rem; color: var(--muted); }
  .ps-hub-arrow { font-size: 1.1rem; color: var(--muted); }
  .ps-hub-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  .ps-pill { padding: 5px 12px; border-radius: 999px; border: 1px solid var(--line); font-size: 0.76rem; color: var(--muted); background: rgba(255,255,255,0.7); }

  /* peers */
  .ps-section-heading {
    display: flex; align-items: center; justify-content: space-between;
    margin: 16px 0 10px; color: var(--muted);
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
    box-shadow: var(--shadow);
    transition: transform 140ms;
  }
  .ps-peer-card:hover { transform: translateY(-1px); }
  .ps-peer-card--active {
    border-color: rgba(77,107,88,0.26);
    background: rgba(210,228,220,0.34);
  }
  .ps-active-empty {
    border: 1px dashed var(--line); border-radius: 18px;
    padding: 16px 18px; color: var(--muted); font-size: 0.88rem;
    background: rgba(255,255,255,0.58);
  }
  .ps-empty-chat {
    text-align: center; color: var(--muted); font-size: 0.88rem;
    padding: 40px 0;
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
    overflow: hidden;
    box-sizing: border-box;
  }
  .ps-chat-header {
    display: flex; align-items: center; gap: 10px;
    padding: 0 0 14px; border-bottom: 1px solid var(--line);
    flex-shrink: 0;
  }
  .ps-chat-name { display: block; font-size: 0.92rem; }
  .ps-chat-sub { font-size: 0.72rem; color: var(--muted); }
  .ps-leave-btn {
    margin-left: auto; padding: 6px 14px; border-radius: 999px;
    border: 1.5px solid rgba(220,38,38,0.35); background: transparent;
    color: #dc2626; font-size: 0.8rem; font-weight: 700; transition: background 140ms;
  }
  .ps-leave-btn:hover { background: rgba(220,38,38,0.06); }
  .ps-leave-wrap { position: relative; margin-left: auto; }
  .ps-leave-wrap .ps-leave-btn { margin-left: 0; }
  .ps-leave-confirm {
    position: absolute; top: calc(100% + 8px); right: 0; z-index: 20;
    width: 220px; padding: 12px;
    border: 1px solid rgba(220,38,38,0.20); border-radius: 14px;
    background: #fff; box-shadow: 0 12px 28px rgba(46,42,38,0.14);
  }
  .ps-leave-confirm p { margin: 0 0 10px; color: var(--ink); font-size: 0.84rem; font-weight: 700; }
  .ps-leave-confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .ps-confirm-cancel, .ps-confirm-danger { border-radius: 999px; padding: 6px 12px; font-size: 0.78rem; font-weight: 700; }
  .ps-confirm-cancel { border: 1px solid var(--line); background: transparent; color: var(--muted); }
  .ps-confirm-danger { border: 1px solid #dc2626; background: #dc2626; color: #fff; }
  .ps-room-badge { width: 34px; height: 34px; border-radius: 10px; background: rgba(58,104,152,0.1); color: #3a6898; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ps-anon-notice { padding: 9px 0; font-size: 0.74rem; color: var(--muted); border-bottom: 1px solid var(--line); text-align: center; flex-shrink: 0; }
  .ps-error-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 14px; background: rgba(220,38,38,0.06); border-bottom: 1px solid rgba(220,38,38,0.22);
    font-size: 0.82rem; color: #dc2626; flex-shrink: 0;
  }
  .ps-error-bar button { background: none; border: none; color: #dc2626; cursor: pointer; font-size: 1rem; }

  /* messages */
  .ps-messages { flex: 1; overflow-y: auto; padding: 16px 0 8px; display: flex; flex-direction: column; gap: 10px; }
  .ps-messages::-webkit-scrollbar { width: 5px; }
  .ps-messages::-webkit-scrollbar-thumb { background: rgba(46,42,38,0.12); border-radius: 999px; }
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
  .ps-input-bar {
    display: flex; align-items: flex-end; gap: 10px;
    padding: 12px 0 0; border-top: 1px solid rgba(46,42,38,0.12);
    flex-shrink: 0;
  }
  .chat-textarea {
    flex: 1; resize: none; border: 1.5px solid rgba(77,107,88,0.18);
    border-radius: 18px; padding: 12px 15px;
    min-height: 44px; max-height: 120px; overflow-y: auto;
    font-size: 0.92rem; line-height: 1.45;
    background: rgba(255,255,255,0.84); color: var(--ink);
    outline: none;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.92), 0 4px 14px rgba(46,42,38,0.05);
    transition: border-color 140ms, box-shadow 140ms, background 140ms;
  }
  .chat-textarea::placeholder { color: rgba(46,42,38,0.38); }
  .chat-textarea:focus {
    border-color: rgba(77,107,88,0.58); background: #fff;
    box-shadow: 0 0 0 3px rgba(77,107,88,0.12), 0 8px 20px rgba(46,42,38,0.07);
  }
  .chat-textarea:disabled { opacity: 0.6; }
  .send-btn {
    flex: none; width: 44px; height: 44px; border-radius: 15px;
    border: 1px solid rgba(58,82,68,0.24);
    background: linear-gradient(135deg,var(--accent),var(--blue));
    color: #fff; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 10px 22px rgba(77,107,88,0.22);
    transition: opacity 140ms, transform 140ms, box-shadow 140ms;
  }
  .send-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(58,104,152,0.25); }
  .send-btn:disabled {
    background: #d8ded8; color: rgba(46,42,38,0.38);
    box-shadow: none; cursor: not-allowed; border-color: transparent;
  }

  @media (max-width: 640px) {
    .ps-peer-card { flex-wrap: wrap; }
    .ps-chat-root { height: calc(100dvh - 120px); max-height: calc(100dvh - 120px); }
    .ps-bubble { max-width: 85%; }
  }
`
