import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useHouse } from '../context/HouseContext'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const inputStyle = {
  width: '100%',
  background: '#1a1a2e',
  border: '1px solid #2a2a42',
  borderRadius: '8px',
  padding: '10px 12px',
  color: '#e2e2ee',
  fontSize: '14px',
  outline: 'none',
}

export default function OnboardingPage() {
  const { user } = useAuth()
  const { refresh } = useHouse()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [houseName, setHouseName] = useState('')
  const [maxMembers, setMaxMembers] = useState(4)
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const code = generateCode()
    const { data: house, error: hErr } = await supabase
      .from('houses')
      .insert({ name: houseName, invite_code: code, max_members: maxMembers, created_by: user!.id })
      .select().single()
    if (hErr) { setError(hErr.message); setLoading(false); return }
    const { error: mErr } = await supabase
      .from('house_members')
      .insert({ house_id: house.id, user_id: user!.id, display_name: displayName || user!.email })
    if (mErr) { setError(mErr.message); setLoading(false); return }
    refresh()
    setLoading(false)
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data: house } = await supabase.from('houses').select('*').eq('invite_code', inviteCode.toUpperCase()).single()
    if (!house) { setError('Invalid invite code.'); setLoading(false); return }
    const { data: existing } = await supabase.from('house_members').select('id').eq('house_id', house.id)
    if ((existing?.length ?? 0) >= house.max_members) { setError('House is full.'); setLoading(false); return }
    const { error: mErr } = await supabase.from('house_members').insert({ house_id: house.id, user_id: user!.id, display_name: joinName || user!.email })
    if (mErr) { setError(mErr.message); setLoading(false); return }
    refresh()
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0e0e16' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-1" style={{ color: '#e2e2ee' }}>Wellome</h1>
          <p className="text-sm" style={{ color: '#6b6b8a' }}>Set up your house to get started.</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: '#13131f', border: '1px solid #1e1e30' }}>
          <div className="flex rounded-lg p-1 mb-5" style={{ background: '#0e0e16' }}>
            {(['create', 'join'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 text-sm font-medium py-1.5 rounded-md transition-colors"
                style={{
                  background: tab === t ? '#1e1e30' : 'none',
                  color: tab === t ? '#e2e2ee' : '#6b6b8a',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {t === 'create' ? 'Create house' : 'Join house'}
              </button>
            ))}
          </div>

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6b6b8a' }}>House name</label>
                <input value={houseName} onChange={e => setHouseName(e.target.value)} required style={inputStyle} placeholder="e.g. The Cave" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6b6b8a' }}>Your name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} required style={inputStyle} placeholder="e.g. Alex" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6b6b8a' }}>Max members</label>
                <input type="number" min={2} max={20} value={maxMembers} onChange={e => setMaxMembers(Number(e.target.value))} style={inputStyle} />
              </div>
              {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50" style={{ background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {loading ? 'Creating…' : 'Create house'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6b6b8a' }}>Invite code</label>
                <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} required style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.2em', textTransform: 'uppercase' }} placeholder="XXXXXX" maxLength={6} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6b6b8a' }}>Your name</label>
                <input value={joinName} onChange={e => setJoinName(e.target.value)} required style={inputStyle} placeholder="e.g. Jordan" />
              </div>
              {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50" style={{ background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {loading ? 'Joining…' : 'Join house'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
