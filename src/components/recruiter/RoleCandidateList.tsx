'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Loader2, Sparkles, CalendarClock } from 'lucide-react'
import { PIPELINE_STATUSES } from '@/lib/pipeline'
import type { InterviewSlot } from '@/components/pipeline/InterviewPanel'

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
  candidate: { id: string; first_name: string; last_name: string } | null
}

function scoreClasses(score: number) {
  if (score >= 75) return 'border-[#5FE0A8] text-[#5FE0A8] bg-[#5FE0A8]/10'
  if (score >= 55) return 'border-amber-400 text-amber-400 bg-amber-400/10'
  return 'border-red-400 text-red-400 bg-red-400/10'
}

function statusBadgeClass(status: string) {
  const found = PIPELINE_STATUSES.find(s => s.value === status)
  if (!found) return { label: status, cls: 'bg-white/5 text-[#7E97BA] border-white/10' }
  const map: Record<string, string> = {
    pipeline: 'bg-white/5 text-[#9FB6D6] border-white/10',
    submitted: 'bg-[#34D2FF]/10 text-[#34D2FF] border-[#34D2FF]/25',
    shortlisted: 'bg-purple-400/10 text-purple-300 border-purple-400/25',
    interview: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
    rejected: 'bg-red-400/10 text-red-300 border-red-400/25',
    offer: 'bg-[#5FE0A8]/10 text-[#5FE0A8] border-[#5FE0A8]/25',
  }
  return { label: found.label, cls: map[status] ?? 'bg-white/5 text-[#7E97BA] border-white/10' }
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
}: {
  submissions: RoleSubmission[]
  criteria: RoleCriterion[]
  rubixCandidates: Record<string, RubixCandidateEntry>
  assessing: Set<string>
  onAssess: (submissionId: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (submissions.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-[#5E7699]">
        No candidates added to this role yet.
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {submissions.map(sub => {
        if (!sub.candidate) return null
        const rubix = rubixCandidates[sub.id]
        const score = rubix?.overall_fit ?? sub.rubix_fit ?? sub.ai_score ?? null
        const isAssessing = assessing.has(sub.id)
        const isOpen = expanded === sub.id
        const status = statusBadgeClass(sub.status)
        const interview = nextInterviewSlot(sub.interviews)

        function handleCircleClick() {
          if (isAssessing) return
          if (score === null) {
            onAssess(sub.id)
            return
          }
          setExpanded(prev => (prev === sub.id ? null : sub.id))
        }

        return (
          <div key={sub.id} className="deck-card deck-rise rounded-xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <button
                onClick={handleCircleClick}
                title={score === null ? 'Run AI match' : 'Click for score breakdown'}
                className={`flex-none w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                  score === null
                    ? 'border-dashed border-[#5E7699] text-[#5E7699] hover:border-[#34D2FF] hover:text-[#34D2FF]'
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
                  <span className="text-[13px] font-medium text-[#EAF1FC] truncate">
                    {sub.candidate.first_name} {sub.candidate.last_name}
                  </span>
                  <span className={`text-[9.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
                {interview && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10.5px] text-[#F5B45C]">
                    <CalendarClock size={10} />
                    {interview.label}: {formatDateTime(interview.datetime)}
                  </div>
                )}
              </div>

              <Link
                href={`/candidates/${sub.candidate.id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View profile"
                className="flex-none p-1 text-[#7E97BA] hover:text-[#34D2FF] hover:bg-[#34D2FF]/10 rounded-md transition-colors"
              >
                <ExternalLink size={13} />
              </Link>
            </div>

            {isOpen && (
              <div className="px-3 pb-3 pt-1 border-t border-white/10 space-y-1.5">
                {sub.ai_summary && (
                  <p className="text-[11px] text-[#9FB6D6] leading-relaxed">{sub.ai_summary}</p>
                )}
                {rubix?.has_scores ? (
                  criteria.map(cr => {
                    const cs = rubix.scores[cr.id]
                    if (!cs) return null
                    const weak = cs.score <= 2
                    return (
                      <div key={cr.id} className="text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className={weak ? 'text-red-300' : 'text-[#C7D6EB]'}>{cr.criterion}</span>
                          <span className={`flex-none font-mono font-bold ${weak ? 'text-red-300' : 'text-[#5FE0A8]'}`}>
                            {cs.score}/5
                          </span>
                        </div>
                        {cs.evidence && <p className="text-[#5E7699] mt-0.5">{cs.evidence}</p>}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-[11px] text-[#5E7699]">No breakdown available yet.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
