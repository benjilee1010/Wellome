import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { HouseProvider, useHouse } from './context/HouseContext'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import BillsPage from './pages/BillsPage'
import RulesPage from './pages/RulesPage'
import ChoresPage from './pages/ChoresPage'
import SettingsPage from './pages/SettingsPage'
import Layout from './components/Layout'

const PAGE_TITLES: Record<string, string> = {
  bills: 'Bills',
  rules: 'House Rules',
  chores: 'Chores',
  settings: 'Settings',
}

function AppInner() {
  const { user, loading: authLoading } = useAuth()
  const { house, loading: houseLoading } = useHouse()
  const [tab, setTab] = useState('bills')

  if (authLoading || houseLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!user) return <AuthPage />
  if (!house) return <OnboardingPage />

  return (
    <Layout tab={tab} setTab={setTab}>
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-0.5">{house.name}</p>
        <h1 className="text-2xl font-bold text-stone-800">{PAGE_TITLES[tab]}</h1>
      </div>
      {tab === 'bills' && <BillsPage />}
      {tab === 'rules' && <RulesPage />}
      {tab === 'chores' && <ChoresPage />}
      {tab === 'settings' && <SettingsPage />}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HouseProvider>
        <AppInner />
      </HouseProvider>
    </AuthProvider>
  )
}
