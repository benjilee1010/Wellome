import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHouse } from '../context/HouseContext'
import { useAuth } from '../context/AuthContext'
import { type HouseRule } from '../lib/types'
import { c, card, inputStyle } from '../lib/theme'

export default function RulesPage() {
  const { house, members } = useHouse()
  const { user } = useAuth()
  const [rules, setRules] = useState<HouseRule[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newRule, setNewRule] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!house) return
    const { data } = await supabase.from('house_rules').select('*').eq('house_id', house.id).order('created_at')
    setRules((data ?? []) as HouseRule[])
  }

  useEffect(() => { load() }, [house])

  const proposeRule = async () => {
    if (!house || !user || !newRule.trim()) return
    setLoading(true)
    await supabase.from('house_rules').insert({ house_id: house.id, text: newRule.trim(), proposed_by: user.id, status: 'pending', votes_approve: [user.id], votes_reject: [] })
    setNewRule(''); setShowAdd(false); setLoading(false); load()
  }

  const vote = async (rule: HouseRule, approve: boolean) => {
    if (!user) return
    const uid = user.id
    let votesApprove = rule.votes_approve.filter(v => v !== uid)
    let votesReject = rule.votes_reject.filter(v => v !== uid)
    if (approve) votesApprove = [...votesApprove, uid]
    else votesReject = [...votesReject, uid]
    const threshold = Math.ceil(members.length * 0.75)
    let status: 'pending' | 'approved' | 'rejected' = 'pending'
    if (votesApprove.length >= threshold) status = 'approved'
    else if (votesReject.length > members.length - threshold) status = 'rejected'
    await supabase.from('house_rules').update({ votes_approve: votesApprove, votes_reject: votesReject, status }).eq('id', rule.id)
    load()
  }

  const removeVote = async (rule: HouseRule) => {
    if (!user) return
    const uid = user.id
    const votesApprove = rule.votes_approve.filter(v => v !== uid)
    const votesReject = [...rule.votes_reject.filter(v => v !== uid), uid]
    if (votesReject.length >= members.length) {
      await supabase.from('house_rules').delete().eq('id', rule.id)
    } else {
      await supabase.from('house_rules').update({ votes_approve: votesApprove, votes_reject: votesReject }).eq('id', rule.id)
    }
    load()
  }

  const approvedRules = rules.filter(r => r.status === 'approved')
  const pendingRules = rules.filter(r => r.status === 'pending')
  const threshold = members.length > 0 ? Math.ceil(members.length * 0.75) : 1

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} style={{ background: c.accent, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600 }}>
          + Propose rule
        </button>
      </div>

      {showAdd && (
        <div style={card} className="space-y-3">
          <label className="text-sm font-semibold block" style={{ color: c.text }}>New rule</label>
          <textarea value={newRule} onChange={e => setNewRule(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'none' }} placeholder="e.g. No dishes in the sink overnight." />
          <div className="flex gap-2">
            <button onClick={proposeRule} disabled={loading || !newRule.trim()} style={{ flex: 1, background: c.accent, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: 600, opacity: loading || !newRule.trim() ? 0.5 : 1 }}>Submit</button>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: c.surfaceHover, color: c.textMuted, border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '9px', fontSize: '13px' }}>Cancel</button>
          </div>
        </div>
      )}

      {approvedRules.length === 0 && pendingRules.length === 0 && !showAdd && (
        <div className="text-center py-12 text-sm" style={{ color: c.textDim }}>No rules yet. Propose one!</div>
      )}

      {approvedRules.length > 0 && (
        <div className="space-y-2">
          {approvedRules.map(rule => {
            const myRemoveVote = rule.votes_reject.includes(user?.id ?? '')
            return (
              <div key={rule.id} style={card} className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: c.accent }} />
                <div className="flex-1">
                  <p className="text-sm" style={{ color: c.text }}>{rule.text}</p>
                  <p className="text-xs mt-1.5" style={{ color: c.textDim }}>Remove: {rule.votes_reject.length}/{members.length} votes needed</p>
                </div>
                <button onClick={() => removeVote(rule)} style={{ background: myRemoveVote ? c.dangerBg : c.surfaceHover, color: myRemoveVote ? c.danger : c.textMuted, border: `1px solid ${myRemoveVote ? c.dangerBorder : c.border}`, cursor: 'pointer', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                  {myRemoveVote ? 'Voted' : 'Remove'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {pendingRules.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: c.textDim }}>Pending proposals</p>
          <div className="space-y-2">
            {pendingRules.map(rule => {
              const myApprove = rule.votes_approve.includes(user?.id ?? '')
              const myReject = rule.votes_reject.includes(user?.id ?? '')
              return (
                <div key={rule.id} style={{ ...card, border: `1px solid ${c.borderStrong}`, background: c.surfaceHover }}>
                  <p className="text-sm mb-3" style={{ color: c.text }}>{rule.text}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: c.textMuted }}>{rule.votes_approve.length}/{threshold} approvals needed</span>
                    <div className="flex gap-2">
                      <button onClick={() => vote(rule, true)} style={{ background: myApprove ? c.accentBg : c.surfaceHover, color: myApprove ? c.accentText : c.textMuted, border: `1px solid ${myApprove ? c.accent : c.border}`, cursor: 'pointer', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                        Approve ({rule.votes_approve.length})
                      </button>
                      <button onClick={() => vote(rule, false)} style={{ background: myReject ? c.dangerBg : c.surfaceHover, color: myReject ? c.danger : c.textMuted, border: `1px solid ${myReject ? c.dangerBorder : c.border}`, cursor: 'pointer', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                        Reject ({rule.votes_reject.length})
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
