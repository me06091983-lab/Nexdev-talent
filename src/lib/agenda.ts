export const AGENDA_SELECT = 'id, kind, title, notes, item_date, start_time, end_time, done, created_at'

export const AGENDA_START = '08:00'
export const AGENDA_END = '21:00'

export interface AgendaItem {
  id: string
  kind: 'task' | 'event'
  title: string
  notes: string | null
  item_date: string | null
  start_time: string | null
  end_time: string | null
  done: boolean
  created_at: string
}

type Parsed = { value: Omit<AgendaItem, 'id' | 'created_at'> } | { error: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:\d{2})?$/

function hhmm(t: unknown) {
  return typeof t === 'string' && TIME_RE.test(t) ? t.slice(0, 5) : null
}

export function parseAgendaInput(body: Record<string, unknown>, isNew: boolean): Parsed {
  const kind = body.kind
  if (kind !== 'task' && kind !== 'event') return { error: 'Invalid item type.' }

  const title = String(body.title ?? '').trim()
  if (!title) return { error: isNew && kind === 'task' ? 'Write what the task is.' : 'Write a title.' }
  if (title.length > 200) return { error: 'Title is too long (max 200 characters).' }

  const notes = body.notes == null ? null : String(body.notes).trim().slice(0, 4000) || null
  const itemDate = body.item_date == null || body.item_date === '' ? null : String(body.item_date)
  if (itemDate && !DATE_RE.test(itemDate)) return { error: 'Invalid date.' }

  let start: string | null = null
  let end: string | null = null
  if (kind === 'event') {
    start = hhmm(body.start_time)
    end = hhmm(body.end_time)
    if (!itemDate || !start || !end) return { error: 'Pick a day and a time interval.' }
    if (end <= start) return { error: 'End time must be after start time.' }
    if (start < AGENDA_START || end > AGENDA_END) return { error: `Agenda slots run from ${AGENDA_START} to ${AGENDA_END}.` }
  }

  return {
    value: { kind, title, notes, item_date: itemDate, start_time: start, end_time: end, done: Boolean(body.done) },
  }
}
