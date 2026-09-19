'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, CalendarDays, Check, CalendarClock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AGENDA_END, AGENDA_START, type AgendaItem } from '@/lib/agenda'

export interface AgendaInterview {
  date: string
  time: string
  label: string
  status: string
  candidateId: string
  candidateName: string
  roleTitle: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOT_MIN = 30
const SLOT_PX = 30

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const DAY_START = toMin(AGENDA_START)
const DAY_END = toMin(AGENDA_END)
const SLOTS = Array.from({ length: (DAY_END - DAY_START) / SLOT_MIN }, (_, i) => DAY_START + i * SLOT_MIN)
const TIME_OPTIONS = Array.from({ length: (DAY_END - DAY_START) / SLOT_MIN + 1 }, (_, i) => toHHMM(DAY_START + i * SLOT_MIN))

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function weekdayIndex(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}
function fmtDay(date: string, long = false) {
  const [y, m, d] = date.split('-').map(Number)
  const wd = WEEKDAYS[weekdayIndex(date)]
  return long ? `${wd}, ${d} ${MONTHS[m - 1]} ${y}` : `${wd}, ${d} ${MONTHS[m - 1].slice(0, 3)}`
}
function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return ymd(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())
}

type FormState = {
  id: string | null
  date: string
  start: string
  end: string
  title: string
  notes: string
  done: boolean
}

