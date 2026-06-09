import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHouse } from '../context/HouseContext'
import { useAuth } from '../context/AuthContext'
import { type Chore } from '../lib/types'

const MEMBER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#F97316']
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function getMonday(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
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

function isThisWeek(d: Date, monday: Date) {
  const mon = isoDate(monday)
  const sun = isoDate(addDays(monday, 6))
  const ds = isoDate(d)
  return ds >= mon && ds <= sun
}

export default function ChoresPage() {
  const { house, members } = useHouse()
  const { user } = useAuth()
  const [chores, setChores] = useState<Chore[]>([])
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [showAdd, setShowAdd] = useState(false)
  const [choreName, setChoreName] = useState('')
  const [duration, setDuration] = useState(15)
  const [assignedTo, setAssignedTo] = useState('')
  const [loading, setLoading] = useState(false)

  const today = new Date()
  const thisMonday = getMonday(today)
  const nextMonday = addDays(thisMonday, 7)

  const thisWeekStart = isoDate(thisMonday)
  const nextWeekStart = isoDate(nextMonday)

  const memberColor = (userId: string) => {
    const idx = members.findIndex(m => m.user_id === userId)
    return MEMBER_COLORS[idx >= 0 ? idx % MEMBER_COLORS.length : 0]
  }

  const load = async () => {
    if (!house) return
    const { data } = await supabase.from('chores').select('*')
      .eq('house_id', house.id)
      .in('week_start', [thisWeekStart, nextWeekStart])
      .order('created_at')
    setChores((data ?? []) as Chore[])
  }

  useEffect(() => { load() }, [house])
  useEffect(() => {
    if (members.length > 0 && !assignedTo) setAssignedTo(members[0].user_id)
  }, [members])

  const addChore = async () => {
    if (!house || !user || !choreName.trim()) return
    setLoading(true)
    const weekStart = isThisWeek(selectedDay, thisMonday) ? thisWeekStart : nextWeekStart
    await supabase.from('chores').insert({
      house_id: house.id,
      name: choreName.trim(),
      duration_minutes: duration,
      chore_type: 'individual',
      week_start: weekStart,
      assigned_to: assignedTo || null,
      completed: false,
      created_by: user.id,
    })
    setChoreName('')
    setDuration(15)
    setShowAdd(false)
    setLoading(false)
    load()
  }

  const toggleComplete = async (chore: Chore) => {
    const newCompleted = !chore.completed
    setChores(prev => prev.map(c => c.id === chore.id
      ? { ...c, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
      : c
    ))
    await supabase.from('chores').update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    }).eq('id', chore.id)
  }

  const deleteChore = async (id: string) => {
    setChores(prev => prev.filter(c => c.id !== id))
    await supabase.from('chores').delete().eq('id', id)
  }

  const selectedWeekStart = isThisWeek(selectedDay, thisMonday) ? thisWeekStart : nextWeekStart
  const selectedDayChores = chores.filter(c => c.week_start === selectedWeekStart)

  const selectedDayLabel = selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Build chore boxes for a day cell: group by assigned_to, count per person
  function buildDayBoxes(weekStart: string) {
    const weekChores = chores.filter(c => c.week_start === weekStart)
    const byMember: Record<string, { count: number; color: string; initial: string }> = {}
    for (const c of weekChores) {
      const uid = c.assigned_to ?? 'group'
      if (!byMember[uid]) {
        const member = members.find(m => m.user_id === uid)
        byMember[uid] = {
          count: 0,
          color: uid === 'group' ? '#94a3b8' : memberColor(uid),
          initial: member?.display_name?.[0]?.toUpperCase() ?? '?',
        }
      }
      byMember[uid].count++
    }
    return Object.values(byMember)
  }

  function renderWeekGrid(monday: Date, label: string) {
    const wStart = isoDate(monday)
    const boxes = buildDayBoxes(wStart)

    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">{label}</p>
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_LABELS.map((dayLabel, i) => {
            const day = addDays(monday, i)
            const dayNum = day.getDate()
            const isToday = isoDate(day) === isoDate(today)
            const isSelected = isoDate(day) === isoDate(selectedDay)

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className={`rounded-xl border-2 p-1.5 flex flex-col gap-1 transition-all ${
                  isSelected
                    ? 'border-indigo-400 bg-white shadow-sm'
                    : isToday
                    ? 'border-indigo-200 bg-white'
                    : 'border-stone-100 bg-white hover:border-stone-300'
                }`}
              >
                <span className="text-xs font-semibold text-stone-500 text-left pl-0.5">{dayNum}</span>
                <div className="flex flex-col gap-0.5 flex-1">
                  {boxes.length === 0 ? (
                    <div className="flex-1 rounded-lg bg-stone-100 min-h-[60px]" />
                  ) : (
                    boxes.map((box, bi) => (
                      <div
                        key={bi}
                        className="flex-1 rounded-lg min-h-[60px] overflow-hidden relative"
                        style={{ backgroundColor: box.color }}
                      >
                        {box.count > 1 && Array.from({ length: box.count - 1 }).map((_, li) => (
                          <div
                            key={li}
                            className="absolute left-0 right-0 h-0.5 bg-white/70"
                            style={{ top: `${((li + 1) / box.count) * 100}%` }}
                          />
                        ))}
                        <span className="absolute bottom-1 left-0 right-0 text-center text-white text-xs font-bold">{box.initial}</span>
                      </div>
                    ))
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-5 min-w-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 px-0">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-stone-400 tracking-wide">{d}</div>
          ))}
        </div>

        {renderWeekGrid(thisMonday, 'This Week')}
        {renderWeekGrid(nextMonday, 'Next Week')}

        {/* Selected day panel */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-800">{selectedDayLabel}</h3>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add one-time chore
            </button>
          </div>

          {showAdd && (
            <div className="mb-4 p-3 bg-stone-50 rounded-lg space-y-3 border border-stone-200">
              <input
                value={choreName}
                onChange={e => setChoreName(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Chore name"
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={5}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-20 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="min"
                />
                <select
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addChore}
                  disabled={loading || !choreName.trim()}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
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

          {selectedDayChores.length === 0 ? (
            <p className="text-sm text-stone-400 py-3 text-center">No chores this week.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayChores.map(chore => {
                const member = members.find(m => m.user_id === chore.assigned_to)
                const color = chore.assigned_to ? memberColor(chore.assigned_to) : '#94a3b8'
                return (
                  <div key={chore.id} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${chore.completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                        {chore.name}
                      </span>
                      <span className="text-xs text-stone-400 ml-2">
                        {member?.display_name ?? 'Group'} · {chore.duration_minutes}min
                      </span>
                    </div>
                    <button
                      onClick={() => toggleComplete(chore)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${chore.completed ? 'bg-teal-100 text-teal-600 hover:bg-teal-200' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                    >
                      {chore.completed ? 'Done' : 'Mark done'}
                    </button>
                    <button
                      onClick={() => deleteChore(chore.id)}
                      className="text-xs text-stone-300 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-40 flex-shrink-0 space-y-5 pt-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">Members</p>
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={m.user_id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }} />
                <span className="text-sm text-stone-700 truncate">{m.display_name}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">This Week</p>
          <div className="space-y-1.5">
            {members.map((m, i) => {
              const count = chores.filter(c => c.week_start === thisWeekStart && c.assigned_to === m.user_id).length
              const done = chores.filter(c => c.week_start === thisWeekStart && c.assigned_to === m.user_id && c.completed).length
              return (
                <div key={m.user_id}>
                  <div className="flex justify-between text-xs text-stone-500 mb-0.5">
                    <span>{m.display_name}</span>
                    <span>{done}/{count}</span>
                  </div>
                  <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: count > 0 ? `${(done / count) * 100}%` : '0%',
                        backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length]
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
