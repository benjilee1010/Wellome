import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHouse } from '../context/HouseContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { type Bill, type BillPayment } from '../lib/types'
import { cardStyle, inputStyleFor } from '../lib/theme'

const DEFAULT_BILL_TYPES = ['Internet', 'Electricity', 'Water']

function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function BillsPage() {
  const { house, members } = useHouse()
  const { user } = useAuth()
  const { c } = useTheme()
  const card = cardStyle(c)
  const inputStyle = inputStyleFor(c)
  const btn = (active: boolean) => ({ background: active ? c.accent : c.accentBg, color: active ? '#fff' : c.accentText, border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600 })
  const ghostBtn = { background: c.surfaceHover, color: c.textMuted, border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }

  const [month, setMonth] = useState(currentMonth())
  const [bills, setBills] = useState<Bill[]>([])
  const [payments, setPayments] = useState<BillPayment[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [billName, setBillName] = useState(DEFAULT_BILL_TYPES[0])
  const [customName, setCustomName] = useState('')
  const [amount, setAmount] = useState('')
  const [makeRecurring, setMakeRecurring] = useState(false)
  const [loading, setLoading] = useState(false)
  const loadInFlight = useRef(false)

  // Auto-create this month's instance of any recurring bill that doesn't have
  // one yet. Guarded + upserted against a unique (template_id, month)
  // constraint so a concurrent/duplicate run can't create two.
  const generateRecurringBills = async () => {
    if (!house) return
    const { data: tmpls } = await supabase.from('bills').select('*')
      .eq('house_id', house.id).eq('is_template', true)
    const templates = (tmpls ?? []) as Bill[]
    if (!templates.length) return

    const { data: existing } = await supabase.from('bills').select('template_id')
      .eq('house_id', house.id).eq('month', month).eq('is_template', false)
      .not('template_id', 'is', null)
    const covered = new Set((existing ?? []).map(b => b.template_id))
    const toInsert = templates.filter(t => !covered.has(t.id)).map(t => ({
      house_id: house.id, name: t.name, month, total_amount: t.total_amount,
      is_template: false, template_id: t.id, created_by: t.created_by,
    }))
    if (!toInsert.length) return

    const { data: inserted } = await supabase.from('bills')
      .upsert(toInsert, { onConflict: 'template_id,month', ignoreDuplicates: true })
      .select()
    for (const bill of inserted ?? []) {
      await supabase.from('bill_payments').insert(members.map(m => ({
        bill_id: bill.id, user_id: m.user_id, amount: bill.total_amount / members.length, paid: false,
      })))
    }
  }

  const load = async () => {
    if (!house) return
    if (loadInFlight.current) return
    loadInFlight.current = true
    try {
      await generateRecurringBills()
      const { data: b } = await supabase.from('bills').select('*')
        .eq('house_id', house.id).eq('month', month).eq('is_template', false)
      const billIds = (b ?? []).map(x => x.id)
      const { data: p } = billIds.length ? await supabase.from('bill_payments').select('*').in('bill_id', billIds) : { data: [] }
      setBills(b ?? [])
      setPayments(p ?? [])
    } finally {
      loadInFlight.current = false
    }
  }

  useEffect(() => { load() }, [house, month])

  const addBill = async () => {
    if (!house || !user) return
    setLoading(true)
    const name = billName === '__custom' ? customName : billName
    const total = parseFloat(amount)

    let templateId: string | null = null
    if (makeRecurring) {
      const { data: tmpl } = await supabase.from('bills').insert({
        house_id: house.id, name, month, total_amount: total, is_template: true, created_by: user.id,
      }).select().single()
      templateId = tmpl?.id ?? null
    }

    const { data: bill } = await supabase.from('bills').insert({
      house_id: house.id, name, month, total_amount: total, is_template: false, template_id: templateId, created_by: user.id,
    }).select().single()
    if (bill) {
      const share = total / members.length
      await supabase.from('bill_payments').insert(members.map(m => ({ bill_id: bill.id, user_id: m.user_id, amount: share, paid: false })))
    }
    setShowAdd(false); setBillName(DEFAULT_BILL_TYPES[0]); setCustomName(''); setAmount(''); setMakeRecurring(false); setLoading(false); load()
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

  const stopRecurring = async (templateId: string) => {
    if (!confirm("Stop repeating this bill? This month's bill stays, but a new one won't be added next month.")) return
    await supabase.from('bills').delete().eq('id', templateId)
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
          <div className="rounded-xl p-4 flex gap-4 text-center" style={{ background: c.accentBg, border: `1px solid ${c.border}` }}>
            <div className="flex-1">
              <p className="text-xs font-medium mb-0.5" style={{ color: c.accentText }}>Total bills</p>
              <p className="text-lg font-bold" style={{ color: c.text }}>${totalCost.toFixed(2)}</p>
            </div>
            <div className="w-px" style={{ background: c.border }} />
            <div className="flex-1">
              <p className="text-xs font-medium mb-0.5" style={{ color: c.accentText }}>Per person</p>
              <p className="text-lg font-bold" style={{ color: c.text }}>${perPerson.toFixed(2)}</p>
            </div>
            <div className="w-px" style={{ background: c.border }} />
            <div className="flex-1">
              <p className="text-xs font-medium mb-0.5" style={{ color: c.accentText }}>You owe</p>
              <p className="text-lg font-bold" style={{ color: myOwed > 0 ? c.danger : c.text }}>${myOwed.toFixed(2)}</p>
            </div>
            <div className="w-px" style={{ background: c.border }} />
            <div className="flex-1">
              <p className="text-xs font-medium mb-0.5" style={{ color: c.accentText }}>You paid</p>
              <p className="text-lg font-bold" style={{ color: c.text }}>${myPaid.toFixed(2)}</p>
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
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: c.textMuted }}>
            <input type="checkbox" checked={makeRecurring} onChange={e => setMakeRecurring(e.target.checked)} style={{ width: '15px', height: '15px', accentColor: c.accent }} />
            Repeat this bill every month
          </label>
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
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base" style={{ color: c.text }}>{bill.name}</h3>
                  {bill.template_id && (
                    <span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5" style={{ color: c.accentText, background: c.accentBg }}>Recurring</span>
                  )}
                </div>
                <p className="text-sm mt-0.5" style={{ color: c.textMuted }}>${bill.total_amount.toFixed(2)} total · {paidCount}/{billPayments.length} paid</p>
              </div>
              <div className="flex items-center gap-3">
                {bill.template_id && (
                  <button onClick={() => stopRecurring(bill.template_id!)} className="text-xs" style={{ color: c.textDim, background: 'none', border: 'none', cursor: 'pointer' }}>Stop repeating</button>
                )}
                <button onClick={() => deleteBill(bill.id)} className="text-xs" style={{ color: c.textDim, background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
              </div>
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
