'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusModal } from './StatusModal'
import type { RadarSubmission } from './PipelineRadarClient'
import type { Submission as KanbanSubmission } from './KanbanBoard'
import type { PipelineStatus } from '@/lib/pipeline'

const DAYS_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface InterviewEvent {
  candidateName: string
  roleTitle: string
  interviewLabel: string
  status: string
  accepted: boolean
  datetime: Date
  submission: RadarSubmission
}

function chipClass(status: string, accepted: boolean): string {
  if (status === 'rejected') return 'bg-red-100 text-red-700 border-red-200'
  if (status === 'set' && accepted) return 'bg-green-100 text-green-700 border-green-200'
  if (status === 'set') return 'bg-orange-100 text-orange-700 border-orange-200'
  if (status === 'pending_feedback') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  if (status === 'passed') return 'bg-blue-100 text-blue-700 border-blue-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

export function RadarCalendarView({
  submissions,
  onStatusSaved,
}: {
  submissions: RadarSubmission[]
  onStatusSaved: (id: string, status: PipelineStatus) => void
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<RadarSubmission | null>(null)

  const events = useMemo<InterviewEvent[]>(() => {
    const result: InterviewEvent[] = []
    for (const sub of submissions) {
      const c = sub.candidate
      const name = c ? `${c.first_name} ${c.last_name}` : 'Candidate'
      for (const slot of sub.interviews) {
        if (!slot.enabled || !slot.datetime) continue
        const dt = new Date(slot.datetime)
        if (isNaN(dt.getTime())) continue
        result.push({
          candidateName: name,
          roleTitle: sub.role?.title ?? '—',
          interviewLabel: slot.label,
          status: slot.status,
          accepted: slot.candidate_accepted ?? false,
          datetime: dt,
          submission: sub,
        })
      }
    }
    result.sort((a, b) => a.datetime.getTime() - b.datetime.getTime())
    return result
  }, [submissions])

  const grid = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay()
    const offset = firstDow === 0 ? 6 : firstDow - 1
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function dayEvents(day: number): InterviewEvent[] {
    return events.filter(e =>
      e.datetime.getFullYear() === year &&
      e.datetime.getMonth() === month &&
      e.datetime.getDate() === day,
    )
  }

  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month

  const totalThisMonth = events.filter(
    e => e.datetime.getFullYear() === year && e.datetime.getMonth() === month,
  ).length

  return (
    <>
      <div className="glass rounded-2xl overflow-hidden">
        {/* Navigation — navy header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B1A33]">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <h2 className="text-base font-bold text-white tracking-wide">
              {MONTHS_EN[month]} {year}
            </h2>
            {totalThisMonth > 0 ? (
              <p className="text-[11px] text-[#2AA3FF] mt-0.5 font-medium">
                {totalThisMonth} interview{totalThisMonth !== 1 ? 's' : ''} scheduled
              </p>
            ) : (
              <p className="text-[11px] text-white/30 mt-0.5">No interviews</p>
            )}
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 bg-[#0B1A33]/8 border-b border-slate-200">
          {DAYS_SHORT.map((d, i) => (
            <div
              key={d}
              className={cn(
                'py-2.5 text-center text-[11px] font-bold text-[#0B1A33] uppercase tracking-widest',
                i >= 5 && 'text-[#2AA3FF]',
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {grid.map((day, idx) => {
            const evs = day ? dayEvents(day) : []
            const isToday = isCurrentMonth && day === now.getDate()
            const isLastInRow = (idx + 1) % 7 === 0
            const isLastRow = idx >= grid.length - 7
            const isWeekend = idx % 7 >= 5
            const maxVisible = 3

            return (
              <div
                key={idx}
                className={cn(
                  'min-h-[120px] p-2',
                  !isLastInRow && 'border-r border-slate-200',
                  !isLastRow && 'border-b border-slate-200',
                  !day && 'bg-slate-50/60',
                  day && isWeekend && 'bg-blue-50/30',
                  isToday && 'bg-[#2AA3FF]/5',
                )}
              >
                {day !== null && (
                  <>
                    <div className={cn(
                      'w-7 h-7 flex items-center justify-center text-[13px] rounded-full mb-1.5 font-semibold',
                      isToday
                        ? 'bg-[#2AA3FF] text-white shadow-sm shadow-[#2AA3FF]/40'
                        : isWeekend
                          ? 'text-[#2AA3FF]/70'
                          : 'text-[#0B1A33]/60',
                    )}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {evs.slice(0, maxVisible).map((ev, i) => (
                        <button
                          key={i}
                          onClick={() => setSelected(ev.submission)}
                          title={`${ev.candidateName} · ${ev.roleTitle} · ${ev.interviewLabel} · ${ev.datetime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                          className={cn(
                            'w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded border block leading-tight hover:opacity-75 transition-opacity',
                            chipClass(ev.status, ev.accepted),
                          )}
                        >
                          <span className="font-bold">
                            {ev.datetime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {' '}
                          {ev.candidateName}
                        </button>
                      ))}
                      {evs.length > maxVisible && (
                        <p className="text-[10px] text-[#2AA3FF] pl-1 leading-tight font-medium">
                          +{evs.length - maxVisible} more
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 mt-3 px-1">
        <span className="text-[11px] text-slate-500 font-semibold mr-1 uppercase tracking-wide">Legend:</span>
        {[
          { label: 'Scheduled', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
          { label: 'Confirmed by candidate', cls: 'bg-green-100 text-green-700 border-green-200' },
          { label: 'Pending feedback', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
          { label: 'Passed', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
          { label: 'Rejected', cls: 'bg-red-100 text-red-700 border-red-200' },
        ].map(({ label, cls }) => (
          <span key={label} className={cn('text-[10px] px-2 py-0.5 rounded border font-medium', cls)}>
            {label}
          </span>
        ))}
      </div>

      {selected && (
        <StatusModal
          submission={selected as unknown as KanbanSubmission}
          onClose={() => setSelected(null)}
          onSaved={(id, status) => {
            onStatusSaved(id, status)
            setSelected(null)
          }}
        />
      )}
    </>
  )
}
