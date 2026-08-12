import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHouse } from '../context/HouseContext'
import { useAuth } from '../context/AuthContext'
import { c, card, inputStyle } from '../lib/theme'

export default function SettingsPage() {
  const { house, members, refresh } = useHouse()
  const { user, signOut } = useAuth()
  const [copied, setCopied] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(house?.name ?? '')
  const [savingName, setSavingName] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(house?.invite_code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveName = async () => {
    if (!house || !newName.trim()) return
    setSavingName(true)
    await supabase.from('houses').update({ name: newName.trim() }).eq('id', house.id)
    setSavingName(false)
    setEditingName(false)
    refresh()
  }

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this member from the house?')) return
    setRemoving(memberId)
    await supabase.from('house_members').delete().eq('id', memberId)
    setRemoving(null)
    refresh()
  }

  const leaveHouse = async () => {
    if (!confirm('Are you sure you want to leave this house?')) return
    const me = members.find(m => m.user_id === user?.id)
    if (!me) return
    await supabase.from('house_members').delete().eq('id', me.id)
    refresh()
  }

  return (
    <div className="space-y-4">
      {/* House name */}
      <div style={card}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: c.textMuted }}>House name</h3>
          {!editingName && (
            <button onClick={() => { setEditingName(true); setNewName(house?.name ?? '') }} style={{ color: c.accentText, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Edit</button>
          )}
        </div>
        {editingName ? (
          <div className="flex gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} autoFocus />
            <button onClick={saveName} disabled={savingName} style={{ background: c.accent, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, opacity: savingName ? 0.5 : 1 }}>Save</button>
            <button onClick={() => setEditingName(false)} style={{ background: c.surfaceHover, color: c.textMuted, border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}>Cancel</button>
          </div>
        ) : (
          <p className="text-xl font-bold" style={{ color: c.text }}>{house?.name}</p>
        )}
      </div>

      {/* Invite code */}
      <div style={card}>
        <h3 className="text-sm font-semibold mb-1" style={{ color: c.textMuted }}>Invite code</h3>
        <p className="text-xs mb-3" style={{ color: c.textDim }}>Share with housemates so they can join.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg px-4 py-2.5 font-mono text-2xl font-bold tracking-widest text-center" style={{ background: c.surfaceHover, color: c.accentText, border: `1px solid ${c.border}` }}>
            {house?.invite_code}
          </div>
          <button onClick={copyCode} style={{ background: copied ? c.accent : c.surfaceHover, color: copied ? '#fff' : c.textMuted, border: `1px solid ${c.border}`, cursor: 'pointer', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 600 }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Members */}
      <div style={card}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: c.textMuted }}>Members</h3>
          <span className="text-xs" style={{ color: c.textDim }}>{members.length} / {house?.max_members}</span>
        </div>
        <div className="space-y-3">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: c.accentBg, color: c.accentText }}>
                  {m.display_name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: c.text }}>
                    {m.display_name}
                    {m.user_id === user?.id && <span className="ml-2 text-xs font-normal" style={{ color: c.textDim }}>you</span>}
                    {m.user_id === house?.created_by && <span className="ml-2 text-xs font-normal" style={{ color: c.accentText }}>owner</span>}
                  </p>
                </div>
              </div>
              {m.user_id !== user?.id && (
                <button onClick={() => removeMember(m.id)} disabled={removing === m.id} style={{ color: c.textDim, background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: removing === m.id ? 0.5 : 1 }}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leave */}
      <button onClick={leaveHouse} style={{ width: '100%', padding: '11px', fontSize: '14px', fontWeight: 600, borderRadius: '12px', background: c.dangerBg, color: c.danger, border: `1px solid ${c.dangerBorder}`, cursor: 'pointer' }}>
        Leave house
      </button>

      {/* Sign out */}
      <button onClick={signOut} style={{ width: '100%', padding: '11px', fontSize: '14px', fontWeight: 500, borderRadius: '12px', background: c.surface, color: c.textDim, border: `1px solid ${c.border}`, cursor: 'pointer' }}>
        Sign out
      </button>
    </div>
  )
}
