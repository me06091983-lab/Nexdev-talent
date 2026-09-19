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
        const isOpen = expanded === sub.id
        const status = statusBadge(sub.status)
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
                    {sub.candidate.first_name} {sub.candidate.last_name}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
                {interview && (
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-700">
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
                className="flex-none p-1.5 text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50 rounded-md transition-colors"
              >
                <ExternalLink size={13} />
              </Link>
            </div>

            {isOpen && (
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
    </div>
  )
}
