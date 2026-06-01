import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHouse } from '../context/HouseContext'
import { useAuth } from '../context/AuthContext'
import { type Bill, type BillPayment } from '../lib/types'

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
    const { data: p } = billIds.length
      ? await supabase.from('bill_payments').select('*').in('bill_id', billIds)
      : { data: [] }
    setBills(b ?? [])
    setPayments(p ?? [])
  }

  useEffect(() => { load() }, [house, month])

  const addBill = async () => {
    if (!house || !user) return
    setLoading(true)
    const name = billName === '__custom' ? customName : billName
    const total = parseFloat(amount)
    const { data: bill } = await supabase.from('bills')
      .insert({ house_id: house.id, name, month, total_amount: total, created_by: user.id })
      .select().single()
    if (bill) {
      const share = total / members.length
      await supabase.from('bill_payments').insert(
        members.map(m => ({ bill_id: bill.id, user_id: m.user_id, amount: share, paid: false }))
      )
    }
    setShowAdd(false)
    setBillName(DEFAULT_BILL_TYPES[0])
    setCustomName('')
    setAmount('')
    setLoading(false)
    load()
  }

  const togglePaid = async (payment: BillPayment) => {
    if (payment.user_id !== user?.id) return
    await supabase.from('bill_payments').update({
      paid: !payment.paid,
      paid_at: !payment.paid ? new Date().toISOString() : null,
    }).eq('id', payment.id)
    load()
  }

  const deleteBill = async (billId: string) => {
    await supabase.from('bill_payments').delete().eq('bill_id', billId)
    await supabase.from('bills').delete().eq('id', billId)
    load()
  }

  const prevMonth = () => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 hover:bg-stone-100 rounded-lg text-stone-500">←</button>
          <span className="font-semibold text-stone-700">{monthLabel(month)}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-stone-100 rounded-lg text-stone-500">→</button>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add bill
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <h3 className="font-semibold text-stone-700 text-sm">New bill</h3>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Type</label>
            <select
              value={billName}
              onChange={e => setBillName(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {DEFAULT_BILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="__custom">Custom…</option>
            </select>
          </div>
          {billName === '__custom' && (
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Custom name</label>
              <input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="e.g. Gas"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Total amount ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addBill}
              disabled={loading || !amount}
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 border border-stone-200 text-stone-600 text-sm font-medium py-2 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {bills.length === 0 && !showAdd && (
        <div className="text-center py-12 text-stone-400 text-sm">No bills for this month yet.</div>
      )}

      {bills.map(bill => {
        const billPayments = payments.filter(p => p.bill_id === bill.id)
        const paidCount = billPayments.filter(p => p.paid).length
        return (
          <div key={bill.id} className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-stone-800">{bill.name}</h3>
                <p className="text-sm text-stone-500">${bill.total_amount.toFixed(2)} total · {paidCount}/{billPayments.length} paid</p>
              </div>
              <button
                onClick={() => deleteBill(bill.id)}
                className="text-stone-300 hover:text-red-400 text-sm transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {billPayments.map(pay => {
                const member = members.find(m => m.user_id === pay.user_id)
                const isMe = pay.user_id === user?.id
                return (
                  <div key={pay.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${pay.paid ? 'bg-teal-100 text-teal-600' : 'bg-stone-100 text-stone-500'}`}>
                        {member?.display_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className={`text-sm ${isMe ? 'font-medium text-stone-800' : 'text-stone-600'}`}>
                        {member?.display_name ?? 'Unknown'}{isMe ? ' (you)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-500">${pay.amount.toFixed(2)}</span>
                      {isMe ? (
                        <button
                          onClick={() => togglePaid(pay)}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${pay.paid ? 'bg-teal-100 text-teal-600 hover:bg-teal-200' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                        >
                          {pay.paid ? 'Paid' : 'Unpaid'}
                        </button>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pay.paid ? 'bg-teal-100 text-teal-600' : 'bg-stone-100 text-stone-400'}`}>
                          {pay.paid ? 'Paid' : 'Unpaid'}
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
