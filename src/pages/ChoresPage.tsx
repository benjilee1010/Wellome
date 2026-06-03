import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHouse } from '../context/HouseContext'
import { useAuth } from '../context/AuthContext'
import { type Chore } from '../lib/types'

const CHORE_TYPES = ['individual', 'group', 'recurring'] as const

function getMonday(d: Date) {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function weekLabel(monday: Date) {
  const sunday = addDays(monday, 6)
  return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export default function ChoresPage() {
  const { house, members } = useHouse()
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [chores, setChores] = useState<Chore[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [choreName, setChoreName] = useState('')
  const [duration, setDuration] = useState(30)
  const [choreType, setChoreType] = useState<typeof CHORE_TYPES[number]>('individual')
  const [loading, setLoading] = useState(false)

  const thisMonday = getMonday(new Date())
  const weekMonday = addDays(thisMonday, weekOffset * 7)
  const weekStart = isoDate(weekMonday)

  const load = async () => {
    if (!house) return
    const { data } = await supabase.from('chores').select('*')
      .eq('house_id', house.id)
      .in('week_start', [weekStart, isoDate(addDays(weekMonday, 7))])
      .order('created_at')
    setChores((data ?? []) as Chore[])
  }

  useEffect(() => { load() }, [house, weekStart])

  const addChore = async () => {
    if (!house || !user || !choreName.trim()) return
    setLoading(true)
    const weekChores = chores.filter(c => c.week_start === weekStart)
    const assignedIdx = weekChores.length % members.length
    const assignedTo = choreType === 'group' ? null : members[assignedIdx]?.user_id ?? null

    await supabase.from('chores').insert({
      house_id: house.id,
      name: choreName.trim(),
      duration_minutes: duration,
      chore_type: choreType,
      week_start: weekStart,
      assigned_to: assignedTo,
      completed: false,
      created_by: user.id,
    })
    setChoreName('')
    setDuration(30)
    setChoreType('individual')
    setShowAdd(false)
    setLoading(false)
    load()
  }

  const toggleComplete = async (chore: Chore) => {
    await supabase.from('chores').update({
      completed: !chore.completed,
      completed_at: !chore.completed ? new Date().toISOString() : null,
    }).eq('id', chore.id)
    load()
  }

  const deleteChore = async (id: string) => {
    await supabase.from('chores').delete().eq('id', id)
    load()
  }

  const thisWeekChores = chores.filter(c => c.week_start === weekStart)
  const nextWeekChores = chores.filter(c => c.week_start === isoDate(addDays(weekMonday, 7)))

  const renderChore = (chore: Chore) => {
    const assignee = members.find(m => m.user_id === chore.assigned_to)
    const isMe = chore.assigned_to === user?.id || (!chore.assigned_to && chore.chore_type === 'group')
    return (
      <div key={chore.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${chore.completed ? 'bg-stone-50 border-stone-100' : 'bg-white border-stone-200'}`}>
        <button
          onClick={() => toggleComplete(chore)}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${chore.completed ? 'bg-teal-500 border-teal-500' : 'border-stone-300 hover:border-teal-400'}`}
        >
          {chore.completed && <span className="text-white text-xs font-bold">✔</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${chore.completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
            {chore.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-stone-400">{chore.duration_minutes}min</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${chore.chore_type === 'group' ? 'bg-blue-100 text-blue-500' : chore.chore_type === 'recurring' ? 'bg-purple-100 text-purple-500' : 'bg-stone-100 text-stone-500'}`}>
              {chore.chore_type}
            </span>
            {chore.chore_type !== 'group' && (
              <span className={`text-xs font-medium ${isMe ? 'text-teal-600' : 'text-stone-400'}`}>
                {isMe ? 'you' : assignee?.display_name ?? 'unassigned'}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => deleteChore(chore.id)} className="text-xs text-stone-300 hover:text-red-400 transition-colors">Delete</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)} className="px-2 py-1 hover:bg-stone-100 rounded-lg text-stone-500 text-sm font-medium">Prev</button>
          <span className="font-semibold text-stone-700 text-sm">{weekLabel(weekMonday)}</span>
          <button onClick={() => setWeekOffset(o => o + 1)} className="px-2 py-1 hover:bg-stone-100 rounded-lg text-stone-500 text-sm font-medium">Next</button>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add chore
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <h3 className="font-semibold text-stone-700 text-sm">New chore</h3>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Name</label>
            <input
              value={choreName}
              onChange={e => setChoreName(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="e.g. Vacuum living room"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-stone-500 mb-1 block">Duration (min)</label>
              <input
                type="number"
                min={5}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-stone-500 mb-1 block">Type</label>
              <select
                value={choreType}
                onChange={e => setChoreType(e.target.value as typeof CHORE_TYPES[number])}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {CHORE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addChore}
              disabled={loading || !choreName.trim()}
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Add
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

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">This week</h3>
        {thisWeekChores.length === 0
          ? <p className="text-sm text-stone-400 py-4 text-center">No chores yet.</p>
          : <div className="space-y-2">{thisWeekChores.map(renderChore)}</div>}
      </div>

      {nextWeekChores.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Next week</h3>
          <div className="space-y-2">{nextWeekChores.map(renderChore)}</div>
        </div>
      )}
    </div>
  )
}
