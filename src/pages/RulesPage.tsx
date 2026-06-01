import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHouse } from '../context/HouseContext'
import { useAuth } from '../context/AuthContext'
import { type HouseRule } from '../lib/types'

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
    await supabase.from('house_rules').insert({
      house_id: house.id,
      text: newRule.trim(),
      proposed_by: user.id,
      status: 'pending',
      votes_approve: [user.id],
      votes_reject: [],
    })
    setNewRule('')
    setShowAdd(false)
    setLoading(false)
    load()
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

    await supabase.from('house_rules').update({
      votes_approve: votesApprove,
      votes_reject: votesReject,
      status,
    }).eq('id', rule.id)
    load()
  }

  const removeRule = async (rule: HouseRule) => {
    if (!user) return
    const uid = user.id
    let votesApprove = rule.votes_approve.filter(v => v !== uid)
    let votesReject = [...rule.votes_reject.filter(v => v !== uid), uid]

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
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-700">House Rules</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          + Propose rule
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <label className="text-sm font-medium text-stone-600 block">New rule</label>
          <textarea
            value={newRule}
            onChange={e => setNewRule(e.target.value)}
            rows={2}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            placeholder="e.g. No dishes in the sink overnight."
          />
          <div className="flex gap-2">
            <button
              onClick={proposeRule}
              disabled={loading || !newRule.trim()}
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Submit
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 border border-stone-200 text-stone-600 text-sm py-2 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {approvedRules.length === 0 && pendingRules.length === 0 && !showAdd && (
        <div className="text-center py-12 text-stone-400 text-sm">No rules yet. Propose one!</div>
      )}

      {approvedRules.length > 0 && (
        <div className="space-y-2">
          {approvedRules.map(rule => {
            const myRemoveVote = rule.votes_reject.includes(user?.id ?? '')
            return (
              <div key={rule.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-start gap-3">
                <span className="text-teal-500 mt-0.5 text-lg">✓</span>
                <div className="flex-1">
                  <p className="text-sm text-stone-700">{rule.text}</p>
                  <p className="text-xs text-stone-400 mt-1">Remove: {rule.votes_reject.length}/{members.length} votes needed</p>
                </div>
                <button
                  onClick={() => removeRule(rule)}
                  className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${myRemoveVote ? 'bg-red-100 text-red-500' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
                >
                  {myRemoveVote ? 'Voted' : 'Remove'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {pendingRules.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Pending proposals</h3>
          <div className="space-y-2">
            {pendingRules.map(rule => {
              const myApprove = rule.votes_approve.includes(user?.id ?? '')
              const myReject = rule.votes_reject.includes(user?.id ?? '')
              return (
                <div key={rule.id} className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <p className="text-sm text-stone-700 mb-2">{rule.text}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400">
                      {rule.votes_approve.length}/{threshold} approvals needed
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => vote(rule, true)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${myApprove ? 'bg-teal-500 text-white' : 'bg-stone-100 text-stone-500 hover:bg-teal-100 hover:text-teal-600'}`}
                      >
                        Approve ({rule.votes_approve.length})
                      </button>
                      <button
                        onClick={() => vote(rule, false)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${myReject ? 'bg-red-400 text-white' : 'bg-stone-100 text-stone-500 hover:bg-red-100 hover:text-red-500'}`}
                      >
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
