import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { HouseProvider, useHouse } from './context/HouseContext'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import BillsPage from './pages/BillsPage'
import RulesPage from './pages/RulesPage'
import ChoresPage from './pages/ChoresPage'
import Layout from './components/Layout'

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
      {tab === 'bills' && <BillsPage />}
      {tab === 'rules' && <RulesPage />}
      {tab === 'chores' && <ChoresPage />}
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
