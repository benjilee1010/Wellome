import { type ReactNode } from 'react'
import { c } from '../lib/theme'

interface Props {
  children: ReactNode
  tab: string
  setTab: (t: string) => void
  houseName: string
}

const TABS = [
  { id: 'bills', label: 'Bills' },
  { id: 'chores', label: 'Chores' },
  { id: 'rules', label: 'Rules' },
  { id: 'settings', label: 'Settings' },
]

export default function Layout({ children, tab, setTab, houseName }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: c.bg }}>

      {/* Top header */}
      <header className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: c.border, background: c.surface }}>
        <div className="flex items-center" style={{ gap: '2px' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
            <rect width="28" height="28" rx="7" fill="#6366f1"/>
            <g transform="skewX(-8)">
              <polyline
                points="7,5 11,25 15,13 20,22 26,3"
                fill="none"
                stroke="white"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
          <span className="text-base font-bold" style={{ color: c.text, marginLeft: '4px' }}>ellome</span>
        </div>
        <span className="text-sm font-medium" style={{ color: c.textMuted }}>{houseName}</span>
      </header>

      {/* Page content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-10 py-10">
        {children}
      </main>

      {/* Floating nav pill */}
      <div className="flex justify-center sticky bottom-0 pb-8 pt-2" style={{ pointerEvents: 'none' }}>
        <nav className="flex rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: '0 4px 24px rgba(99,102,241,0.15), 0 2px 8px rgba(0,0,0,0.08)', pointerEvents: 'all' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-10 py-4 text-sm font-semibold tracking-wide transition-colors"
              style={{
                color: tab === t.id ? c.accentText : c.textMuted,
                background: tab === t.id ? c.accentBg : 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
