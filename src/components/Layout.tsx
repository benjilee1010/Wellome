import { type ReactNode } from 'react'

interface Props {
  children: ReactNode
  tab: string
  setTab: (t: string) => void
}

const TABS = [
  { id: 'bills', label: 'Bills' },
  { id: 'rules', label: 'Rules' },
  { id: 'chores', label: 'Chores' },
  { id: 'settings', label: 'Settings' },
]

export default function Layout({ children, tab, setTab }: Props) {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center">
      <div className="w-full max-w-4xl flex flex-col min-h-screen">
        <main className="flex-1 px-5 py-6">
          {children}
        </main>

        <nav className="bg-white border-t border-stone-200 flex sticky bottom-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t.id ? 'text-teal-600 border-t-2 border-teal-500 -mt-px' : 'text-stone-400 hover:text-stone-600'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
