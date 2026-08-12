import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHouse } from '../context/HouseContext'
import { useAuth } from '../context/AuthContext'
import { type Bill, type BillPayment } from '../lib/types'
import { c, card, inputStyle } from '../lib/theme'

const DEFAULT_BILL_TYPES = ['Internet', 'Electricity', 'Water']

function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const btn = (active: boolean) => ({ background: active ? c.accent : c.accentBg, color: active ? '#fff' : c.accentText, border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600 })
const ghostBtn = { background: c.surfaceHover, color: c.textMuted, border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }

export default function BillsPage() {
  const { house, members } = useHouse()
  const { user } = useAuth()
  const [month, setMonth] = useState(currentMonth())
  const [bills, setBills] = useState<Bill[]>([])
  const [payments, setPayments] = useState<BillPayment[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [billName, setBillName] = useState(DEFAULT_BILL_TYPES[0])
  const [customName, setCustomName] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!house) return
    const { data: b } = await supabase.from('bills').select('*').eq('house_id', house.id).eq('month', month)
    const billIds = (b ?? []).map(x => x.id)
    const { data: p } = billIds.length ? await supabase.from('bill_payments').select('*').in('bill_id', billIds) : { data: [] }
    setBills(b ?? [])
    setPayments(p ?? [])
  }

  useEffect(() => { load() }, [house, month])

  const addBill = async () => {
    if (!house || !user) return
    setLoading(true)
    const name = billName === '__custom' ? customName : billName
    const total = parseFloat(amount)
    const { data: bill } = await supabase.from('bills').insert({ house_id: house.id, name, month, total_amount: total, created_by: user.id }).select().single()
    if (bill) {
      const share = total / members.length
      await supabase.from('bill_payments').insert(members.map(m => ({ bill_id: bill.id, user_id: m.user_id, amount: share, paid: false })))
    }
    setShowAdd(false); setBillName(DEFAULT_BILL_TYPES[0]); setCustomName(''); setAmount(''); setLoading(false); load()
  }

  const isOwner = user?.id === house?.created_by

  const togglePaid = async (payment: BillPayment) => {
    await supabase.from('bill_payments').update({ paid: !payment.paid, paid_at: !payment.paid ? new Date().toISOString() : null }).eq('id', payment.id)
    load()
  }

  const deleteBill = async (billId: string) => {
    await supabase.from('bill_payments').delete().eq('bill_id', billId)
    await supabase.from('bills').delete().eq('id', billId)
    load()
  }

  const shiftMonth = (dir: number) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + dir)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} style={ghostBtn}>Prev</button>
          <span className="font-semibold text-base" style={{ color: c.text }}>{monthLabel(month)}</span>
          <button onClick={() => shiftMonth(1)} style={ghostBtn}>Next</button>
        </div>
        <button onClick={() => setShowAdd(true)} style={btn(true)}>+ Add bill</button>
      </div>

      {bills.length > 0 && (() => {
        const totalCost = bills.reduce((sum, b) => sum + b.total_amount, 0)
        const perPerson = members.length > 0 ? totalCost / members.length : 0
        const myPaid = payments.filter(p => p.user_id === user?.id && p.paid).reduce((s, p) => s + p.amount, 0)
        const myOwed = payments.filter(p => p.user_id === user?.id && !p.paid).reduce((s, p) => s + p.amount, 0)
        return (
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex gap-4 text-center">
            <div className="flex-1">
              <p className="text-xs text-teal-500 font-medium mb-0.5">Total bills</p>
              <p className="text-lg font-bold text-teal-700">${totalCost.toFixed(2)}</p>
            </div>
            <div className="w-px bg-teal-100" />
            <div className="flex-1">
              <p className="text-xs text-teal-500 font-medium mb-0.5">Per person</p>
              <p className="text-lg font-bold text-teal-700">${perPerson.toFixed(2)}</p>
            </div>
            <div className="w-px bg-teal-100" />
            <div className="flex-1">
              <p className="text-xs text-teal-500 font-medium mb-0.5">You owe</p>
              <p className={`text-lg font-bold ${myOwed > 0 ? 'text-red-500' : 'text-teal-700'}`}>${myOwed.toFixed(2)}</p>
            </div>
            <div className="w-px bg-teal-100" />
            <div className="flex-1">
              <p className="text-xs text-teal-500 font-medium mb-0.5">You paid</p>
              <p className="text-lg font-bold text-teal-700">${myPaid.toFixed(2)}</p>
            </div>
          </div>
        )
      })()}

      {showAdd && (
        <div style={card} className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: c.text }}>New bill</p>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: c.textMuted }}>Type</label>
            <select value={billName} onChange={e => setBillName(e.target.value)} style={inputStyle}>
              {DEFAULT_BILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="__custom">Custom…</option>
            </select>
          </div>
          {billName === '__custom' && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: c.textMuted }}>Custom name</label>
              <input value={customName} onChange={e => setCustomName(e.target.value)} style={inputStyle} placeholder="e.g. Gas" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: c.textMuted }}>Total amount ($)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} placeholder="0.00" />
          </div>
          <div className="flex gap-2">
            <button onClick={addBill} disabled={loading || !amount} style={{ ...btn(true), flex: 1, opacity: loading || !amount ? 0.5 : 1 }}>Add</button>
            <button onClick={() => setShowAdd(false)} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
          </div>
        </div>
      )}

      {bills.length === 0 && !showAdd && (
        <div className="text-center py-12 text-sm" style={{ color: c.textDim }}>No bills for this month yet.</div>
      )}

      {bills.map(bill => {
        const billPayments = payments.filter(p => p.bill_id === bill.id)
        const paidCount = billPayments.filter(p => p.paid).length
        return (
          <div key={bill.id} style={card}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-base" style={{ color: c.text }}>{bill.name}</h3>
                <p className="text-sm mt-0.5" style={{ color: c.textMuted }}>${bill.total_amount.toFixed(2)} total · {paidCount}/{billPayments.length} paid</p>
              </div>
              <button onClick={() => deleteBill(bill.id)} className="text-xs" style={{ color: c.textDim, background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
            </div>
            <div className="space-y-2.5">
              {billPayments.map(pay => {
                const member = members.find(m => m.user_id === pay.user_id)
                const isMe = pay.user_id === user?.id
                return (
                  <div key={pay.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: pay.paid ? c.accentBg : c.surfaceHover, color: pay.paid ? c.accentText : c.textMuted }}>
                        {member?.display_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm" style={{ color: isMe ? c.text : c.textMuted, fontWeight: isMe ? 600 : 400 }}>
                        {member?.display_name ?? 'Unknown'}{isMe ? ' (you)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: c.textMuted }}>${pay.amount.toFixed(2)}</span>
                      {(isMe || isOwner) ? (
                        <button onClick={() => togglePaid(pay)} className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: pay.paid ? c.accentBg : c.surfaceHover, color: pay.paid ? c.accentText : c.textMuted, border: `1px solid ${pay.paid ? c.accent : c.border}`, cursor: 'pointer' }}>
                          {pay.paid ? 'Mark unpaid' : 'Mark paid'}
                          {isOwner && !isMe && <span style={{ marginLeft: '4px', opacity: 0.6, fontSize: '10px' }}>✎</span>}
                        </button>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: pay.paid ? c.accentBg : c.surfaceHover, color: pay.paid ? c.accentText : c.textDim, border: `1px solid ${pay.paid ? c.accent : c.border}` }}>
                          {pay.paid ? 'Paid' : 'Pending'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
