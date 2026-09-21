import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatInput, ChatInputSubmit, ChatInputTextArea } from '../components/ui/chat-input.jsx'
import { AsyncButton, EmptyState, FeedbackNotice, LoadingState } from '../components/ui/feedback.jsx'
import { AvatarSymbol } from '../components/ui/avatar-symbols.jsx'
import {
  fetchPeerProfile,
  completePeerOnboarding,
  fetchPeerRooms,
  switchPeerRoom,
  optOutPeerRoom,
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
    message: "It sounds like you might be in a really dark place right now. You are not alone. Please reach out to the 988 Suicide & Crisis Lifeline (call or text 988, available 24/7). You can also connect with a therapist through Dawn Harbor's Therapist Match.",
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

function createPendingRoomMessage(text, profile) {
  return {
    id: `pending-room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user: profile.anonymousName,
    color: profile.avatarColor,
    avatarSymbol: profile.avatarSymbol,
    text,
    self: true,
    timestamp: new Date().toISOString(),
    pending: true,
  }
}

function createPendingDMMessage(text) {
  return {
    id: `pending-dm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'me',
    text,
    timestamp: new Date().toISOString(),
    pending: true,
  }
}

function AnonAvatar({ symbol = 'peer-cove', color = '#4d6b58', size = 36, label }) {
  return (
    <div
      className="ps-anon-avatar"
      style={{
        '--ps-avatar-color': color,
        width: size,
        height: size,
        borderRadius: Math.max(9, Math.round(size * 0.3)),
      }}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
    >
      <AvatarSymbol symbol={symbol} size={Math.round(size * 0.62)} />
    </div>
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

function RoomActionConfirm({ label, confirmLabel, onCancel, onConfirm, disabled, tone = 'danger' }) {
  const confirmClass = tone === 'primary' ? 'ps-confirm-primary' : 'ps-confirm-danger'
  return (
    <div className={'ps-leave-confirm'} role={'dialog'} aria-label={label}>
      <p>{label}</p>
      <div className={'ps-leave-confirm-actions'}>
        <button className={'ps-confirm-cancel'} onClick={onCancel} disabled={disabled}>Cancel</button>
        <button className={confirmClass} onClick={onConfirm} disabled={disabled}>{confirmLabel}</button>
      </div>
    </div>
  )
}

// Onboarding

function OnboardingView({ onDone, loading, error }) {
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
          {error && <FeedbackNotice variant="error" title="Could not enter the community" message={error} compact />}
          <AsyncButton
            className="ps-primary-btn"
            onClick={onDone}
            pending={loading}
            pendingLabel="Setting up…"
          >
            Enter the community
          </AsyncButton>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="ps-center-wrap ps-center-wrap--wide">
        <p className="ps-eyebrow">Dawn Harbor - Peer Support</p>
        <h2 className="ps-heading">Community guidelines</h2>
        <p className="ps-sub">
          Dawn Harbor's peer community connects you with others who share similar experiences.
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
          onClick={() => setStep(2)}
        >
          Continue
        </button>
      </div>
    </section>
  )
}

// Hub

function HubView({ profile, roomState, peers, setPeers, onRoom, onDM, loadingPeers, loadingRoom, onRefreshRoom }) {
  const activeChats  = peers.filter(p => p.status === 'connected')
  const recommended  = peers.filter(p => p.status !== 'connected' && p.status !== 'declined').slice(0, 8)
  const room         = roomState?.room ?? null
  const [connectError, setConnectError] = useState('')
  const [failedConnection, setFailedConnection] = useState(null)

  async function handleConnect(userId) {
    setConnectError('')
    setFailedConnection(null)
    setPeers(prev => prev.map(p => p.userId === userId ? { ...p, status: 'pending' } : p))
    try {
      const res = await connectPeer(userId)
      setPeers(prev => prev.map(p => p.userId === userId ? { ...p, status: res.status } : p))
    } catch (error) {
      setPeers(prev => prev.map(p => p.userId === userId ? { ...p, status: 'none' } : p))
      setConnectError(error.message || 'Unable to update this peer connection.')
      setFailedConnection(userId)
    }
  }

  return (
    <section className="page ps-hub-page">
      <header className="ps-page-header">
        <h2 className="ps-heading">Peer Support</h2>
        <p className="ps-page-sub">
          Join your support room and connect privately with anonymous peers in your support category.
        </p>
      </header>

      <div className="ps-hub-identity">
        <AnonAvatar symbol={profile.avatarSymbol} color={profile.avatarColor} size={42} />
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
              <p>{room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}</p>
            </div>
            <span className="ps-hub-arrow">→</span>
          </button>
        </div>
      )}

      {loadingRoom && (
        <div className={'ps-room-state'}>
          <LoadingState label={'Finding your support room...'} compact skeletonLines={1} />
        </div>
      )}

      {!loadingRoom && roomState?.status === 'waitlisted' && (
        <div className={'ps-room-state'} aria-live={'polite'}>
          <div>
            <strong>You are on the {roomState.categoryLabel} waitlist</strong>
            <p>
              {roomState.waitlist?.reason === 'opted_out'
                ? `We will place you when a new ${roomState.categoryLabel} support room is added.`
                : `${roomState.categoryLabel} support rooms are currently full. We will place you when space becomes available.`}
            </p>
          </div>
          <button className={'ps-room-state-action'} onClick={onRefreshRoom}>Check again</button>
        </div>
      )}

      {!loadingRoom && roomState?.status === 'assessment_required' && (
        <div className={'ps-room-state'}>
          <div>
            <strong>Complete your initial check-in</strong>
            <p>Your support category and room are selected after the initial assessment.</p>
          </div>
        </div>
      )}

      {/* Active chats */}
      {activeChats.length > 0 && (
        <section className="ps-peer-section" aria-labelledby="ps-active-chats-heading">
          <header className="ps-section-heading">
            <div>
              <h3 id="ps-active-chats-heading">Active chats</h3>
              <p>Continue conversations with connected peers.</p>
            </div>
            <span>{activeChats.length} {activeChats.length === 1 ? 'conversation' : 'conversations'}</span>
          </header>
          <div className="ps-peers-list ps-peers-list--chats" role="list">
            {activeChats.map(p => (
              <div key={p.userId} role="listitem">
                <button className="ps-chat-row" type="button" onClick={() => onDM(p)}>
                  <AnonAvatar symbol={p.avatarSymbol} color={p.color} size={46} />
                  <span className="ps-peer-info">
                    <strong>{p.name}</strong>
                    <span className="ps-peer-concerns">Connected peer</span>
                  </span>
                  <span className="ps-chat-row-action">Open chat <span aria-hidden="true">→</span></span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Peer matches */}
      <section className="ps-peer-section" aria-labelledby="ps-peer-matches-heading">
        <header className="ps-section-heading">
          <div>
            <h3 id="ps-peer-matches-heading">Peer matches</h3>
            <p>People in your support category.</p>
          </div>
          <span>{recommended.length} {recommended.length === 1 ? 'match' : 'matches'}</span>
        </header>
        <div className="ps-peers-list ps-peers-list--matches" role="list">
          {connectError && (
            <FeedbackNotice
              variant="error"
              title="Could not update connection"
              message={connectError}
              onRetry={() => handleConnect(failedConnection)}
              compact
            />
          )}
          {loadingPeers && <LoadingState label="Loading peer matches…" compact skeletonLines={2} />}
          {!loadingPeers && recommended.length === 0 && (
            <EmptyState
              title="No peer matches yet"
              description="Other members will appear here as the community grows."
              compact
            />
          )}
          {recommended.map(p => (
            <div key={p.userId} className="ps-match-row" role="listitem">
              <AnonAvatar symbol={p.avatarSymbol} color={p.color} size={48} />
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
      </section>

    </section>
  )
}

// Room chat

function RoomView({ profile, room, onBack, onSwitch, onOptOut }) {
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [modAlert, setModAlert]     = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [roomActionPending, setRoomActionPending] = useState(false)
  const [roomActionError, setRoomActionError] = useState('')
  const [sending, setSending]       = useState(false)
  const [error, setError]           = useState(null)
  const [errorContext, setErrorContext] = useState('')
  const [failedMessage, setFailedMessage] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
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
    } catch (loadError) {
      if (initial) {
        setError(loadError.message || 'Unable to load room messages.')
        setErrorContext('load')
      }
    }
  }, [room.id])

  useEffect(() => {
    loadMessages(true).then(() => {
      scrollToBottom('auto')
      inputRef.current?.focus()
      initialLoad.current = false
    }).finally(() => setInitialLoading(false))
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
    const pendingMessage = createPendingRoomMessage(text, profile)
    setSending(true)
    setError(null)
    setErrorContext('')
    setInput('')
    setMessages(prev => [...prev, pendingMessage])
    window.requestAnimationFrame(() => inputRef.current?.focus())
    try {
      const msg = await sendRoomMessage(room.id, text)
      setMessages(prev => {
        const withoutPending = prev.filter(m => m.id !== pendingMessage.id)
        if (withoutPending.some(m => m.id === msg.id)) return withoutPending
        return [...withoutPending, msg]
      })
      lastIdRef.current = msg.id
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== pendingMessage.id))
      setError(e.message)
      setErrorContext('send')
      setFailedMessage(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function handleRoomAction(action) {
    if (roomActionPending) return
    setRoomActionPending(true)
    setRoomActionError('')
    try {
      if (action === 'switch') await onSwitch()
      else await onOptOut()
      setConfirmAction(null)
    } catch (actionError) {
      setRoomActionError(actionError.message || 'Unable to update your support room right now.')
      setConfirmAction(null)
    } finally {
      setRoomActionPending(false)
    }
  }

  return (
    <div className="ps-chat-root">
      <div className="ps-chat-header">
        <button className="ps-back-btn" onClick={onBack}>Back</button>
        <div className="ps-chat-identity">
          <div className="ps-room-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="ps-chat-profile-copy">
            <strong className="ps-chat-name">{room.name}</strong>
            <span className="ps-chat-sub">{room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}</span>
          </div>
        </div>
        <div className={'ps-room-actions'}>
          <div className={'ps-leave-wrap'}>
            <button className={'ps-switch-btn'} onClick={() => setConfirmAction('switch')} disabled={roomActionPending}>Switch room</button>
            {confirmAction === 'switch' && (
              <RoomActionConfirm
                label={'Switch to another room in your support category?'}
                confirmLabel={'Switch'}
                tone={'primary'}
                onCancel={() => setConfirmAction(null)}
                onConfirm={() => handleRoomAction('switch')}
                disabled={roomActionPending}
              />
            )}
          </div>
          <div className={'ps-leave-wrap'}>
            <button className={'ps-leave-btn'} onClick={() => setConfirmAction('opt-out')} disabled={roomActionPending}>Leave room</button>
            {confirmAction === 'opt-out' && (
              <RoomActionConfirm
                label={'Leave this room and wait for a future room?'}
                confirmLabel={'Leave and wait'}
                onCancel={() => setConfirmAction(null)}
                onConfirm={() => handleRoomAction('opt-out')}
                disabled={roomActionPending}
              />
            )}
          </div>
        </div>
      </div>

      {roomActionError && (
        <FeedbackNotice
          variant={'error'}
          title={'Room unchanged'}
          message={roomActionError}
          compact
        />
      )}

      {modAlert && <ModAlert rule={modAlert} onDismiss={() => setModAlert(null)} />}
      {error && (
        <FeedbackNotice
          variant="error"
          title={errorContext === 'load' ? 'Could not load room messages' : 'Message not sent'}
          message={error}
          onRetry={errorContext === 'load'
            ? async () => {
                setInitialLoading(true)
                setError(null)
                await loadMessages(true)
                setInitialLoading(false)
              }
            : () => {
                setInput(failedMessage)
                setError(null)
                inputRef.current?.focus()
              }}
          retryLabel={errorContext === 'load' ? 'Reload messages' : 'Restore message'}
          onDismiss={() => setError(null)}
          compact
        />
      )}

      <div className="ps-messages" ref={messagesRef}>
        {initialLoading && <LoadingState label="Loading room messages…" compact skeletonLines={3} />}
        {!initialLoading && messages.length === 0 && !error && (
          <EmptyState
            title="No messages yet"
            description="Be the first to say something."
            compact
          />
        )}
        {messages.map(m => (
          <div key={m.id} className={`ps-msg-row${m.self ? ' ps-msg-row--self' : ''}`}>
            {!m.self && <AnonAvatar symbol={m.avatarSymbol} color={m.color} size={28} />}
            <div className={`ps-bubble${m.self ? ' ps-bubble--self' : ' ps-bubble--other'}${m.pending ? ' ps-bubble--pending' : ''}`}>
              {!m.self && <span className="ps-bubble-name" style={{ color: m.color }}>{m.user}</span>}
              <p className="ps-bubble-text">{m.text}</p>
              <span className="ps-bubble-time">
                {m.pending ? 'Sending...' : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {m.self && <AnonAvatar symbol={profile.avatarSymbol} color={profile.avatarColor} size={28} />}
          </div>
        ))}
      </div>

      <div className="ps-input-bar">
        <ChatInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={send}
          loading={sending}
          className="ps-chat-compose"
        >
          <ChatInputTextArea
            ref={inputRef}
            className="chat-textarea"
            placeholder="Send a message to the room"
            disabled={sending || initialLoading}
          />
          <ChatInputSubmit className="send-btn" disabled={initialLoading} />
        </ChatInput>
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
  const [errorContext, setErrorContext] = useState('')
  const [failedMessage, setFailedMessage] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
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
    } catch (loadError) {
      if (initial) {
        setError(loadError.message || 'Unable to load direct messages.')
        setErrorContext('load')
      }
    }
  }, [peer.userId])

  useEffect(() => {
    loadMessages(true).then(() => {
      scrollToBottom('auto')
      inputRef.current?.focus()
      initialLoad.current = false
    }).finally(() => setInitialLoading(false))
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
    const pendingMessage = createPendingDMMessage(text)
    setSending(true)
    setError(null)
    setErrorContext('')
    setInput('')
    setMessages(prev => [...prev, pendingMessage])
    window.requestAnimationFrame(() => inputRef.current?.focus())
    try {
      const msg = await sendDM(peer.userId, text)
      setMessages(prev => {
        const withoutPending = prev.filter(m => m.id !== pendingMessage.id)
        if (withoutPending.some(m => m.id === msg.id)) return withoutPending
        return [...withoutPending, msg]
      })
      lastIdRef.current = msg.id
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== pendingMessage.id))
      setError(e.message)
      setErrorContext('send')
      setFailedMessage(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="ps-chat-root">
      <div className="ps-chat-header">
        <button className="ps-back-btn" onClick={onBack}>Back</button>
        <div className="ps-chat-identity">
          <AnonAvatar symbol={peer.avatarSymbol} color={peer.color} size={34} />
          <div className="ps-chat-profile-copy">
            <strong className="ps-chat-name">{peer.name}</strong>
            <span className="ps-chat-sub">Anonymous {"\u00b7"} 5s updates</span>
          </div>
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
        Anonymous chat. Do not share personal info, contact details, or social media handles.
      </div>

      {modAlert && <ModAlert rule={modAlert} onDismiss={() => setModAlert(null)} />}
      {error && (
        <FeedbackNotice
          variant="error"
          title={errorContext === 'load' ? 'Could not load direct messages' : 'Message not sent'}
          message={error}
          onRetry={errorContext === 'load'
            ? async () => {
                setInitialLoading(true)
                setError(null)
                await loadMessages(true)
                setInitialLoading(false)
              }
            : () => {
                setInput(failedMessage)
                setError(null)
                inputRef.current?.focus()
              }}
          retryLabel={errorContext === 'load' ? 'Reload messages' : 'Restore message'}
          onDismiss={() => setError(null)}
          compact
        />
      )}

      <div className="ps-messages" ref={messagesRef}>
        {initialLoading && <LoadingState label="Loading direct messages…" compact skeletonLines={3} />}
        {!initialLoading && messages.length === 0 && !error && (
          <EmptyState
            title="No messages yet"
            description="Start the conversation when you're ready."
            compact
          />
        )}
        {messages.map(m => {
          const isMe = m.role === 'me'
          return (
            <div key={m.id} className={`ps-msg-row${isMe ? ' ps-msg-row--self' : ''}`}>
              {!isMe && <AnonAvatar symbol={peer.avatarSymbol} color={peer.color} size={28} />}
              <div className={`ps-bubble${isMe ? ' ps-bubble--self' : ' ps-bubble--other'}${m.pending ? ' ps-bubble--pending' : ''}`}>
                <p className="ps-bubble-text">{m.text}</p>
                <span className="ps-bubble-time">
                  {m.pending ? 'Sending...' : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {isMe && <AnonAvatar symbol={profile.avatarSymbol} color={profile.avatarColor} size={28} />}
            </div>
          )
        })}
      </div>

      <div className="ps-input-bar">
        <ChatInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={send}
          loading={sending}
          className="ps-chat-compose"
        >
          <ChatInputTextArea
            ref={inputRef}
            className="chat-textarea"
            placeholder="Message"
            disabled={sending || initialLoading}
          />
          <ChatInputSubmit className="send-btn" disabled={initialLoading} />
        </ChatInput>
      </div>
    </div>
  )
}

// Root

export default function PeerSupport() {
  const [profile, setProfile]     = useState(null)
  const [roomState, setRoomState] = useState(null)
  const [peers, setPeers]         = useState([])
  const [loadingPeers, setLoadingPeers] = useState(false)
  const [loadingRoom, setLoadingRoom] = useState(false)
  const [view, setView]           = useState('loading')
  const [activeRoom, setActiveRoom] = useState(null)
  const [activePeer, setActivePeer] = useState(null)
  const [onboardingLoading, setOnboardingLoading] = useState(false)
  const [onboardingError, setOnboardingError] = useState('')
  const [initialError, setInitialError] = useState('')
  const [profileReloadKey, setProfileReloadKey] = useState(0)
  const [hubError, setHubError] = useState('')
  const [hubReloadKey, setHubReloadKey] = useState(0)

  useEffect(() => {
    setView('loading')
    setInitialError('')
    fetchPeerProfile()
      .then(data => {
        setProfile(data)
        setView(data.isOnboarded ? 'hub' : 'onboarding')
      })
      .catch((error) => {
        setInitialError(error.message || 'Unable to load Peer Support.')
        setView('error')
      })
  }, [profileReloadKey])

  useEffect(() => {
    if (view !== 'hub') return
    setHubError('')
    setLoadingRoom(true)
    fetchPeerRooms()
      .then(setRoomState)
      .catch((error) => setHubError(error.message || 'Unable to load support rooms.'))
      .finally(() => setLoadingRoom(false))
    setLoadingPeers(true)
    fetchPeers().then(setPeers).catch((error) => setHubError(error.message || 'Unable to load peer matches.')).finally(() => setLoadingPeers(false))
  }, [view, hubReloadKey])

  async function finishOnboarding() {
    setOnboardingLoading(true)
    setOnboardingError('')
    try {
      const data = await completePeerOnboarding()
      setProfile(data)
      if (data.roomState) setRoomState(data.roomState)
      setView('hub')
    } catch (error) {
      setOnboardingError(error.message || 'Unable to finish setup right now.')
    } finally {
      setOnboardingLoading(false)
    }
  }

  function openRoom(room) { setActiveRoom(room); setView('room') }
  function openDM(peer)   { setActivePeer(peer); setView('dm') }

  async function refreshRoomState() {
    setLoadingRoom(true)
    setHubError('')
    try {
      const data = await fetchPeerRooms()
      setRoomState(data)
    } catch (error) {
      setHubError(error.message || 'Unable to check room availability.')
    } finally {
      setLoadingRoom(false)
    }
  }

  async function handleRoomSwitch() {
    const data = await switchPeerRoom()
    setRoomState(data)
    setActiveRoom(data.room)
  }

  async function handleRoomOptOut() {
    const data = await optOutPeerRoom()
    setRoomState(data)
    setActiveRoom(null)
    setView('hub')
  }

  if (view === 'loading') {
    return (
      <>
        <style>{PS_STYLES}</style>
        <section className="page"><LoadingState label="Loading Peer Support…" skeletonLines={3} /></section>
      </>
    )
  }

  if (view === 'error') {
    return (
      <>
        <style>{PS_STYLES}</style>
        <section className="page">
          <FeedbackNotice
            variant="error"
            title="Could not load Peer Support"
            message={initialError}
            onRetry={() => setProfileReloadKey((key) => key + 1)}
          />
        </section>
      </>
    )
  }

  return (
    <>
      <style>{PS_STYLES}</style>
      {view === 'onboarding' && (
        <OnboardingView onDone={finishOnboarding} loading={onboardingLoading} error={onboardingError} />
      )}
      {view === 'hub' && profile && (
        <>
          {hubError && (
            <FeedbackNotice
              variant="error"
              title="Some community information could not be loaded"
              message={hubError}
              onRetry={() => setHubReloadKey((key) => key + 1)}
              compact
            />
          )}
          <HubView
            profile={profile}
            roomState={roomState}
            peers={peers}
            setPeers={setPeers}
            onRoom={openRoom}
            onDM={openDM}
            loadingPeers={loadingPeers}
            loadingRoom={loadingRoom}
            onRefreshRoom={refreshRoomState}
          />
        </>
      )}
      {view === 'room' && profile && activeRoom && (
        <RoomView
          key={activeRoom.id}
          profile={profile}
          room={activeRoom}
          onBack={() => setView('hub')}
          onSwitch={handleRoomSwitch}
          onOptOut={handleRoomOptOut}
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
    margin: 0 0 10px; font-size: var(--type-metadata); font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent);
  }
  .ps-heading {
    margin: 0 0 8px;
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: var(--type-page-title);
    font-weight: var(--weight-page-title);
    line-height: 1.15;
    letter-spacing: -0.03em;
  }
  .ps-sub { margin: 0 0 24px; color: var(--muted); font-size: var(--type-body); font-weight: 400; line-height: 1.65; max-width: 60ch; }
  .ps-page-header { margin-bottom: 22px; }
  .ps-page-header .ps-heading { margin-bottom: 7px; }
  .ps-page-sub {
    max-width: 62ch;
    margin: 0;
    color: var(--muted);
    font-size: var(--type-body);
    line-height: 1.6;
  }
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
  .ps-guideline-row p { margin: 0; font-size: 0.875rem; font-weight: 400; color: var(--ink); line-height: 1.5; }
  .ps-agree-label { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; margin-bottom: 20px; cursor: pointer; }
  .ps-agree-label input { width: 16px; height: 16px; accent-color: var(--accent); }

  /* hub */
  .ps-hub-identity {
    display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 18px; padding: 16px 18px;
  }
  .ps-hub-name { margin: 0; font-weight: var(--weight-card-title); font-size: var(--type-card-title); }
  .ps-hub-name-sub { margin: 2px 0 0; font-size: var(--type-metadata); color: var(--muted); }

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
  .ps-room-state {
    display: flex; align-items: center; justify-content: space-between; gap: 18px;
    margin-bottom: 14px; padding: 16px 4px;
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
  }
  .ps-room-state strong { display: block; margin-bottom: 4px; font-size: 0.95rem; color: var(--ink); }
  .ps-room-state p { margin: 0; max-width: 64ch; color: var(--muted); font-size: 0.82rem; line-height: 1.55; }
  .ps-room-state-action, .ps-switch-btn {
    flex-shrink: 0; padding: 7px 13px; border-radius: 999px;
    border: 1px solid rgba(77,107,88,0.34); background: transparent;
    color: var(--accent); font-size: 0.8rem; font-weight: 700;
    transition: background 140ms, border-color 140ms;
  }
  .ps-room-state-action:hover, .ps-switch-btn:hover { background: var(--accent-soft); border-color: var(--accent); }
  /* peers */
  .ps-peer-section { margin-top: 28px; }
  .ps-section-heading {
    display: flex; align-items: end; justify-content: space-between; gap: 24px;
    margin: 0; padding-bottom: 11px; border-bottom: 1px solid var(--line-strong);
  }
  .ps-section-heading h3 {
    margin: 0;
    color: var(--ink);
    font-size: 1rem;
    font-weight: 650;
    letter-spacing: -0.015em;
  }
  .ps-section-heading p {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 0.77rem;
    line-height: 1.45;
  }
  .ps-section-heading > span {
    flex: none;
    color: var(--muted-soft);
    font-size: 0.72rem;
    font-weight: 600;
  }
  .ps-peers-list { display: grid; gap: 0; }
  .ps-chat-row,
  .ps-match-row {
    display: flex; align-items: center; gap: 14px;
    width: 100%; min-height: 72px; padding: 14px 4px;
    border: 0; border-bottom: 1px solid var(--line);
    border-radius: 0; background: transparent; box-shadow: none;
    color: var(--ink); text-align: left;
    transition: background-color var(--motion-fast), box-shadow var(--motion-fast);
  }
  .ps-chat-row { cursor: pointer; }
  .ps-chat-row:hover,
  .ps-match-row:hover {
    background: var(--accent-wash);
    box-shadow: inset 3px 0 0 var(--accent);
  }
  .ps-chat-row-action {
    margin-left: auto;
    color: var(--accent-ink);
    font-size: 0.78rem;
    font-weight: 650;
    white-space: nowrap;
  }
  .ps-chat-row-action > span {
    display: inline-block;
    margin-left: 5px;
    transition: transform var(--motion-fast);
  }
  .ps-chat-row:hover .ps-chat-row-action > span {
    transform: translateX(2px);
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
  .ps-peer-info { display: block; flex: 1; min-width: 0; }
  .ps-peer-info strong { display: block; font-size: 0.95rem; margin-bottom: 3px; }
  .ps-peer-concerns { display: block; margin: 0; font-size: 0.78rem; color: var(--muted); }
  .ps-req-btn {
    padding: 8px 16px; border-radius: 999px;
    border: 1.5px solid var(--accent); background: transparent;
    color: var(--accent); font-size: 0.82rem; font-weight: 700;
    white-space: nowrap; transition: background 140ms, color 140ms;
  }
  .ps-req-btn:hover { background: var(--accent); color: #fff; }
  .ps-req-btn--on { background: var(--accent); color: #fff; }
  .ps-req-pending { font-size: 0.82rem; color: var(--muted); white-space: nowrap; }

  @media (min-width: 880px) {
    .ps-peers-list--matches {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 32px;
    }
  }

  /* chat shell */
  .ps-chat-root {
    display: flex; flex-direction: column;
    width: 100%;
    height: 100%;
    max-height: none;
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
  .ps-room-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .ps-leave-wrap { position: relative; margin-left: auto; }
  .ps-room-actions .ps-leave-wrap { margin-left: 0; }
  .ps-leave-wrap .ps-leave-btn { margin-left: 0; }
  .ps-leave-confirm {
    position: absolute; top: calc(100% + 8px); right: 0; z-index: 20;
    width: 220px; padding: 12px;
    border: 1px solid rgba(220,38,38,0.20); border-radius: 14px;
    background: #fff; box-shadow: 0 12px 28px rgba(46,42,38,0.14);
  }
  .ps-leave-confirm p { margin: 0 0 10px; color: var(--ink); font-size: 0.84rem; font-weight: 700; }
  .ps-leave-confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .ps-confirm-cancel, .ps-confirm-primary, .ps-confirm-danger { border-radius: 999px; padding: 6px 12px; font-size: 0.78rem; font-weight: 700; }
  .ps-confirm-cancel { border: 1px solid var(--line); background: transparent; color: var(--muted); }
  .ps-confirm-primary { border: 1px solid var(--accent); background: var(--accent); color: #fff; }
  .ps-confirm-danger { border: 1px solid #dc2626; background: #dc2626; color: #fff; }
  .ps-confirm-cancel:disabled, .ps-confirm-primary:disabled, .ps-confirm-danger:disabled, .ps-switch-btn:disabled, .ps-leave-btn:disabled { opacity: 0.55; cursor: wait; }
  .ps-room-badge { width: 34px; height: 34px; border-radius: 10px; background: rgba(58,104,152,0.1); color: #3a6898; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ps-anon-notice { padding: 9px 0; font-size: 0.74rem; color: var(--muted); border-bottom: 1px solid var(--line); text-align: center; flex-shrink: 0; }
  .ps-error-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 14px; background: rgba(220,38,38,0.06); border-bottom: 1px solid rgba(220,38,38,0.22);
    font-size: 0.82rem; color: #dc2626; flex-shrink: 0;
  }
  .ps-error-bar button { background: none; border: none; color: #dc2626; cursor: pointer; font-size: 1rem; }

  /* messages */
  .ps-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 0 8px; display: flex; flex-direction: column; gap: 10px; }
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
  .ps-bubble--pending { opacity: 0.6; filter: saturate(0.75); }
  .ps-bubble--pending .ps-bubble-time { font-style: italic; }
  .ps-anon-avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--ps-avatar-color) 40%, transparent);
    color: var(--ps-avatar-color);
    background-color: color-mix(in srgb, var(--ps-avatar-color) 13%, var(--panel-strong));
    background-image: var(--paper-grain-white);
    background-size: 90px 90px;
    background-blend-mode: soft-light;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
  }

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
    padding: 12px 0 0; border-top: 1px solid rgba(46,42,38,0.12);
    flex-shrink: 0;
  }
  .ps-chat-compose { width: 100%; }
  .chat-textarea {
    min-height: 26px; max-height: 120px;
  }
  .send-btn {
    width: 40px; height: 40px;
  }

  @media (max-width: 640px) {
    .ps-chat-row, .ps-match-row { flex-wrap: wrap; }
    .ps-room-state { align-items: flex-start; flex-direction: column; gap: 12px; }
    .ps-chat-header { flex-wrap: wrap; }
    .ps-room-actions { width: 100%; justify-content: flex-end; }
    .ps-chat-root { height: calc(100dvh - 120px); max-height: calc(100dvh - 120px); }
    .ps-bubble { max-width: 85%; }
  }
`
