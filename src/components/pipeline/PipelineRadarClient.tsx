'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { PIPELINE_STATUSES, STATUS_LABELS, type PipelineStatus } from '@/lib/pipeline'
import { cn } from '@/lib/utils'
import { Calendar, ExternalLink, Trash2, MessageSquare, User, Phone, LayoutGrid, CalendarDays } from 'lucide-react'
import { StatusModal } from './StatusModal'
import type { Submission as KanbanSubmission } from './KanbanBoard'
import { RadarCalendarView } from './RadarCalendarView'

export interface RadarSubmission {
  id: string
  status: string
  ai_score: number | null
  ai_summary: string | null
  rubix_fit?: number | null
  interviews: InterviewSlot[]
  updated_at: string
  role_id: string
  candidate: {
    id: string
    first_name: string
    last_name: string
    phone: string | null
    profile: { name: string } | null
  } | null
  role: {
    id: string
    title: string
    client: { name: string } | null
  } | null
}

interface InterviewSlot {
  label: string
  enabled: boolean
  datetime: string
  status: string
  candidate_accepted?: boolean
}

function interviewColors(status: string, accepted: boolean) {
  if (status === 'rejected') return { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-500' }
  if (status === 'set' && accepted) return { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' }
  if (status === 'set') return { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500' }
  if (status === 'pending_feedback') return { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500' }
  if (status === 'passed') return { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' }
  return { bg: 'bg-gray-100', text: 'text-gray-500', icon: 'text-gray-400' }
}

function formatInterviewDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}

// ─── Score badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score, variant = 'ai' }: { score: number; variant?: 'ai' | 'rubix' }) {
  const cls = variant === 'rubix'
    ? score >= 75
      ? 'border-[#2AA3FF] text-[#2AA3FF] bg-blue-50/60'
      : score >= 55
      ? 'border-amber-400 text-amber-600 bg-amber-50/60'
      : 'border-red-400 text-red-500 bg-red-50/60'
    : score >= 85
    ? 'border-green-400 text-green-600'
    : score >= 60
    ? 'border-yellow-400 text-yellow-600'
    : 'border-red-400 text-red-500'
  return (
    <span
      title={variant === 'rubix' ? `Rubix Matrix: ${score}%` : `AI Score: ${score}%`}
      className={cn('flex-shrink-0 w-8 h-8 rounded-full border-2 text-[10px] font-bold flex items-center justify-center', cls)}
    >
      {score}%
    </span>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

function CandidateCard({
  submission,
  onEdit,
  onDelete,
}: {
  submission: RadarSubmission
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: submission.id })
  const style = transform ? { transform: CSS.Transform.toString(transform) } : undefined
  const c = submission.candidate
  const allInterviews = submission.interviews
    .filter(s => s.enabled)
    .map(s => ({
      label: s.label.replace('Interview', 'Int.').split(' ')[0].slice(0, 10),
      datetime: s.datetime,
      status: s.status,
      accepted: s.candidate_accepted ?? false,
    }))
  const [phoneVisible, setPhoneVisible] = useState(false)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-md group',
        isDragging && 'opacity-20',
      )}
    >
      {/* Row 1: avatar + name + score */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {c ? `${c.first_name[0]}${c.last_name[0]}`.toUpperCase() : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate leading-tight">
            {c ? `${c.first_name} ${c.last_name}` : 'Candidat'}
          </p>
          {c?.profile && (
            <p className="text-[10px] text-gray-400 truncate">{c.profile.name}</p>
          )}
        </div>
        {submission.rubix_fit != null
          ? <ScoreBadge score={Math.round(submission.rubix_fit)} variant="rubix" />
          : submission.ai_score != null
          ? <ScoreBadge score={Math.round(submission.ai_score)} />
          : null
        }
      </div>

      {/* Phone popup — inline, sub nume */}
      {phoneVisible && c?.phone && (
        <div
          className="mt-1.5 flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1"
          onPointerDown={e => e.stopPropagation()}
        >
          <Phone size={10} className="text-[#2AA3FF] flex-shrink-0" />
          <a
            href={`tel:${c.phone}`}
            className="text-[11px] font-medium text-[#2AA3FF] hover:underline"
            onClick={e => e.stopPropagation()}
          >
            {c.phone}
          </a>
        </div>
      )}

      {/* Row 2: rol */}
      {submission.role && (
        <div className="mt-2 px-0.5">
          <p className="text-[11px] font-semibold text-gray-700 truncate leading-tight">
            {submission.role.title}
          </p>
          {submission.role.client && (
            <p className="text-[10px] text-gray-400 truncate">{submission.role.client.name}</p>
          )}
        </div>
      )}

      {/* Row 3: interviews */}
      {allInterviews.length > 0 && (
        <div className="mt-2 space-y-1">
          {allInterviews.map((int, idx) => {
            const col = interviewColors(int.status, int.accepted)
            return (
              <div key={idx} className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1', col.bg)}>
                <Calendar size={10} className={cn('flex-shrink-0', col.icon)} />
                <p className={cn('text-[10px] font-medium truncate', col.text)}>
                  {int.label}{int.datetime ? ` · ${formatInterviewDate(int.datetime)}` : ''}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Hover actions */}
      <div className="mt-1.5 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="p-1 text-gray-300 hover:text-[#2AA3FF] transition-colors rounded"
          title="Status / Feedback"
        >
          <MessageSquare size={12} />
        </button>
        {c && (
          <Link
            href={`/candidates/${c.id}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            className="p-1 text-gray-300 hover:text-[#2AA3FF] transition-colors rounded"
            title="Profil candidat"
          >
            <User size={12} />
          </Link>
        )}
        {c?.phone && (
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setPhoneVisible(v => !v) }}
            className={cn(
              'p-1 transition-colors rounded',
              phoneVisible ? 'text-[#2AA3FF]' : 'text-gray-300 hover:text-[#2AA3FF]',
            )}
            title="Număr de telefon"
          >
            <Phone size={12} />
          </button>
        )}
        <Link
          href={`/roles/${submission.role_id}/pipeline`}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          className="p-1 text-gray-300 hover:text-[#2AA3FF] transition-colors rounded"
          title="Deschide pipeline-ul rolului"
        >
          <ExternalLink size={12} />
        </Link>
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"
          title="Șterge din pipeline"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

function DragOverlayCard({ submission }: { submission: RadarSubmission }) {
  const c = submission.candidate
  return (
    <div className="bg-white rounded-xl p-3 shadow-2xl border-2 border-[#2AA3FF]/40 w-[200px] rotate-1 opacity-95">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {c ? `${c.first_name[0]}${c.last_name[0]}`.toUpperCase() : '?'}
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">
          {c ? `${c.first_name} ${c.last_name}` : 'Candidat'}
        </p>
      </div>
    </div>
  )
}

// ─── Column ──────────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  items,
  onCardEdit,
  onCardDelete,
}: {
  status: typeof PIPELINE_STATUSES[number]
  items: RadarSubmission[]
  onCardEdit: (s: RadarSubmission) => void
  onCardDelete: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value })

  return (
    <div className="flex-shrink-0 w-[210px] flex flex-col">
      <div className={cn(
        'px-3 py-2 rounded-t-xl border border-b-0 text-xs font-semibold flex items-center justify-between',
        status.headerClass,
      )}>
        <span className="truncate">{status.label}</span>
        {items.length > 0 && (
          <span className="ml-1 flex-shrink-0 opacity-60 font-normal">{items.length}</span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[400px] p-2 space-y-2 rounded-b-xl border transition-all duration-150',
          isOver
            ? 'border-[#2AA3FF] border-dashed bg-blue-50/70 scale-[1.01]'
            : 'border-gray-200 bg-white/30',
        )}
      >
        {items.map(item => (
          <CandidateCard
            key={item.id}
            submission={item}
            onEdit={() => onCardEdit(item)}
            onDelete={() => onCardDelete(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Board ───────────────────────────────────────────────────────────────────

export function PipelineRadarClient({ submissions: initialSubmissions }: { submissions: RadarSubmission[] }) {
  const router = useRouter()
  const [items, setItems] = useState<RadarSubmission[]>(initialSubmissions)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selected, setSelected] = useState<RadarSubmission | null>(null)
  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState<'kanban' | 'calendar'>('kanban')

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setItems(initialSubmissions) }, [initialSubmissions])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const activeItem = activeId ? items.find(s => s.id === activeId) ?? null : null

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const submission = items.find(s => s.id === active.id)
    const newStatus = over.id as PipelineStatus
    if (!submission || submission.status === newStatus) return

    setItems(prev => prev.map(s => s.id === active.id ? { ...s, status: newStatus } : s))

    try {
      const res = await fetch(`/api/submissions/${active.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, stage_name: STATUS_LABELS[newStatus] }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setItems(prev => prev.map(s => s.id === active.id ? { ...s, status: submission.status } : s))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Ștergi candidatul din pipeline?')) return
    setItems(prev => prev.filter(s => s.id !== id))
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      router.refresh()
    }
  }

  function handleStatusSaved(submissionId: string, newStatus: PipelineStatus) {
    setItems(prev => prev.map(s => s.id === submissionId ? { ...s, status: newStatus } : s))
    setSelected(null)
    router.refresh()
  }

  return (
    <>
      {/* View toggle */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setView('kanban'); setSelected(null) }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            view === 'kanban'
              ? 'bg-white text-[#0B1A33] shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <LayoutGrid size={14} />
          Kanban
        </button>
        <button
          onClick={() => { setView('calendar'); setSelected(null) }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            view === 'calendar'
              ? 'bg-white text-[#0B1A33] shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <CalendarDays size={14} />
          Calendar
        </button>
      </div>

      {view === 'kanban' ? (
        <div className="overflow-x-auto pb-4 -mx-1 px-1">
          {!mounted ? (
            <div className="flex gap-2.5 min-w-max">
              {PIPELINE_STATUSES.map(status => (
                <div
                  key={status.value}
                  className="flex-shrink-0 w-[210px] h-24 rounded-xl bg-gray-50 border border-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-2.5 min-w-max">
                {PIPELINE_STATUSES.map(status => (
                  <KanbanColumn
                    key={status.value}
                    status={status}
                    items={items.filter(s => s.status === status.value)}
                    onCardEdit={setSelected}
                    onCardDelete={handleDelete}
                  />
                ))}
              </div>
              <DragOverlay dropAnimation={{ duration: 120, easing: 'ease-out' }}>
                {activeItem ? <DragOverlayCard submission={activeItem} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      ) : (
        <RadarCalendarView submissions={items} onStatusSaved={handleStatusSaved} />
      )}

      {view === 'kanban' && selected && (
        <StatusModal
          submission={selected as unknown as KanbanSubmission}
          onClose={() => setSelected(null)}
          onSaved={handleStatusSaved}
        />
      )}
    </>
  )
}
