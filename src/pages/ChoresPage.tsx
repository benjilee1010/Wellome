import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHouse } from '../context/HouseContext'
import { useAuth } from '../context/AuthContext'
import { type Chore } from '../lib/types'
import { c, inputStyle } from '../lib/theme'

// ─── helpers ─────────────────────────────────────────────────────────────────
function isoDate(d: Date) { return d.toISOString().split('T')[0] }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function startOfDay(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r }
function getMonday(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return startOfDay(addDays(d, diff))
}
function freqLabel(days: number) {
  if (days === 1) return 'Daily'
  if (days === 2) return 'Every 2 days'
  if (days === 3) return 'Every 3 days'
  if (days === 7) return 'Weekly'
  if (days === 14) return 'Biweekly'
  return `Every ${days} days`
}

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const DEFAULT_COLORS = ['#ef4444','#22c55e','#f97316','#06b6d4','#eab308','#ec4899','#818cf8','#14b8a6']
const FREQ_OPTIONS = [
  { label: 'Daily', val: 1 },
  { label: 'Every 2 days', val: 2 },
  { label: 'Every 3 days', val: 3 },
  { label: 'Weekly', val: 7 },
  { label: 'Biweekly', val: 14 },
]

function loadColors(): Record<string,string> {
  try { return JSON.parse(localStorage.getItem('wellome_member_colors') || '{}') } catch { return {} }
}
function saveColors(cols: Record<string,string>) {
  localStorage.setItem('wellome_member_colors', JSON.stringify(cols))
}

