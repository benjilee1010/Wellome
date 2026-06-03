import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHouse } from '../context/HouseContext'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { house, members, refresh } = useHouse()
  const { user, signOut } = useAuth()
  const [copied, setCopied] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const copyCode = () => {
    navigator.clipboard.writeText(house?.invite_code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this member from the house?')) return
    setRemoving(memberId)
    await supabase.from('house_members').delete().eq('id', memberId)
    setRemoving(null)
    refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-800">{house?.name}</h2>
        <p className="text-sm text-stone-400">House settings</p>
      </div>

      {/* Invite */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <h3 className="text-sm font-semibold text-stone-700 mb-3">Invite members</h3>
        <p className="text-xs text-stone-400 mb-2">Share this code with your housemates so they can join.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-4 py-2.5 font-mono text-xl font-bold tracking-widest text-teal-600 text-center">
            {house?.invite_code}
          </div>
          <button
            onClick={copyCode}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-teal-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-stone-700">Members</h3>
          <span className="text-xs text-stone-400">{members.length} / {house?.max_members}</span>
        </div>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 text-sm font-bold flex items-center justify-center">
                  {m.display_name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700">
                    {m.display_name}
                    {m.user_id === user?.id && <span className="ml-1.5 text-xs text-stone-400 font-normal">(you)</span>}
                    {m.user_id === house?.created_by && <span className="ml-1.5 text-xs text-teal-500 font-normal">owner</span>}
                  </p>
                </div>
              </div>
              {m.user_id !== user?.id && (
                <button
                  onClick={() => removeMember(m.id)}
                  disabled={removing === m.id}
                  className="text-xs text-stone-400 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full py-2.5 text-sm font-medium text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
