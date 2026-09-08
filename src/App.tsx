import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { HouseProvider, useHouse } from './context/HouseContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import BillsPage from './pages/BillsPage'
import RulesPage from './pages/RulesPage'
import ChoresPage from './pages/ChoresPage'
import SettingsPage from './pages/SettingsPage'
import Layout from './components/Layout'

const PAGE_TITLES: Record<string, string> = {
  bills: 'Bills',
  chores: 'Chores',
  rules: 'House Rules',
  settings: 'Settings',
}

function AppInner() {
  const { user, loading: authLoading } = useAuth()
  const { house, loading: houseLoading } = useHouse()
  const { c } = useTheme()
  const [tab, setTab] = useState(() => localStorage.getItem('activeTab') ?? 'bills')

  const handleSetTab = (t: string) => {
    localStorage.setItem('activeTab', t)
    setTab(t)
  }

  if (authLoading || houseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: c.bg }}>
        <div className="text-sm" style={{ color: c.textDim }}>Loading…</div>
      </div>
    )
  }

  if (!user) return <AuthPage />
  if (!house) return <OnboardingPage />

  return (
    <Layout tab={tab} setTab={handleSetTab} houseName={house.name}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: c.text }}>{PAGE_TITLES[tab]}</h1>
      </div>
      {tab === 'bills' && <BillsPage />}
      {tab === 'chores' && <ChoresPage />}
      {tab === 'rules' && <RulesPage />}
      {tab === 'settings' && <SettingsPage />}
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HouseProvider>
          <AppInner />
        </HouseProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
