'use client'

import { useState, useEffect } from 'react'
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
import { MessageSquare, Trash2, FileSignature, CheckCircle2, Phone, User, Calendar } from 'lucide-react'
import Link from 'next/link'
import { StatusModal } from './StatusModal'
import { ContractModal, type PartnerOption } from './ContractModal'
import type { InterviewSlot } from './InterviewPanel'

interface Skill { id: string; name: string; category: string }
interface Stage { id: string; name: string; order_index: number }
interface Candidate {
  id: string
  first_name: string
  last_name: string
  phone?: string | null
  seniority: string | null
  rate_min: number | null
  rate_wish: number | null
  currency: string | null
  profile: { name: string } | null
  skills: Skill[]
}
export interface Submission {
  id: string
  status: PipelineStatus
  ai_score: number | null
  ai_summary: string | null
  candidate: Candidate | null
  current_stage: Stage | null
  role_id: string
  interviews?: InterviewSlot[]
  contract_id?: string | null
  role?: { title?: string; client?: { name: string } | null } | null
}

const SENIORITY_SHORT: Record<string, string> = {
  junior: 'Jr', mid: 'Mid', senior: 'Sr', lead: 'Lead', principal: 'Princ.',
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

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 85
    ? 'border-green-400 text-green-600'
    : score >= 60
    ? 'border-yellow-400 text-yellow-600'
    : 'border-red-400 text-red-500'
  return (
    <span className={cn('flex-shrink-0 w-9 h-9 rounded-full border-2 text-[10px] font-bold flex items-center justify-center', cls)}>
      {score}%
    </span>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

function CandidateCard({
  submission,
  onEdit,
  onDelete,
  onContract,
}: {
  submission: Submission
  onEdit: () => void
  onDelete: () => void
  onContract: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: submission.id })
  const style = transform ? { transform: CSS.Transform.toString(transform) } : undefined
  const c = submission.candidate
  const isOffer = submission.status === 'offer'
  const hasContract = !!submission.contract_id
  const [phoneVisible, setPhoneVisible] = useState(false)

  const allInterviews = ((submission.interviews ?? []) as InterviewSlot[])
    .filter(s => s.enabled)
    .map(s => ({
      label: s.label.replace('Interview', 'Int.').split(' ')[0].slice(0, 10),
      datetime: s.datetime,
      status: s.status,
      accepted: s.candidate_accepted ?? false,
    }))

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-white rounded-xl p-3 shadow-sm border cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-md group',
        isDragging && 'opacity-20',
        isOffer && !hasContract ? 'border-green-200' : 'border-gray-100',
        isOffer && hasContract && 'border-green-300 bg-green-50/30',
      )}
    >
      {/* Row 1: initials + name + score */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {c ? `${c.first_name[0]}${c.last_name[0]}`.toUpperCase() : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate leading-tight">
            {c ? `${c.first_name} ${c.last_name}` : 'Candidat'}
          </p>
          {c?.profile && <p className="text-[10px] text-gray-400 truncate">{c.profile.name}</p>}
        </div>
        {submission.ai_score != null && <ScoreBadge score={Math.round(submission.ai_score)} />}
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

      {/* Row 2: badges */}
      {(c?.rate_wish || c?.rate_min || hasContract) && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {c?.rate_min != null && (
            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded font-medium">
              min {c.rate_min} {c.currency ?? 'EUR'}
            </span>
          )}
          {c?.rate_wish != null && (
            <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
              dorit {c.rate_wish} {c.currency ?? 'EUR'}
            </span>
          )}
          {hasContract && (
            <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
              <CheckCircle2 size={9} />
              Contract
            </span>
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

      {/* Row 4: contract CTA for offer cards */}
      {isOffer && (
        <div className="mt-2">
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onContract() }}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
              hasContract
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <FileSignature size={11} />
            {hasContract ? 'Editează oferta' : 'Contractează'}
          </button>
        </div>
      )}

      {/* Hover actions — always present for all cards */}
      <div className="mt-1.5 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="p-1 text-gray-300 hover:text-[#2AA3FF] transition-colors rounded"
          title="Status / Feedback"
        >
          <MessageSquare size={13} />
        </button>
        {c && (
          <Link
            href={`/candidates/${c.id}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            className="p-1 text-gray-300 hover:text-[#2AA3FF] transition-colors rounded"
            title="Profil candidat"
          >
            <User size={13} />
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
            <Phone size={13} />
          </button>
        )}
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"
          title="Șterge din pipeline"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function DragOverlayCard({ submission }: { submission: Submission }) {
  const c = submission.candidate
  return (
    <div className="bg-white rounded-xl p-3 shadow-2xl border-2 border-[#2AA3FF]/40 w-[210px] rotate-1 opacity-95">
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
  onCardContract,
}: {
  status: typeof PIPELINE_STATUSES[number]
  items: Submission[]
  onCardEdit: (s: Submission) => void
  onCardDelete: (id: string) => void
  onCardContract: (s: Submission) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value })

  return (
    <div className="flex-shrink-0 w-[220px] flex flex-col">
      <div className={cn(
        'px-3 py-2 rounded-t-xl border border-b-0 text-xs font-semibold flex items-center justify-between',
        status.headerClass
      )}>
        <span className="truncate">{status.label}</span>
        {items.length > 0 && (
          <span className="ml-1 flex-shrink-0 opacity-70 font-normal">{items.length}</span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[400px] p-2 space-y-2 rounded-b-xl border transition-all duration-150',
          isOver
            ? 'border-[#2AA3FF] border-dashed bg-blue-50/70 scale-[1.01]'
            : 'border-gray-200 bg-white/30'
        )}
      >
        {items.map(item => (
          <CandidateCard
            key={item.id}
            submission={item}
            onEdit={() => onCardEdit(item)}
            onDelete={() => onCardDelete(item.id)}
            onContract={() => onCardContract(item)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Board ───────────────────────────────────────────────────────────────────

export function KanbanBoard({
  submissions: initialSubmissions,
  onRefresh,
  partners = [],
}: {
  submissions: Submission[]
  onRefresh: () => void
  partners?: PartnerOption[]
}) {
  const [items, setItems] = useState<Submission[]>(initialSubmissions)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Submission | null>(null)
  const [contracting, setContracting] = useState<Submission | null>(null)
  const [mounted, setMounted] = useState(false)
  const [dragError, setDragError] = useState('')

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setItems(initialSubmissions) }, [initialSubmissions])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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
      setDragError('Mutarea nu a putut fi salvată. Încearcă din nou.')
      setTimeout(() => setDragError(''), 4000)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Ștergi candidatul din pipeline?')) return
    setItems(prev => prev.filter(s => s.id !== id))
    try {
      await fetch(`/api/submissions/${id}`, { method: 'DELETE' })
      onRefresh()
    } catch {
      onRefresh()
    }
  }

  function handleStatusSaved(submissionId: string, newStatus: PipelineStatus) {
    setItems(prev => prev.map(s => s.id === submissionId ? { ...s, status: newStatus } : s))
    setSelected(null)
    onRefresh()
  }

  function handleContractSaved() {
    setContracting(null)
    onRefresh()
  }

  return (
    <>
      {dragError && (
        <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl">
          <span>{dragError}</span>
        </div>
      )}
      <div className="overflow-x-auto pb-4 -mx-1 px-1">
        {!mounted ? (
          <div className="flex gap-2.5 min-w-max">
            {PIPELINE_STATUSES.map(status => (
              <div key={status.value} className="flex-shrink-0 w-52 h-24 rounded-xl bg-gray-50 border border-gray-100 animate-pulse" />
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
                  onCardContract={setContracting}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={{ duration: 120, easing: 'ease-out' }}>
              {activeItem ? <DragOverlayCard submission={activeItem} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {selected && (
        <StatusModal
          submission={selected}
          onClose={() => setSelected(null)}
          onSaved={handleStatusSaved}
        />
      )}

      {contracting && (
        <ContractModal
          submission={contracting}
          contractId={contracting.contract_id}
          partners={partners}
          onClose={() => setContracting(null)}
          onSaved={handleContractSaved}
        />
      )}
    </>
  )
}
