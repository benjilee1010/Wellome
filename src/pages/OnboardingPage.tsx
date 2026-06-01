import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useHouse } from '../context/HouseContext'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
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
      .select()
      .single()
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
    const { data: house } = await supabase
      .from('houses')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single()
    if (!house) { setError('Invalid invite code.'); setLoading(false); return }

    const { data: existing } = await supabase
      .from('house_members')
      .select('id')
      .eq('house_id', house.id)
    const count = existing?.length ?? 0
    if (count >= house.max_members) { setError('House is full.'); setLoading(false); return }

    const { error: mErr } = await supabase
      .from('house_members')
      .insert({ house_id: house.id, user_id: user!.id, display_name: joinName || user!.email })
    if (mErr) { setError(mErr.message); setLoading(false); return }
    refresh()
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-stone-800 mb-1">Wellome</h1>
          <p className="text-stone-500 text-sm">Set up your house to get started.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <div className="flex rounded-lg bg-stone-100 p-1 mb-5">
            <button
              onClick={() => setTab('create')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${tab === 'create' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
            >
              Create house
            </button>
            <button
              onClick={() => setTab('join')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${tab === 'join' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
            >
              Join house
            </button>
          </div>

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">House name</label>
                <input
                  value={houseName}
                  onChange={e => setHouseName(e.target.value)}
                  required
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="e.g. The Cave"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Your name</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="e.g. Alex"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Max members</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={maxMembers}
                  onChange={e => setMaxMembers(Number(e.target.value))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg py-2 text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Create house'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Invite code</label>
                <input
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  required
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="XXXXXX"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Your name</label>
                <input
                  value={joinName}
                  onChange={e => setJoinName(e.target.value)}
                  required
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="e.g. Jordan"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg py-2 text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Joining…' : 'Join house'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