export function AgendaTab({ today, interviews }: { today: string; interviews: AgendaInterview[] }) {
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [month, setMonth] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/agenda')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((data: AgendaItem[]) => { if (!cancelled) setItems(data) })
      .catch(() => { if (!cancelled) setError('Could not load your agenda.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const events = items.filter(i => i.kind === 'event')
  const tasks = items.filter(i => i.kind === 'task')
  const openTasks = tasks
    .filter(t => !t.done)
    .sort((a, b) => (a.item_date ?? '9999').localeCompare(b.item_date ?? '9999') || a.created_at.localeCompare(b.created_at))
  const doneTasks = tasks.filter(t => t.done)

  const busyDays = useMemo(() => {
    const set = new Set<string>()
    for (const it of items) if (it.item_date && (it.kind === 'event' || !it.done)) set.add(it.item_date)
    for (const i of interviews) set.add(i.date)
    return set
  }, [items, interviews])

  async function request(url: string, init: RequestInit) {
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
    return data
  }

  async function patch(item: AgendaItem, changes: Partial<AgendaItem>) {
    setError('')
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, ...changes } : i)))
    try {
      const updated: AgendaItem = await request(`/api/agenda/${item.id}`, { method: 'PATCH', body: JSON.stringify(changes) })
      setItems(prev => prev.map(i => (i.id === item.id ? updated : i)))
    } catch (err) {
      setItems(prev => prev.map(i => (i.id === item.id ? item : i)))
      setError(err instanceof Error ? err.message : 'Could not update.')
    }
  }

  async function remove(item: AgendaItem) {
    setError('')
    const snapshot = items
    setItems(prev => prev.filter(i => i.id !== item.id))
    try {
      await request(`/api/agenda/${item.id}`, { method: 'DELETE' })
    } catch (err) {
      setItems(snapshot)
      setError(err instanceof Error ? err.message : 'Could not delete.')
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskTitle.trim()) return
    setError('')
    try {
      const created: AgendaItem = await request('/api/agenda', {
        method: 'POST',
        body: JSON.stringify({ kind: 'task', title: taskTitle, item_date: taskDue || null }),
      })
      setItems(prev => [...prev, created])
      setTaskTitle('')
      setTaskDue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the task.')
    }
  }

  async function saveForm() {
    if (!form) return
    setSaving(true)
    setError('')
    const body = { kind: 'event', item_date: form.date, start_time: form.start, end_time: form.end, title: form.title, notes: form.notes, done: form.done }
    try {
      const saved: AgendaItem = form.id
        ? await request(`/api/agenda/${form.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await request('/api/agenda', { method: 'POST', body: JSON.stringify(body) })
      setItems(prev => (form.id ? prev.map(i => (i.id === saved.id ? saved : i)) : [...prev, saved]))
      setForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  function openNew(date: string, startMin: number) {
    setForm({ id: null, date, start: toHHMM(startMin), end: toHHMM(Math.min(startMin + 60, DAY_END)), title: '', notes: '', done: false })
  }
  function openEdit(e: AgendaItem) {
    setForm({ id: e.id, date: e.item_date!, start: e.start_time!.slice(0, 5), end: e.end_time!.slice(0, 5), title: e.title, notes: e.notes ?? '', done: e.done })
  }
  function selectDay(date: string | null) {
    setSelected(date)
    setForm(null)
    if (date) setMonth({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) - 1 })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
      <div className="space-y-5">
        <MiniCalendar
          month={month}
          onMonth={setMonth}
          today={today}
          selected={selected}
          busyDays={busyDays}
          onSelect={d => selectDay(d === selected ? null : d)}
        />

        <section className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">To-do ({openTasks.length})</h2>
          <form onSubmit={addTask} className="space-y-2 mb-3">
            <input
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder="New task, e.g. Call back Ana about offer"
              aria-label="New task"
              className="glass-input w-full px-3 py-2 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={taskDue}
                onChange={e => setTaskDue(e.target.value)}
                aria-label="Due date (optional)"
                title="Due date (optional)"
                className="glass-input flex-1 min-w-0 px-2 py-1.5 rounded-lg text-sm"
              />
              <button
                type="submit"
                disabled={!taskTitle.trim()}
                className="inline-flex items-center gap-1 bg-[#2AA3FF] hover:bg-[#1a8fe0] disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
              >
                <Plus size={14} /> Add task
              </button>
            </div>
          </form>

          {loading ? (
            <p className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Loading...</p>
          ) : openTasks.length === 0 ? (
            <p className="text-xs text-gray-400">Nothing to do. Add a task above.</p>
          ) : (
            <ul className="space-y-1">
              {openTasks.map(t => <TaskRow key={t.id} task={t} today={today} onToggle={() => patch(t, { done: true })} onDelete={() => remove(t)} onOpenDay={selectDay} />)}
            </ul>
          )}

          {doneTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button type="button" onClick={() => setShowDone(v => !v)} className="text-xs text-gray-500 hover:text-gray-700">
                {showDone ? 'Hide' : 'Show'} completed ({doneTasks.length})
              </button>
              {showDone && (
                <ul className="space-y-1 mt-2">
                  {doneTasks.map(t => <TaskRow key={t.id} task={t} today={today} onToggle={() => patch(t, { done: false })} onDelete={() => remove(t)} onOpenDay={selectDay} />)}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {selected ? (
          <DayView
            date={selected}
            today={today}
            events={events.filter(e => e.item_date === selected)}
            dueTasks={tasks.filter(t => t.item_date === selected)}
            interviews={interviews.filter(i => i.date === selected)}
            form={form}
            saving={saving}
            onForm={setForm}
            onNew={startMin => openNew(selected, startMin)}
            onEdit={openEdit}
            onSave={saveForm}
            onDelete={e => { remove(e); setForm(null) }}
            onToggleEvent={e => patch(e, { done: !e.done })}
            onToggleTask={t => patch(t, { done: !t.done })}
            onBack={() => selectDay(null)}
            onShift={n => selectDay(addDays(selected, n))}
          />
        ) : (
          <UpcomingSummary
            today={today}
            loading={loading}
            events={events}
            tasks={tasks}
            interviews={interviews}
            onOpenDay={selectDay}
            onToggleTask={t => patch(t, { done: !t.done })}
          />
        )}
      </div>
    </div>
  )
}

function MiniCalendar({
  month, onMonth, today, selected, busyDays, onSelect,
}: {
  month: { y: number; m: number }
  onMonth: (m: { y: number; m: number }) => void
  today: string
  selected: string | null
  busyDays: Set<string>
  onSelect: (date: string) => void
}) {
  const first = ymd(month.y, month.m, 1)
  const lead = weekdayIndex(first)
  const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const shift = (n: number) => {
    const d = new Date(Date.UTC(month.y, month.m + n, 1))
    onMonth({ y: d.getUTCFullYear(), m: d.getUTCMonth() })
  }

  return (
    <section className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="p-1 rounded-md text-gray-500 hover:bg-gray-100"><ChevronLeft size={16} /></button>
        <span className="text-sm font-semibold text-gray-900">{MONTHS[month.m]} {month.y}</span>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className="p-1 rounded-md text-gray-500 hover:bg-gray-100"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map(w => <span key={w} className="text-[10.5px] font-medium text-gray-400 py-1">{w.slice(0, 2)}</span>)}
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />
          const date = ymd(month.y, month.m, d)
          const isSel = date === selected
          const isToday = date === today
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-label={fmtDay(date, true)}
              aria-pressed={isSel}
              className={cn(
                'relative h-9 rounded-lg text-sm tabular-nums transition-colors',
                isSel ? 'bg-[#2AA3FF] text-white font-semibold' : 'text-gray-700 hover:bg-blue-50',
                isToday && !isSel && 'ring-1 ring-[#2AA3FF] font-semibold text-[#2AA3FF]',
              )}
            >
              {d}
              {busyDays.has(date) && (
                <span className={cn('absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full', isSel ? 'bg-white' : 'bg-[#2AA3FF]')} />
              )}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-3 text-xs">
        <button type="button" onClick={() => onSelect(today)} className="text-[#2AA3FF] hover:underline">Today</button>
        {selected && <button type="button" onClick={() => onSelect(selected)} className="text-gray-500 hover:text-gray-700">Show upcoming</button>}
      </div>
    </section>
  )
}

function dueLabel(date: string | null, today: string) {
  if (!date) return null
  if (date < today) return { text: `Overdue · ${fmtDay(date)}`, cls: 'text-red-600' }
  if (date === today) return { text: 'Today', cls: 'text-amber-700' }
  if (date === addDays(today, 1)) return { text: 'Tomorrow', cls: 'text-gray-500' }
  return { text: fmtDay(date), cls: 'text-gray-500' }
}

function TaskRow({
  task, today, onToggle, onDelete, onOpenDay,
}: {
  task: AgendaItem
  today: string
  onToggle: () => void
  onDelete: () => void
  onOpenDay: (d: string) => void
}) {
  const due = task.done ? null : dueLabel(task.item_date, today)
  return (
    <li className="group flex items-start gap-2 py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
        className={cn(
          'mt-0.5 w-4 h-4 flex-none rounded border flex items-center justify-center transition-colors',
          task.done ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 hover:border-green-600',
        )}
      >
        {task.done && <Check size={11} strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm break-words', task.done ? 'line-through text-gray-400' : 'text-gray-800')}>{task.title}</p>
        {due && task.item_date && (
          <button type="button" onClick={() => onOpenDay(task.item_date!)} className={cn('text-[11px] hover:underline', due.cls)}>{due.text}</button>
        )}
      </div>
      <button type="button" onClick={onDelete} aria-label="Delete task" className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100">
        <Trash2 size={13} />
      </button>
    </li>
  )
}

// Side-by-side lanes only within groups of blocks that actually overlap.
function layoutLanes<T extends { start: number; end: number }>(blocks: T[]) {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end)
  const placed: (T & { lane: number; lanes: number })[] = []
  let cluster: (T & { lane: number; lanes: number })[] = []
  let laneEnds: number[] = []
  let clusterEnd = -1
  const flush = () => { for (const b of cluster) b.lanes = laneEnds.length; placed.push(...cluster); cluster = []; laneEnds = [] }
  for (const b of sorted) {
    if (b.start >= clusterEnd) flush()
    let lane = laneEnds.findIndex(end => end <= b.start)
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(b.end) } else laneEnds[lane] = b.end
    cluster.push({ ...b, lane, lanes: 1 })
    clusterEnd = Math.max(clusterEnd, b.end)
  }
  flush()
  return placed
}

function DayView({
  date, today, events, dueTasks, interviews, form, saving, onForm, onNew, onEdit, onSave, onDelete, onToggleEvent, onToggleTask, onBack, onShift,
}: {
  date: string
  today: string
  events: AgendaItem[]
  dueTasks: AgendaItem[]
  interviews: AgendaInterview[]
  form: FormState | null
  saving: boolean
  onForm: (f: FormState | null) => void
  onNew: (startMin: number) => void
  onEdit: (e: AgendaItem) => void
  onSave: () => void
  onDelete: (e: AgendaItem) => void
  onToggleEvent: (e: AgendaItem) => void
  onToggleTask: (t: AgendaItem) => void
  onBack: () => void
  onShift: (n: number) => void
}) {
  const inHours = interviews.filter(i => toMin(i.time) >= DAY_START && toMin(i.time) < DAY_END)
  const outside = interviews.filter(i => !inHours.includes(i))
  const blocks = [
    ...events.map(e => ({ type: 'event' as const, start: toMin(e.start_time!), end: toMin(e.end_time!), event: e })),
    ...inHours.map(i => ({ type: 'interview' as const, start: toMin(i.time), end: Math.min(toMin(i.time) + 60, DAY_END), interview: i })),
  ]
  const placed = layoutLanes(blocks)
  const editing = form ? events.find(e => e.id === form.id) ?? null : null

  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onShift(-1)} aria-label="Previous day" className="p-1 rounded-md text-gray-500 hover:bg-gray-100"><ChevronLeft size={16} /></button>
          <h2 className="text-base font-semibold text-gray-900">
            {fmtDay(date, true)}
            {date === today && <span className="ml-2 text-xs font-medium text-[#2AA3FF]">Today</span>}
          </h2>
          <button type="button" onClick={() => onShift(1)} aria-label="Next day" className="p-1 rounded-md text-gray-500 hover:bg-gray-100"><ChevronRight size={16} /></button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNew(DAY_START + 60)}
            className="inline-flex items-center gap-1.5 bg-[#2AA3FF] hover:bg-[#1a8fe0] text-white text-sm font-medium px-3 py-1.5 rounded-lg"
          >
            <Plus size={14} /> Add to agenda
          </button>
          <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5">Show upcoming</button>
        </div>
      </div>

      {form && (
        <div className="mb-4 bg-white border border-blue-100 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
            <label className="text-xs font-medium text-gray-600">
              What
              <input
                autoFocus
                value={form.title}
                onChange={e => onForm({ ...form, title: e.target.value })}
                placeholder="e.g. Screening call with Ion Pop"
                className="glass-input mt-1 w-full px-3 py-2 rounded-lg text-sm font-normal"
              />
            </label>
            <label className="text-xs font-medium text-gray-600">
              From
              <select
                value={form.start}
                onChange={e => {
                  const start = e.target.value
                  onForm({ ...form, start, end: form.end > start ? form.end : toHHMM(Math.min(toMin(start) + 60, DAY_END)) })
                }} className="glass-input mt-1 block px-2 py-2 rounded-lg text-sm font-normal">
                {TIME_OPTIONS.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              To
              <select value={form.end} onChange={e => onForm({ ...form, end: e.target.value })} className="glass-input mt-1 block px-2 py-2 rounded-lg text-sm font-normal">
                {TIME_OPTIONS.filter(t => t > form.start).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs font-medium text-gray-600 mt-2">
            Notes
            <textarea
              value={form.notes}
              onChange={e => onForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Details, questions to ask, links..."
              className="glass-input mt-1 w-full px-3 py-2 rounded-lg text-sm font-normal resize-y"
            />
          </label>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              {form.id && (
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={form.done} onChange={e => onForm({ ...form, done: e.target.checked })} /> Completed
                </label>
              )}
              {editing && (
                <button type="button" onClick={() => onDelete(editing)} className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700">
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onForm(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || !form.title.trim()}
                className="inline-flex items-center gap-1.5 bg-[#2AA3FF] hover:bg-[#1a8fe0] disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
              >
                {saving && <Loader2 size={13} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {(dueTasks.length > 0 || outside.length > 0) && (
        <div className="mb-4 space-y-1.5">
          {dueTasks.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggleTask(t)}
              className="w-full flex items-center gap-2 text-left text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 hover:bg-gray-100"
            >
              <span className={cn('w-4 h-4 flex-none rounded border flex items-center justify-center', t.done ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300')}>
                {t.done && <Check size={11} strokeWidth={3} />}
              </span>
              <span className="text-xs text-gray-500">Task due</span>
              <span className={cn(t.done ? 'line-through text-gray-400' : 'text-gray-800')}>{t.title}</span>
            </button>
          ))}
          {outside.map((i, k) => (
            <div key={k} className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-1.5">
              {i.time} · {i.label} · {i.candidateName} — {i.roleTitle} <span className="text-xs">(outside agenda hours)</span>
            </div>
          ))}
        </div>
      )}

      <div className="relative" style={{ height: SLOTS.length * SLOT_PX }}>
        {SLOTS.map((m, idx) => (
          <button
            key={m}
            type="button"
            onClick={() => onNew(m)}
            aria-label={`Add to agenda at ${toHHMM(m)}`}
            className="absolute left-0 right-0 flex items-start group text-left"
            style={{ top: idx * SLOT_PX, height: SLOT_PX }}
          >
            <span className="w-14 flex-none -mt-2 pr-2 text-right text-[11px] text-gray-400 tabular-nums bg-transparent">
              {m % 60 === 0 ? toHHMM(m) : ''}
            </span>
            <span className={cn(
              'flex-1 h-full group-hover:bg-blue-50/70 flex items-center justify-end pr-2',
              m % 60 === 0 ? 'border-t border-gray-200' : 'border-t border-dashed border-gray-100',
            )}>
              <span className="text-[11px] text-[#2AA3FF] opacity-0 group-hover:opacity-100">+ {toHHMM(m)}</span>
            </span>
          </button>
        ))}

        <div className="absolute top-0 bottom-0 left-14 right-10 pointer-events-none">
          {placed.map((b, k) => {
            const style = {
              top: ((b.start - DAY_START) / SLOT_MIN) * SLOT_PX + 1,
              height: Math.max(((b.end - b.start) / SLOT_MIN) * SLOT_PX - 2, 22),
              left: `calc(${(b.lane / b.lanes) * 100}% + 4px)`,
              width: `calc(${100 / b.lanes}% - 8px)`,
            }
            if (b.type === 'interview') {
              const i = b.interview
              return (
                <div key={`i${k}`} style={style} className="absolute pointer-events-auto rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 overflow-hidden">
                  <p className="text-xs font-semibold text-amber-900 truncate flex items-center gap-1"><CalendarClock size={11} /> {i.time} {i.label}</p>
                  <p className="text-[11px] text-amber-800 truncate">
                    <Link href={`/candidates/${i.candidateId}?return=${encodeURIComponent('/recruiter-dashboard')}`} className="hover:underline">{i.candidateName}</Link> · {i.roleTitle}
                  </p>
                </div>
              )
            }
            const e = b.event
            return (
              <div
                key={e.id}
                style={style}
                role="button"
                tabIndex={0}
                onClick={() => onEdit(e)}
                onKeyDown={ev => { if (ev.key === 'Enter') onEdit(e) }}
                className={cn(
                  'absolute pointer-events-auto rounded-lg border px-2 py-1 overflow-hidden cursor-pointer',
                  e.done ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-[#2AA3FF]/40 hover:border-[#2AA3FF]',
                )}
              >
                <div className="flex items-start gap-1.5">
                  <button
                    type="button"
                    onClick={ev => { ev.stopPropagation(); onToggleEvent(e) }}
                    aria-label={e.done ? 'Mark as not done' : 'Mark as done'}
                    className={cn('mt-0.5 w-3.5 h-3.5 flex-none rounded border flex items-center justify-center', e.done ? 'bg-green-600 border-green-600 text-white' : 'border-gray-400 bg-white')}
                  >
                    {e.done && <Check size={9} strokeWidth={3} />}
                  </button>
                  <div className="min-w-0">
                    <p className={cn('text-xs font-semibold truncate', e.done ? 'line-through text-gray-400' : 'text-gray-900')}>
                      {e.start_time!.slice(0, 5)}–{e.end_time!.slice(0, 5)} {e.title}
                    </p>
                    {e.notes && <p className={cn('text-[11px] whitespace-pre-wrap', e.done ? 'text-gray-400' : 'text-gray-600')}>{e.notes}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function UpcomingSummary({
  today, loading, events, tasks, interviews, onOpenDay, onToggleTask,
}: {
  today: string
  loading: boolean
  events: AgendaItem[]
  tasks: AgendaItem[]
  interviews: AgendaInterview[]
  onOpenDay: (d: string) => void
  onToggleTask: (t: AgendaItem) => void
}) {
  const overdue = tasks.filter(t => !t.done && t.item_date && t.item_date < today)
  const byDay = new Map<string, { events: AgendaItem[]; tasks: AgendaItem[]; interviews: AgendaInterview[] }>()
  const bucket = (d: string) => {
    if (!byDay.has(d)) byDay.set(d, { events: [], tasks: [], interviews: [] })
    return byDay.get(d)!
  }
  for (const e of events) if (e.item_date && e.item_date >= today) bucket(e.item_date).events.push(e)
  for (const t of tasks) if (t.item_date && t.item_date >= today && !t.done) bucket(t.item_date).tasks.push(t)
  for (const i of interviews) if (i.date >= today) bucket(i.date).interviews.push(i)
  const days = [...byDay.keys()].sort()

  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={16} className="text-[#2AA3FF]" />
        <h2 className="text-base font-semibold text-gray-900">Upcoming</h2>
        <span className="text-xs text-gray-400">Pick a day in the calendar to plan it hour by hour</span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Loading your agenda...</p>
      ) : days.length === 0 && overdue.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">
          Nothing planned yet. Pick a day in the calendar and click an hour to add something.
        </div>
      ) : (
        <div className="space-y-5">
          {overdue.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-1.5">Overdue tasks</p>
              <ul className="space-y-1">
                {overdue.map(t => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <button type="button" onClick={() => onToggleTask(t)} aria-label="Mark as done" className="w-4 h-4 flex-none rounded border border-gray-300 hover:border-green-600" />
                    <span className="text-gray-800">{t.title}</span>
                    <button type="button" onClick={() => onOpenDay(t.item_date!)} className="text-xs text-red-600 hover:underline">{fmtDay(t.item_date!)}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {days.map(d => {
            const g = byDay.get(d)!
            const entries = [
              ...g.interviews.map(i => ({ time: i.time, key: `i-${i.candidateId}-${i.time}-${i.label}`, node: (
                <span className="flex items-center gap-1.5 text-amber-800"><CalendarClock size={12} /> {i.label} · {i.candidateName} — {i.roleTitle}</span>
              ) })),
              ...g.events.map(e => ({ time: e.start_time!.slice(0, 5), key: e.id, node: (
                <span className={cn(e.done ? 'line-through text-gray-400' : 'text-gray-800')}>
                  {e.title}
                  <span className="text-gray-400"> · until {e.end_time!.slice(0, 5)}</span>
                  {e.notes && <span className="block text-xs text-gray-500 whitespace-pre-wrap">{e.notes}</span>}
                </span>
              ) })),
            ].sort((a, b) => a.time.localeCompare(b.time))
            return (
              <div key={d}>
                <button type="button" onClick={() => onOpenDay(d)} className="text-sm font-semibold text-gray-900 hover:text-[#2AA3FF] mb-1.5">
                  {d === today ? 'Today' : d === addDays(today, 1) ? 'Tomorrow' : fmtDay(d)}
                  <span className="ml-2 text-xs font-normal text-gray-400">{fmtDay(d, true)}</span>
                </button>
                <ul className="space-y-1.5 border-l-2 border-blue-100 pl-3">
                  {entries.map(e => (
                    <li key={e.key} className="flex gap-3 text-sm">
                      <span className="w-11 flex-none text-gray-500 tabular-nums">{e.time}</span>
                      <div className="min-w-0">{e.node}</div>
                    </li>
                  ))}
                  {g.tasks.map(t => (
                    <li key={t.id} className="flex items-center gap-3 text-sm">
                      <span className="w-11 flex-none text-xs text-gray-400">Task</span>
                      <button type="button" onClick={() => onToggleTask(t)} aria-label="Mark as done" className="w-4 h-4 flex-none rounded border border-gray-300 hover:border-green-600" />
                      <span className="text-gray-800">{t.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
