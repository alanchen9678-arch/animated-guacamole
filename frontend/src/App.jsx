import { useMemo, useState } from 'react'
import { UserProvider } from './context/UserContext.jsx'
import { pageConfig } from './routes/AppRoutes.jsx'
import Home from './pages/Home.jsx'

function AppShell() {
  const [activePage, setActivePage] = useState('home')

  const ActiveComponent = useMemo(
    () => pageConfig.find((page) => page.id === activePage)?.component ?? Home,
    [activePage],
  )

  return (
    <div className="app-shell">
      <style>{`
        .app-shell {
          min-height: 100vh;
          padding: 32px 20px 48px;
        }

        .frame {
          max-width: 1180px;
          margin: 0 auto;
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 28px;
          backdrop-filter: blur(14px);
          box-shadow: var(--shadow);
          overflow: hidden;
        }

        .hero {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 24px;
          padding: 32px;
          border-bottom: 1px solid var(--line);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.76), rgba(218, 243, 236, 0.92)),
            linear-gradient(120deg, rgba(242, 192, 120, 0.24), transparent 40%);
        }

        .eyebrow {
          margin: 0 0 10px;
          color: var(--accent);
          font-size: 0.82rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(2.4rem, 4vw, 4.6rem);
          line-height: 0.98;
          letter-spacing: -0.04em;
        }

        .hero p {
          max-width: 62ch;
          margin: 16px 0 0;
          color: var(--muted);
          font-size: 1.02rem;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          align-self: end;
        }

        .stat {
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(15, 118, 110, 0.12);
          border-radius: 18px;
          padding: 18px;
        }

        .stat strong {
          display: block;
          font-size: 1.8rem;
          margin-bottom: 6px;
        }

        .layout {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          min-height: 620px;
        }

        .sidebar {
          padding: 24px 18px;
          border-right: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.54);
        }

        .sidebar h2 {
          margin: 0 0 16px;
          font-size: 1rem;
        }

        .nav-list {
          display: grid;
          gap: 10px;
        }

        .nav-item {
          border: 1px solid transparent;
          background: transparent;
          color: var(--ink);
          text-align: left;
          padding: 14px 16px;
          border-radius: 16px;
          transition: transform 140ms ease, background-color 140ms ease, border-color 140ms ease;
        }

        .nav-item:hover {
          transform: translateX(2px);
          background: rgba(255, 255, 255, 0.65);
          border-color: var(--line);
        }

        .nav-item.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .content {
          padding: 28px;
        }

        .page {
          display: grid;
          gap: 18px;
          animation: fade-up 220ms ease;
        }

        .page-header h2 {
          margin: 0;
          font-size: 2rem;
          letter-spacing: -0.03em;
        }

        .page-header p {
          margin: 8px 0 0;
          color: var(--muted);
          max-width: 70ch;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 16px;
        }

        .card {
          grid-column: span 12;
          background: var(--panel-strong);
          border: 1px solid var(--line);
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 10px 24px rgba(23, 48, 66, 0.06);
        }

        .card h3 {
          margin: 0 0 10px;
          font-size: 1.05rem;
        }

        .card p,
        .card li {
          color: var(--muted);
        }

        .card ul {
          margin: 0;
          padding-left: 18px;
        }

        .span-4 {
          grid-column: span 4;
        }

        .span-5 {
          grid-column: span 5;
        }

        .span-6 {
          grid-column: span 6;
        }

        .span-7 {
          grid-column: span 7;
        }

        .span-8 {
          grid-column: span 8;
        }

        .pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .pill {
          padding: 10px 14px;
          border-radius: 999px;
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 600;
        }

        .journal-box {
          min-height: 150px;
          padding: 16px;
          border-radius: 18px;
          border: 1px dashed rgba(15, 118, 110, 0.28);
          background: rgba(218, 243, 236, 0.3);
          color: var(--muted);
        }

        .meter {
          height: 12px;
          border-radius: 999px;
          background: #e7eff1;
          overflow: hidden;
        }

        .meter > span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #0f766e, #49a99f);
        }

        .settings-list {
          display: grid;
          gap: 12px;
        }

        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border: 1px solid var(--line);
          border-radius: 16px;
        }

        .settings-row strong {
          display: block;
          margin-bottom: 4px;
        }

        .toggle {
          width: 54px;
          height: 30px;
          border-radius: 999px;
          background: #cfe3df;
          position: relative;
          flex: none;
        }

        .toggle::after {
          content: '';
          position: absolute;
          top: 4px;
          left: 28px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        code {
          display: inline-block;
          margin: 0 4px;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.8);
          color: var(--accent);
          font-family: Consolas, monospace;
          font-size: 0.92rem;
        }

        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 960px) {
          .hero,
          .layout {
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .sidebar {
            border-right: 0;
            border-bottom: 1px solid var(--line);
          }

          .nav-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .span-4,
          .span-5,
          .span-6,
          .span-7,
          .span-8 {
            grid-column: span 12;
          }
        }

        @media (max-width: 640px) {
          .app-shell {
            padding: 12px;
          }

          .hero,
          .content,
          .sidebar {
            padding: 18px;
          }

          .nav-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="frame">
        <header className="hero">
          <div>
            <p className="eyebrow">Mental health companion</p>
            <h1>One calm place for support, reflection, and next steps.</h1>
            <p>
              This frontend is now a working Vite + React app rooted in
              <code>frontend/</code>
              with the existing product areas wired into a single navigable interface.
            </p>
          </div>
          <div className="stats">
            <div className="stat">
              <strong>8</strong>
              <span>Product areas connected</span>
            </div>
            <div className="stat">
              <strong>24/7</strong>
              <span>Always-available self-guided support</span>
            </div>
            <div className="stat">
              <strong>1</strong>
              <span>Clean frontend entrypoint</span>
            </div>
          </div>
        </header>

        <div className="layout">
          <aside className="sidebar">
            <h2>Workspace</h2>
            <div className="nav-list">
              {pageConfig.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={`nav-item${page.id === activePage ? ' active' : ''}`}
                  onClick={() => setActivePage(page.id)}
                >
                  {page.label}
                </button>
              ))}
            </div>
          </aside>

          <main className="content">
            <ActiveComponent />
          </main>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <UserProvider>
      <AppShell />
    </UserProvider>
  )
}
