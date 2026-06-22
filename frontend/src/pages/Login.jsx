import { useState } from 'react'
import { useUser } from '../context/UserContext.jsx'

export default function Login({ onClose }) {
  const { login, register } = useUser()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') {
        await login(form.username, form.password)
      } else {
        await register(form.username, form.email, form.password, form.firstName)
      }
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <style>{`
        .auth-overlay {
          position: fixed; inset: 0; z-index: 400;
          background: rgba(46,42,38,0.45);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          animation: fade-in 160ms ease;
        }
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }

        .auth-card {
          width: 100%; max-width: 420px; margin: 16px;
          background: #faf4e8;
          border: 1px solid rgba(46,42,38,0.14);
          border-radius: 28px;
          padding: 36px 32px 32px;
          box-shadow: 0 32px 72px rgba(46,42,38,0.18);
          animation: slide-up 200ms ease;
        }
        @keyframes slide-up { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }

        .auth-logo {
          display: flex; align-items: center; gap: 10px; margin-bottom: 28px;
        }
        .auth-logo-mark {
          width: 28px; height: 28px; border-radius: 8px;
          background: linear-gradient(135deg, #4d6b58 0%, #3a6898 100%);
          flex: none; box-shadow: 0 4px 10px rgba(58,104,152,0.28);
        }
        .auth-logo span { font-size: 1.1rem; font-weight: 800; letter-spacing: -0.03em; color: #2e2a26; }

        .auth-tabs {
          display: flex; gap: 0; margin-bottom: 24px;
          background: rgba(46,42,38,0.07); border-radius: 12px; padding: 4px;
        }
        .auth-tab {
          flex: 1; padding: 8px 0; border: none; background: transparent;
          border-radius: 9px; font-size: 0.88rem; font-weight: 600; color: #6b6460;
          transition: background 140ms, color 140ms, box-shadow 140ms;
          cursor: pointer;
        }
        .auth-tab.active {
          background: #faf4e8; color: #2e2a26;
          box-shadow: 0 2px 8px rgba(46,42,38,0.10);
        }

        .auth-field { margin-bottom: 14px; }
        .auth-field label {
          display: block; font-size: 0.8rem; font-weight: 600;
          color: #6b6460; margin-bottom: 6px; letter-spacing: 0.04em;
        }
        .auth-field input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid rgba(46,42,38,0.18);
          border-radius: 12px; background: white;
          font-size: 0.95rem; color: #2e2a26;
          outline: none; transition: border-color 140ms, box-shadow 140ms;
          box-sizing: border-box;
        }
        .auth-field input:focus {
          border-color: #4d6b58;
          box-shadow: 0 0 0 3px rgba(77,107,88,0.12);
        }

        .auth-error {
          background: #fde8e8; border: 1px solid #f5b7b7;
          border-radius: 10px; padding: 10px 14px;
          font-size: 0.85rem; color: #b91c1c; margin-bottom: 14px;
        }

        .auth-submit {
          width: 100%; padding: 13px;
          border: none; border-radius: 14px;
          background: #4d6b58; color: white;
          font-size: 0.97rem; font-weight: 700;
          transition: background 140ms, opacity 140ms;
          cursor: pointer; margin-top: 4px;
        }
        .auth-submit:hover:not(:disabled) { background: #3a5244; }
        .auth-submit:disabled { opacity: 0.6; cursor: default; }

        .auth-close {
          position: absolute; top: 16px; right: 16px;
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid rgba(46,42,38,0.14);
          background: transparent; color: #6b6460;
          font-size: 1.1rem; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 140ms;
        }
        .auth-close:hover { background: rgba(46,42,38,0.07); }

        .auth-card-wrap { position: relative; }
      `}</style>

      <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="auth-card-wrap">
          <div className="auth-card">
            <div className="auth-logo">
              <div className="auth-logo-mark" />
              <span>Aurora</span>
            </div>

            <div className="auth-tabs">
              <button
                className={`auth-tab${mode === 'login' ? ' active' : ''}`}
                onClick={() => { setMode('login'); setError('') }}
                type="button"
              >
                Log in
              </button>
              <button
                className={`auth-tab${mode === 'register' ? ' active' : ''}`}
                onClick={() => { setMode('register'); setError('') }}
                type="button"
              >
                Sign up
              </button>
            </div>

            <form onSubmit={submit}>
              {mode === 'register' && (
                <div className="auth-field">
                  <label>First name</label>
                  <input
                    name="firstName" value={form.firstName} onChange={update}
                    placeholder="Jordan" autoComplete="given-name"
                  />
                </div>
              )}

              <div className="auth-field">
                <label>Username</label>
                <input
                  name="username" value={form.username} onChange={update}
                  placeholder="your_username" required autoComplete="username"
                />
              </div>

              {mode === 'register' && (
                <div className="auth-field">
                  <label>Email (optional)</label>
                  <input
                    name="email" type="email" value={form.email} onChange={update}
                    placeholder="you@email.com" autoComplete="email"
                  />
                </div>
              )}

              <div className="auth-field">
                <label>Password</label>
                <input
                  name="password" type="password" value={form.password} onChange={update}
                  placeholder="••••••••" required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button className="auth-submit" type="submit" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>
          </div>

          <button className="auth-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
      </div>
    </>
  )
}
