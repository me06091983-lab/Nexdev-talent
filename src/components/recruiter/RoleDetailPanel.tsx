'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, MapPin, Plus, Calendar, Hash } from 'lucide-react'
import { RoleCandidateList, type RoleCriterion, type RoleSubmission, type RubixCandidateEntry } from './RoleCandidateList'
import type { RecruiterRole } from './RecruiterClient'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Pill({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'blue' }) {
  const cls = tone === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'
  return <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${cls}`}>{children}</span>
}

export function RoleDetailPanel({
  role,
  currentUserId,
  assessSubmissionId,
}: {
  role: RecruiterRole
  currentUserId: string | null
  assessSubmissionId: string | null
}) {
  const [submissions, setSubmissions] = useState<RoleSubmission[]>([])
  const [criteria, setCriteria] = useState<RoleCriterion[]>([])
  const [rubixCandidates, setRubixCandidates] = useState<Record<string, RubixCandidateEntry>>({})
  const [loading, setLoading] = useState(true)
  const [assessing, setAssessing] = useState<Set<string>>(new Set())
  const autoAssessed = useRef(false)

  const fetchSubmissions = useCallback(async (): Promise<RoleSubmission[]> => {
    if (!currentUserId) return []
    const res = await fetch(`/api/submissions?role_id=${role.id}&submitted_by=${currentUserId}`)
    return res.ok ? res.json() : []
  }, [role.id, currentUserId])

  const fetchRubix = useCallback(async () => {
    const res = await fetch(`/api/roles/${role.id}/rubix-view`)
    if (!res.ok) return null
    const data = await res.json()
    const map: Record<string, RubixCandidateEntry> = {}
    for (const c of data.candidates ?? []) map[c.submission_id] = c
    return { criteria: (data.criteria ?? []) as RoleCriterion[], map }
  }, [role.id])

  const triggerAssess = useCallback(async (submissionId: string) => {
    setAssessing(prev => new Set(prev).add(submissionId))
    try {
      await fetch(`/api/submissions/${submissionId}/rubix-assess`, { method: 'POST' })
      const [subs, rubix] = await Promise.all([fetchSubmissions(), fetchRubix()])
      setSubmissions(subs)
      if (rubix) { setCriteria(rubix.criteria); setRubixCandidates(rubix.map) }
    } finally {
      setAssessing(prev => { const s = new Set(prev); s.delete(submissionId); return s })
    }
  }, [fetchSubmissions, fetchRubix])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchSubmissions(), fetchRubix()]).then(([subs, rubix]) => {
      if (cancelled) return
      setSubmissions(subs)
      if (rubix) { setCriteria(rubix.criteria); setRubixCandidates(rubix.map) }
      setLoading(false)
      if (!assessSubmissionId || autoAssessed.current) return
      autoAssessed.current = true
      window.history.replaceState(null, '', `/recruiter?role=${role.id}`)
      if (!rubix?.map[assessSubmissionId]?.has_scores) triggerAssess(assessSubmissionId)
    })
    return () => { cancelled = true }
  }, [fetchSubmissions, fetchRubix, triggerAssess, assessSubmissionId, role.id])

  const hasSkills = role.required_skills.length > 0 || role.preferred_skills.length > 0

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{role.client?.name ?? 'No client'}</p>
            <h2 className="text-xl font-bold text-gray-900 mt-0.5">{role.title}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {role.seniority && <Pill>{role.seniority}</Pill>}
              {role.location && <Pill><MapPin size={11} />{role.location}</Pill>}
              {role.collaboration_type && <Pill>{role.collaboration_type.replace('_', ' ')}</Pill>}
              {role.fieldglass_id && <Pill><Hash size={11} />{role.fieldglass_id}</Pill>}
              {role.deadline && (
                <Pill tone="blue"><Calendar size={11} />Deadline {new Date(role.deadline).toLocaleDateString('en-GB')}</Pill>
              )}
            </div>
            {role.recruiter_rate != null && (
              <p className="text-sm font-semibold text-green-700 mt-3">
                Recruiter rate: {role.recruiter_rate} {role.recruiter_rate_currency} / {role.recruiter_rate_type === 'hourly' ? 'hour' : 'day'}
              </p>
            )}
          </div>
          <Link
            href={`/candidates/new?role_id=${role.id}`}
            className="flex-none inline-flex items-center gap-1.5 bg-[#2AA3FF] hover:bg-[#1a8fe0] text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus size={15} /> Add candidate
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <Section title="Description">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {role.description || 'No description on record.'}
            </p>
          </Section>

          {hasSkills && (
            <Section title="Skills">
              <div className="space-y-3">
                {role.required_skills.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Required</p>
                    <div className="flex flex-wrap gap-1.5">
                      {role.required_skills.map(s => (
                        <span key={s.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">{s.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {role.preferred_skills.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Preferred</p>
                    <div className="flex flex-wrap gap-1.5">
                      {role.preferred_skills.map(s => (
                        <span key={s.id} className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full">{s.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section title="Rubix Matrix">
            {criteria.length === 0 ? (
              <p className="text-sm text-gray-400">No Rubix Matrix defined for this role.</p>
            ) : (
              <div className="space-y-1.5">
                {criteria.map((cr, i) => (
                  <div key={cr.id} className="flex items-start gap-3 text-sm">
                    <span className="flex-none w-10 text-right font-mono font-semibold text-green-700">{cr.weight}%</span>
                    <span className="text-gray-700">{i + 1}. {cr.criterion}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
        <div className="sticky top-4 min-w-0">
          <Section title={`My candidates for this role (${submissions.length})`}>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
                <Loader2 size={14} className="animate-spin" /> Loading...
              </div>
            ) : (
              <RoleCandidateList
                submissions={submissions}
                criteria={criteria}
                rubixCandidates={rubixCandidates}
                assessing={assessing}
                onAssess={triggerAssess}
            returnTo={`/recruiter?role=${role.id}`}
            roleId={role.id}
            roleTitle={role.title}
              />
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
