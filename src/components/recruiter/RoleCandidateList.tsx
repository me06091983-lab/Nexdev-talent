'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Loader2, Sparkles, CalendarClock, Phone, Mail, PhoneCall, Check, Copy } from 'lucide-react'
import { PIPELINE_STATUSES } from '@/lib/pipeline'
import { INTERVIEW_STATUS_OPTIONS, STATUS_COLORS, type InterviewSlot } from '@/components/pipeline/InterviewPanel'
import { AddCallModal } from '@/components/calls/AddCallModal'

export interface RoleCriterion {
  id: string
  order_index: number
  criterion: string
  weight: number
}

export interface RubixCandidateEntry {
  submission_id: string
  has_scores: boolean
  overall_fit: number | null
  scores: Record<string, { score: number; evidence: string | null }>
}

export interface RoleSubmission {
  id: string
  status: string
  interviews?: InterviewSlot[]
  ai_score?: number | null
  ai_summary?: string | null
  rubix_fit?: number | null
  candidate: { id: string; first_name: string; last_name: string; phone?: string | null; email?: string | null } | null
}

function scoreClasses(score: number) {
  if (score >= 85) return 'border-green-500 text-green-700 bg-green-50'
  if (score >= 60) return 'border-amber-400 text-amber-700 bg-amber-50'
  return 'border-red-400 text-red-600 bg-red-50'
}

function statusBadge(status: string) {
  const found = PIPELINE_STATUSES.find(s => s.value === status)
  return found
    ? { label: found.label, cls: found.headerClass }
    : { label: status, cls: 'bg-gray-50 border-gray-200 text-gray-600' }
}

function nextInterviewSlot(interviews?: InterviewSlot[]): InterviewSlot | null {
  const slots = (interviews ?? []).filter(s => s.enabled && s.datetime)
  if (slots.length === 0) return null
  const now = Date.now()
  const upcoming = slots.filter(s => new Date(s.datetime).getTime() >= now).sort((a, b) => a.datetime.localeCompare(b.datetime))
  if (upcoming.length) return upcoming[0]
  return [...slots].sort((a, b) => b.datetime.localeCompare(a.datetime))[0]
}

