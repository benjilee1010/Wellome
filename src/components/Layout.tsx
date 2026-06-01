import { type ReactNode, useState } from 'react'
import { useHouse } from '../context/HouseContext'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: ReactNode
  tab: string
  setTab: (t: string) => void
}

const TABS = [
  { id: 'bills', label: 'Bills', icon: '💳' },
  { id: 'rules', label: 'Rules', icon: '📋' },
  { id: 'chores', label: 'Chores', icon: '🧹' },
]

export default function Layout({ children, tab, setTab }: Props) {
  const { house, members } = useHouse()
  const { user, signOut } = useAuth()
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col min-h-screen">
        <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-800">Wellome</h1>
            <p className="text-xs text-stone-400">{house?.name}</p>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 font-bold text-sm flex items-center justify-center hover:bg-teal-200 transition-colors"
          >
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </button>
        </header>

        {showInfo && (
          <div className="absolute top-14 right-4 z-50 bg-white rounded-xl shadow-lg border border-stone-200 p-4 w-64">
            <p className="text-xs text-stone-500 mb-1">Invite code</p>
            <p className="font-mono text-lg font-bold text-teal-600 tracking-widest mb-3">{house?.invite_code}</p>
            <p className="text-xs text-stone-500 mb-2">Members ({members.length}/{house?.max_members})</p>
            <div className="space-y-1 mb-3">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-500 text-xs font-bold flex items-center justify-center">
                    {m.display_name[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-stone-700">{m.display_name}</span>
                  {m.user_id === user?.id && <span className="text-xs text-stone-400">(you)</span>}
                </div>
              ))}
            </div>
            <button
              onClick={signOut}
              className="w-full text-sm text-red-500 hover:text-red-600 font-medium py-1.5 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}

        {showInfo && (
          <div className="fixed inset-0 z-40" onClick={() => setShowInfo(false)} />
        )}

        <main className="flex-1 px-4 py-5">
          {children}
        </main>

        <nav className="bg-white border-t border-stone-200 flex">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${tab === t.id ? 'text-teal-600' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <span className="text-lg">{t.icon}</span>
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