// ─── component ───────────────────────────────────────────────────────────────
export default function ChoresPage() {
  const { house, members } = useHouse()
  const { user } = useAuth()

  const [chores, setChores] = useState<Chore[]>([])
  const [templates, setTemplates] = useState<Chore[]>([])
  const [statsMonth, setStatsMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [memberColors, setMemberColors] = useState<Record<string,string>>(loadColors)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAutoPanel, setShowAutoPanel] = useState(false)
  const colorPickerRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // one-time chore form
  const [choreName, setChoreName] = useState('')
  const [duration, setDuration] = useState(15)
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')

  // auto-assign panel form
  const [newAutoName, setNewAutoName] = useState('')
  const [newAutoFreq, setNewAutoFreq] = useState(1)
  const [newAutoDuration, setNewAutoDuration] = useState(15)
  const [savingAuto, setSavingAuto] = useState(false)

  const today = startOfDay(new Date())
  const week1Start = getMonday(today)
  const week2Start = addDays(week1Start, 7)
  const week1Days = Array.from({ length: 7 }, (_, i) => addDays(week1Start, i))
  const week2Days = Array.from({ length: 7 }, (_, i) => addDays(week2Start, i))
  const allDays = [...week1Days, ...week2Days]

  // ── colors ───────────────────────────────────────────────────────────────
  const getMemberColor = (userId: string) => {
    if (memberColors[userId]) return memberColors[userId]
    const idx = members.findIndex(m => m.user_id === userId)
    return DEFAULT_COLORS[Math.max(0, idx) % DEFAULT_COLORS.length]
  }
  const updateColor = (userId: string, color: string) => {
    const updated = { ...memberColors, [userId]: color }
    setMemberColors(updated)
    saveColors(updated)
  }

  // ── data helpers ─────────────────────────────────────────────────────────
  const fetchChores = async (): Promise<Chore[]> => {
    if (!house) return []
    const { data } = await supabase.from('chores').select('*')
      .eq('house_id', house.id).eq('is_template', false)
      .gte('week_start', isoDate(allDays[0]))
      .lte('week_start', isoDate(allDays[13]))
    return (data ?? []) as Chore[]
  }

  const fetchTemplates = async (): Promise<Chore[]> => {
    if (!house) return []
    const { data } = await supabase.from('chores').select('*')
      .eq('house_id', house.id).eq('is_template', true)
      .order('created_at', { ascending: true })
    return (data ?? []) as Chore[]
  }

  const fetchHistory = async (): Promise<{assigned_to:string|null,template_id:string|null,week_start:string}[]> => {
    if (!house) return []
    const { data } = await supabase.from('chores')
      .select('assigned_to, template_id, week_start')
      .eq('house_id', house.id).eq('is_template', false)
    return data ?? []
  }

  const buildCounts = (history: {assigned_to:string|null}[]): Record<string,number> => {
    const counts: Record<string,number> = {}
    members.forEach(m => { counts[m.user_id] = 0 })
    history.forEach(ch => { if (ch.assigned_to) counts[ch.assigned_to] = (counts[ch.assigned_to] ?? 0) + 1 })
    return counts
  }

  const pickAssignee = (counts: Record<string,number>): string | null => {
    if (!members.length) return null
    return members.reduce((a, b) => (counts[a.user_id] ?? 0) <= (counts[b.user_id] ?? 0) ? a : b).user_id
  }

  // ── load ─────────────────────────────────────────────────────────────────
  const load = async () => {
    if (!house || !members.length) return
    const tmpls = await fetchTemplates()
    setTemplates(tmpls)
    const existing = await fetchChores()
    const history = await fetchHistory()
    const counts = buildCounts(history)
    const toInsert: object[] = []

    for (const tmpl of tmpls) {
      if (!tmpl.frequency_days || tmpl.frequency_days < 1) continue
      if (tmpl.is_active === false) continue // skip paused templates
      const origin = startOfDay(new Date(tmpl.week_start + 'T12:00:00'))
      for (const day of allDays) {
        const diff = Math.round((day.getTime() - origin.getTime()) / 86400000)
        if (diff < 0 || diff % tmpl.frequency_days !== 0) continue
        const dayStr = isoDate(day)
        if (existing.some(inst => inst.template_id === tmpl.id && inst.week_start === dayStr)) continue
        const assignedTo = pickAssignee(counts)
        if (assignedTo) counts[assignedTo] = (counts[assignedTo] ?? 0) + 1
        toInsert.push({
          house_id: house.id, name: tmpl.name,
          duration_minutes: tmpl.duration_minutes, chore_type: tmpl.chore_type,
          week_start: dayStr, frequency_days: 0,
          is_template: false, template_id: tmpl.id,
          assigned_to: assignedTo, completed: false, created_by: tmpl.created_by,
        })
      }
    }

    if (toInsert.length) await supabase.from('chores').insert(toInsert)
    setChores(await fetchChores())
  }

  const loadMonthlyStats = async () => {
    if (!house) return
    const [y, m] = statsMonth.split('-').map(Number)
    const start = `${statsMonth}-01`
    const end = new Date(y, m, 0).toISOString().split('T')[0] // last day of month
    const { data } = await supabase.from('chores').select('assigned_to, completed, completed_at')
      .eq('house_id', house.id).eq('is_template', false)
      .gte('week_start', start).lte('week_start', end)
    const counts: Record<string, { total: number, done: number }> = {}
    members.forEach(mem => { counts[mem.user_id] = { total: 0, done: 0 } })
    ;(data ?? []).forEach(ch => {
      if (!ch.assigned_to) return
      counts[ch.assigned_to] = counts[ch.assigned_to] ?? { total: 0, done: 0 }
      counts[ch.assigned_to].total++
      if (ch.completed) counts[ch.assigned_to].done++
    })
    setMonthlyTotal(Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v])))
  }

  const [monthlyTotal, setMonthlyTotal] = useState<Record<string, { total: number, done: number }>>({})

  useEffect(() => { load() }, [house])
  useEffect(() => { loadMonthlyStats() }, [house, statsMonth, members.length])

  // ── toggle template active ────────────────────────────────────────────────
  const toggleTemplate = async (tmpl: Chore) => {
    const nowActive = !tmpl.is_active
    await supabase.from('chores').update({ is_active: nowActive }).eq('id', tmpl.id)
    if (!nowActive) {
      // Delete future incomplete instances
      await supabase.from('chores').delete()
        .eq('template_id', tmpl.id).eq('completed', false)
        .gte('week_start', isoDate(today))
    }
    await load()
  }

  // ── delete template ───────────────────────────────────────────────────────
  const deleteTemplate = async (tmpl: Chore) => {
    if (!confirm(`Remove "${tmpl.name}" from auto-assign? This will delete all future instances.`)) return
    await supabase.from('chores').delete().eq('template_id', tmpl.id).eq('completed', false).gte('week_start', isoDate(today))
    await supabase.from('chores').delete().eq('id', tmpl.id)
    await load()
  }

  // ── add auto-assign template ──────────────────────────────────────────────
  const addTemplate = async () => {
    if (!house || !user || !newAutoName.trim()) return
    setSavingAuto(true)
    const todayStr = isoDate(today)
    await supabase.from('chores').insert({
      house_id: house.id, name: newAutoName.trim(),
      duration_minutes: newAutoDuration, chore_type: 'recurring',
      week_start: todayStr, frequency_days: newAutoFreq,
      is_template: true, template_id: null,
      assigned_to: null, completed: false, created_by: user.id,
    })
    setNewAutoName(''); setNewAutoFreq(1); setNewAutoDuration(15)
    setSavingAuto(false)
    await load()
  }

  // ── add one-time chore ────────────────────────────────────────────────────
  const addChore = async () => {
    if (!house || !user || !choreName.trim() || !selectedDay) return
    setSaving(true)
    setAddError('')
    const history = await fetchHistory()
    const counts = buildCounts(history)
    const assignedTo = pickAssignee(counts)
    const { error } = await supabase.from('chores').insert({
      house_id: house.id, name: choreName.trim(),
      duration_minutes: duration, chore_type: 'individual',
      week_start: selectedDay, frequency_days: 0,
      is_template: false, template_id: null,
      assigned_to: assignedTo, completed: false, created_by: user.id,
    })
    setSaving(false)
    if (error) { setAddError(error.message); return }
    setChoreName(''); setDuration(15); setShowAddForm(false)
    setChores(await fetchChores())
  }

  // ── mark complete ─────────────────────────────────────────────────────────
  const toggleComplete = async (chore: Chore) => {
    await supabase.from('chores').update({
      completed: !chore.completed,
      completed_at: !chore.completed ? new Date().toISOString() : null,
    }).eq('id', chore.id)
    setChores(await fetchChores())
  }

  // ── delete instance ───────────────────────────────────────────────────────
  const deleteInstance = async (chore: Chore) => {
    await supabase.from('chores').delete().eq('id', chore.id)
    setChores(await fetchChores())
  }

  const selectedDayChores = chores.filter(ch => ch.week_start === selectedDay)
  const btnPrimary: React.CSSProperties = { background: c.accent, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600 }
  const btnGhost: React.CSSProperties = { background: c.surfaceHover, color: c.textMuted, border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }

  const renderWeek = (weekDays: Date[], label: string) => (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.textDim }}>{label}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {weekDays.map(day => {
          const dayStr = isoDate(day)
          const dayChores = chores.filter(ch => ch.week_start === dayStr)
          const isToday = dayStr === isoDate(today)
          const isSelected = dayStr === selectedDay
          const assignedUids = [...new Set(dayChores.map(ch => ch.assigned_to).filter(Boolean))] as string[]
          return (
            <div key={dayStr} onClick={() => setSelectedDay(isSelected ? null : dayStr)} style={{ borderRadius: '12px', border: `1px solid ${isSelected ? c.accent : isToday ? c.accentText : c.border}`, background: isSelected ? c.accentBg : c.surface, cursor: 'pointer', minHeight: '110px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border-color 0.15s, background 0.15s' }}>
              <div style={{ padding: '7px 9px 4px', fontSize: '12px', fontWeight: isToday ? 800 : 500, color: isToday ? c.accentText : c.textMuted, display: 'flex', justifyContent: 'space-between' }}>
                <span>{day.getDate()}</span>
                {day.getDate() === 1 && <span style={{ fontSize: '10px', color: c.textDim }}>{day.toLocaleDateString('en-US', { month: 'short' })}</span>}
              </div>
              {assignedUids.length > 0 && (
                <div style={{ display: 'flex', flex: 1, margin: '0 6px 6px', gap: '3px' }}>
                  {assignedUids.map(uid => {
                    const userChores = dayChores.filter(ch => ch.assigned_to === uid)
                    const allDone = userChores.every(ch => ch.completed)
                    const color = getMemberColor(uid)
                    const member = members.find(m => m.user_id === uid)
                    return (
                      <div key={uid} title={`${member?.display_name}${userChores.length > 1 ? ` (${userChores.length} chores)` : ''}`} style={{ flex: 1, borderRadius: '6px', background: allDone ? c.border : color, opacity: allDone ? 0.5 : 1, minHeight: '36px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px' }}>
                        {userChores.length > 1 && Array.from({ length: userChores.length - 1 }).map((_, li) => (
                          <div
                            key={li}
                            style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.5)', top: `${((li + 1) / userChores.length) * 100}%` }}
                          />
                        ))}
                        {!allDone && <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{member?.display_name?.[0]}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>

      {/* ── Calendar + detail ─────────────────────────────────────────────── */}
      <div style={{ flex: 1 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', flex: 1, marginRight: '12px' }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: c.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>
            ))}
          </div>
          <button onClick={() => setShowAutoPanel(true)} style={{ ...btnGhost, whiteSpace: 'nowrap', border: `1px solid ${c.border}` }}>
            Edit auto-assigned
          </button>
        </div>

        {renderWeek(week1Days, 'This week')}
        {renderWeek(week2Days, 'Next week')}

        {/* Day detail */}
        {selectedDay && (
          <div style={{ marginTop: '4px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: '14px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: c.text }}>
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button onClick={() => setShowAddForm(true)} style={btnPrimary}>+ Add one-time chore</button>
            </div>

            {selectedDayChores.length === 0 && !showAddForm && (
              <p style={{ color: c.textDim, fontSize: '13px', margin: 0 }}>No chores. Add one!</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedDayChores.map(chore => {
                const assignee = members.find(m => m.user_id === chore.assigned_to)
                const isMe = chore.assigned_to === user?.id
                const color = chore.assigned_to ? getMemberColor(chore.assigned_to) : c.textDim
                return (
                  <div key={chore.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: c.surfaceHover, borderRadius: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: chore.completed ? c.textDim : color, flexShrink: 0, opacity: chore.completed ? 0.4 : 1 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: chore.completed ? c.textDim : c.text, textDecoration: chore.completed ? 'line-through' : 'none' }}>{chore.name}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: c.textDim, marginTop: '2px' }}>{assignee?.display_name ?? 'Unassigned'} · {chore.duration_minutes}min · {chore.template_id ? 'auto-assigned' : 'one-time'}</p>
                    </div>
                    {isMe && (
                      <button onClick={() => toggleComplete(chore)} style={{ ...btnGhost, padding: '5px 11px', fontSize: '12px', background: chore.completed ? c.surfaceHover : c.accentBg, color: chore.completed ? c.textMuted : c.accentText }}>
                        {chore.completed ? 'Undo' : 'Done'}
                      </button>
                    )}
                    <button onClick={() => deleteInstance(chore)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textDim, fontSize: '12px' }}>Remove</button>
                  </div>
                )
              })}
            </div>

            {showAddForm && (
              <div style={{ marginTop: '14px', borderTop: `1px solid ${c.border}`, paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: c.textMuted, display: 'block', marginBottom: '4px' }}>Chore name</label>
                  <input value={choreName} onChange={e => setChoreName(e.target.value)} style={inputStyle} placeholder="e.g. Clean bathroom" autoFocus />
                </div>
                <div style={{ width: '110px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: c.textMuted, display: 'block', marginBottom: '4px' }}>Duration (min)</label>
                  <input type="number" min={1} value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ ...inputStyle, textAlign: 'center' }} />
                </div>
                {addError && <p style={{ color: '#f87171', fontSize: '12px', margin: 0 }}>{addError}</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={addChore} disabled={saving || !choreName.trim()} style={{ ...btnPrimary, flex: 1, opacity: saving || !choreName.trim() ? 0.5 : 1 }}>{saving ? 'Adding…' : 'Add'}</button>
                  <button onClick={() => { setShowAddForm(false); setAddError('') }} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <div style={{ width: '170px', flexShrink: 0, paddingTop: '36px' }}>
        <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.textDim }}>Members</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {members.map((m, idx) => {
            const color = memberColors[m.user_id] ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: color, cursor: 'pointer', flexShrink: 0 }} title="Click to change color" onClick={() => colorPickerRefs.current[m.user_id]?.click()} />
                <input type="color" value={color} ref={el => { colorPickerRefs.current[m.user_id] = el }} onChange={e => updateColor(m.user_id, e.target.value)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.display_name}</span>
              </div>
            )
          })}
        </div>

        {/* Monthly chore counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.textDim }}>Monthly count</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button onClick={() => {
              const [y, m] = statsMonth.split('-').map(Number)
              const d = new Date(y, m - 2)
              setStatsMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textDim, fontSize: '12px', padding: '0 2px' }}>‹</button>
            <span style={{ fontSize: '10px', color: c.textMuted, whiteSpace: 'nowrap' }}>
              {new Date(statsMonth + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            </span>
            <button onClick={() => {
              const [y, m] = statsMonth.split('-').map(Number)
              const d = new Date(y, m)
              setStatsMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textDim, fontSize: '12px', padding: '0 2px' }}>›</button>
          </div>
        </div>

        {members.map(m => {
          const stats = monthlyTotal[m.user_id] ?? { total: 0, done: 0 }
          const color = getMemberColor(m.user_id)
          return (
            <div key={m.id} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: c.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{m.display_name}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: c.text }}>{stats.done}<span style={{ fontWeight: 400, color: c.textDim }}>/{stats.total}</span></span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: c.border }}>
                <div style={{ height: '100%', width: stats.total ? `${(stats.done / stats.total) * 100}%` : '0%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Auto-assign panel (modal overlay) ────────────────────────────── */}
      {showAutoPanel && (
        <>
          <div onClick={() => setShowAutoPanel(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, background: c.surface, border: `1px solid ${c.borderStrong}`, borderRadius: '18px', padding: '24px', width: '480px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: c.text }}>Auto-assigned chores</h2>
              <button onClick={() => setShowAutoPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textDim, fontSize: '18px' }}>×</button>
            </div>

            {/* Template list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {templates.length === 0 && (
                <p style={{ color: c.textDim, fontSize: '13px', margin: 0 }}>No auto-assigned chores yet. Add one below.</p>
              )}
              {templates.map(tmpl => (
                <div key={tmpl.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: c.surfaceHover, borderRadius: '10px', opacity: tmpl.is_active === false ? 0.5 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: c.text }}>{tmpl.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: c.textDim }}>{freqLabel(tmpl.frequency_days)} · {tmpl.duration_minutes}min</p>
                  </div>

                  {/* Toggle on/off */}
                  <button
                    onClick={() => toggleTemplate(tmpl)}
                    title={tmpl.is_active === false ? 'Turn on' : 'Pause'}
                    style={{
                      width: '38px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
                      background: tmpl.is_active === false ? c.border : c.accent, transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                      left: tmpl.is_active === false ? '3px' : '19px',
                    }} />
                  </button>

                  <button onClick={() => deleteTemplate(tmpl)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textDim, fontSize: '13px', padding: '0 2px' }}>Delete</button>
                </div>
              ))}
            </div>

            {/* Add new template */}
            <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: '16px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: c.textMuted }}>Add auto-assigned chore</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: c.textMuted, display: 'block', marginBottom: '4px' }}>Chore name</label>
                  <input value={newAutoName} onChange={e => setNewAutoName(e.target.value)} style={inputStyle} placeholder="e.g. Empty dehumidifier" />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: c.textMuted, display: 'block', marginBottom: '6px' }}>Frequency</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {FREQ_OPTIONS.map(opt => (
                        <button key={opt.val} onClick={() => setNewAutoFreq(opt.val)} style={{ padding: '5px 10px', fontSize: '12px', fontWeight: 600, border: `1px solid ${newAutoFreq === opt.val ? c.accent : c.border}`, borderRadius: '8px', cursor: 'pointer', background: newAutoFreq === opt.val ? c.accentBg : c.surfaceHover, color: newAutoFreq === opt.val ? c.accentText : c.textMuted }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ width: '90px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: c.textMuted, display: 'block', marginBottom: '4px' }}>Duration (min)</label>
                    <input type="number" min={1} value={newAutoDuration} onChange={e => setNewAutoDuration(Number(e.target.value))} style={{ ...inputStyle, textAlign: 'center' }} />
                  </div>
                </div>
                <button onClick={addTemplate} disabled={savingAuto || !newAutoName.trim()} style={{ ...btnPrimary, opacity: savingAuto || !newAutoName.trim() ? 0.5 : 1 }}>
                  {savingAuto ? 'Adding…' : 'Add chore'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