function formatDateTime(dt: string) {
  try {
    return new Date(dt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dt
  }
}

export function RoleCandidateList({
  submissions,
  criteria,
  rubixCandidates,
  assessing,
  onAssess,
  returnTo,
  roleId,
  roleTitle,
}: {
  submissions: RoleSubmission[]
  criteria: RoleCriterion[]
  rubixCandidates: Record<string, RubixCandidateEntry>
  assessing: Set<string>
  onAssess: (submissionId: string) => void
  returnTo: string
  roleId: string
  roleTitle: string
}) {
  const [open, setOpen] = useState<{ id: string; kind: Panel } | null>(null)
  const [callFor, setCallFor] = useState<RoleSubmission | null>(null)
  const [loggedFor, setLoggedFor] = useState<string | null>(null)

  function toggle(id: string, kind: Panel) {
    setOpen(prev => (prev?.id === id && prev.kind === kind ? null : { id, kind }))
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        You haven&apos;t added any candidates to this role yet. Use <span className="font-medium text-gray-600">Add candidate</span> above.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
      {submissions.map(sub => {
        if (!sub.candidate) return null
        const rubix = rubixCandidates[sub.id]
        const score = rubix?.overall_fit ?? sub.rubix_fit ?? sub.ai_score ?? null
        const isAssessing = assessing.has(sub.id)
        const panel = open?.id === sub.id ? open.kind : null
        const cand = sub.candidate
        const status = statusBadge(sub.status)
        const interview = nextInterviewSlot(sub.interviews)

        function handleCircleClick() {
          if (isAssessing) return
          if (score === null) {
            onAssess(sub.id)
            return
          }
          toggle(sub.id, 'score')
        }

        return (
          <div key={sub.id} className="bg-white">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={handleCircleClick}
                title={score === null ? 'Run AI match' : 'Click for score breakdown'}
                className={`flex-none w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                  score === null
                    ? 'border-dashed border-gray-300 text-gray-400 hover:border-[#2AA3FF] hover:text-[#2AA3FF]'
                    : scoreClasses(Math.round(score))
                }`}
              >
                {isAssessing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : score === null ? (
                  <Sparkles size={13} />
                ) : (
                  <span className="text-[11px] font-bold leading-none">{Math.round(score)}%</span>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {cand.first_name} {cand.last_name}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${status.cls}`}>
                    {status.label}
                  </span>
                  {loggedFor === sub.id && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-green-700"><Check size={11} /> Call saved</span>
                  )}
                </div>
                {interview && (
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-700">
                    <CalendarClock size={10} />
                    {interview.label}: {formatDateTime(interview.datetime)}
                  </div>
                )}
              </div>

              <div className="flex-none flex items-center">
                <IconButton title="Phone" active={panel === 'phone'} onClick={() => toggle(sub.id, 'phone')}><Phone size={13} /></IconButton>
                <IconButton title="Interviews for this role" active={panel === 'interviews'} onClick={() => toggle(sub.id, 'interviews')}><CalendarClock size={13} /></IconButton>
                <IconButton title="Email" active={panel === 'email'} onClick={() => toggle(sub.id, 'email')}><Mail size={13} /></IconButton>
                <IconButton title="Log a call" active={callFor?.id === sub.id} onClick={() => setCallFor(sub)}><PhoneCall size={13} /></IconButton>
                <Link
                  href={`/candidates/${cand.id}?return=${encodeURIComponent(returnTo)}`}
                  title="Open / edit profile"
                  className="p-1.5 text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Pencil size={13} />
                </Link>
              </div>
            </div>

            {panel === 'phone' && <ContactPanel kind="phone" value={cand.phone ?? null} />}
            {panel === 'email' && <ContactPanel kind="email" value={cand.email ?? null} />}
            {panel === 'interviews' && <InterviewsPanel interviews={sub.interviews} />}

            {panel === 'score' && (
              <div className="px-4 pb-4 pt-2 bg-gray-50/60 border-t border-gray-100 space-y-2">
                {sub.ai_summary && (
                  <p className="text-xs text-gray-600 leading-relaxed">{sub.ai_summary}</p>
                )}
                {rubix?.has_scores ? (
                  criteria.map(cr => {
                    const cs = rubix.scores[cr.id]
                    if (!cs) return null
                    const weak = cs.score <= 2
                    return (
                      <div key={cr.id} className="text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className={weak ? 'text-red-600' : 'text-gray-700'}>{cr.criterion}</span>
                          <span className={`flex-none font-mono font-bold ${weak ? 'text-red-600' : 'text-green-700'}`}>
                            {cs.score}/5
                          </span>
                        </div>
                        {cs.evidence && <p className="text-gray-500 mt-0.5">{cs.evidence}</p>}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-gray-400">No breakdown available yet.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
      {callFor?.candidate && (
        <AddCallModal
          candidateId={callFor.candidate.id}
          candidateName={`${callFor.candidate.first_name} ${callFor.candidate.last_name}`}
          roleId={roleId}
          roleTitle={roleTitle}
          onClose={() => setCallFor(null)}
          onSaved={() => {
            const id = callFor.id
            setCallFor(null)
            setLoggedFor(id)
            setTimeout(() => setLoggedFor(prev => (prev === id ? null : prev)), 4000)
          }}
        />
      )}
    </div>
  )
}

type Panel = 'score' | 'phone' | 'email' | 'interviews'

function IconButton({ title, active, onClick, children }: { title: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${active ? 'text-[#2AA3FF] bg-blue-50' : 'text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50'}`}
    >
      {children}
    </button>
  )
}

function ContactPanel({ kind, value }: { kind: 'phone' | 'email'; value: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!value) {
    return (
      <div className="px-4 pb-3 pt-2 bg-gray-50/60 border-t border-gray-100 text-xs text-gray-400">
        No {kind === 'phone' ? 'phone number' : 'email'} on record.
      </div>
    )
  }
  const href = kind === 'phone' ? `tel:${value.replace(/\s+/g, '')}` : `mailto:${value}`
  return (
    <div className="px-4 pb-3 pt-2 bg-gray-50/60 border-t border-gray-100 flex items-center gap-2 text-sm">
      {kind === 'phone' ? <Phone size={13} className="text-gray-400" /> : <Mail size={13} className="text-gray-400" />}
      <a href={href} className="font-medium text-gray-800 hover:text-[#2AA3FF] break-all">{value}</a>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
        }}
        title="Copy"
        className="ml-auto p-1 text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50 rounded-md"
      >
        {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
      </button>
    </div>
  )
}

const INTERVIEW_LABELS: Record<string, string> = Object.fromEntries(INTERVIEW_STATUS_OPTIONS.map(o => [o.value, o.label]))

function InterviewRow({ s }: { s: InterviewSlot }) {
  return (
    <div className="text-xs py-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-gray-800">{s.label}</span>
        <span className="text-gray-500">{s.datetime ? formatDateTime(s.datetime) : 'Date not set'}</span>
        <span className={`px-1.5 py-0.5 rounded border text-[10.5px] font-medium ${STATUS_COLORS[s.status] ?? 'text-gray-500 bg-gray-50 border-gray-200'}`}>
          {INTERVIEW_LABELS[s.status] ?? s.status}
        </span>
      </div>
      {s.feedback && <p className="text-gray-500 mt-0.5 whitespace-pre-wrap">{s.feedback}</p>}
    </div>
  )
}

function splitInterviews(interviews?: InterviewSlot[]) {
  const slots = (interviews ?? []).filter(s => s.enabled)
  const now = Date.now()
  const isUpcoming = (s: InterviewSlot) => !!s.datetime && new Date(s.datetime).getTime() >= now
  return {
    slots,
    upcoming: slots.filter(isUpcoming).sort((a, b) => a.datetime.localeCompare(b.datetime)),
    past: slots.filter(s => !isUpcoming(s)).sort((a, b) => (b.datetime || '').localeCompare(a.datetime || '')),
  }
}

function InterviewsPanel({ interviews }: { interviews?: InterviewSlot[] }) {
  const { slots, upcoming, past } = splitInterviews(interviews)

  return (
    <div className="px-4 pb-3 pt-2 bg-gray-50/60 border-t border-gray-100">
      {slots.length === 0 ? (
        <p className="text-xs text-gray-400">No interviews scheduled for this role yet.</p>
      ) : (
        <div className="space-y-2">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">Scheduled</p>
            {upcoming.length ? upcoming.map((s, i) => <InterviewRow key={`u${i}`} s={s} />) : <p className="text-xs text-gray-400 py-1">Nothing upcoming.</p>}
          </div>
          {past.length > 0 && (
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">History</p>
              {past.map((s, i) => <InterviewRow key={`p${i}`} s={s} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
