'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Upload, Sparkles, FileText, X } from 'lucide-react'
import { RoleCandidateList, type RoleCriterion, type RoleSubmission, type RubixCandidateEntry } from './RoleCandidateList'
import { AddCandidateWindow } from './AddCandidateWindow'
import type { ParsedCvData } from '@/components/candidates/CandidateForm'
import type { RecruiterRole } from './RecruiterClient'

interface Skill { id: string; name: string; category: string }

interface RoleDetail {
  description: string | null
  seniority: string | null
  location: string | null
  collaboration_type: string | null
  fieldglass_id: string | null
  required_skills: Skill[]
  preferred_skills: Skill[]
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', active: 'Active', on_hold: 'On Hold', closed: 'Closed', filled: 'Filled',
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#5E7699] mb-2">{children}</h3>
}

function SkillPill({ name }: { name: string }) {
  return (
    <span className="text-[10.5px] bg-white/5 border border-white/10 text-[#9FB6D6] px-2 py-0.5 rounded-full">
      {name}
    </span>
  )
}

export function RoleWorkspace({ role, isClosed }: { role: RecruiterRole; isClosed: boolean }) {
  const [detail, setDetail] = useState<RoleDetail | null>(null)
  const [submissions, setSubmissions] = useState<RoleSubmission[]>([])
  const [criteria, setCriteria] = useState<RoleCriterion[]>([])
  const [rubixCandidates, setRubixCandidates] = useState<Record<string, RubixCandidateEntry>>({})
  const [loading, setLoading] = useState(true)
  const [assessing, setAssessing] = useState<Set<string>>(new Set())

  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvBusy, setCvBusy] = useState(false)
  const [cvError, setCvError] = useState('')

  const [addWindow, setAddWindow] = useState<{ cvFilePath: string; parsedCvData: ParsedCvData } | null>(null)

  const loadRole = useCallback(async () => {
    const res = await fetch(`/api/roles/${role.id}`)
    if (res.ok) setDetail(await res.json())
  }, [role.id])

  const loadSubmissions = useCallback(async () => {
    const res = await fetch(`/api/submissions?role_id=${role.id}`)
    if (res.ok) setSubmissions(await res.json())
  }, [role.id])

  const loadRubixView = useCallback(async () => {
    const res = await fetch(`/api/roles/${role.id}/rubix-view`)
    if (!res.ok) return
    const data = await res.json()
    setCriteria(data.criteria ?? [])
    const map: Record<string, RubixCandidateEntry> = {}
    for (const c of data.candidates ?? []) map[c.submission_id] = c
    setRubixCandidates(map)
  }, [role.id])

  useEffect(() => {
    Promise.all([loadRole(), loadSubmissions(), loadRubixView()]).finally(() => setLoading(false))
  }, [loadRole, loadSubmissions, loadRubixView])

  async function triggerAssess(submissionId: string) {
    setAssessing(prev => new Set(prev).add(submissionId))
    try {
      await fetch(`/api/submissions/${submissionId}/rubix-assess`, { method: 'POST' })
      await loadRubixView()
    } finally {
      setAssessing(prev => { const s = new Set(prev); s.delete(submissionId); return s })
    }
  }

  async function handleGo() {
    if (!cvFile) return
    setCvBusy(true)
    setCvError('')
    try {
      const uploadFd = new FormData()
      uploadFd.append('cv', cvFile)
      const parseFd = new FormData()
      parseFd.append('cv', cvFile)

      const [uploadRes, parseRes] = await Promise.all([
        fetch('/api/cv-upload', { method: 'POST', body: uploadFd }),
        fetch('/api/cv-parse', { method: 'POST', body: parseFd }),
      ])
      const uploadData = await uploadRes.json()
      const parsed = await parseRes.json()

      if (!parseRes.ok) {
        setCvError(parsed.error ?? 'Could not read this CV.')
        return
      }
      if (!parsed.first_name || !parsed.last_name) {
        setCvError('Could not extract a name from this CV — it may be scanned/image-based. Try a text-based PDF or DOCX.')
        return
      }
      if (!uploadRes.ok) {
        setCvError(uploadData.error ?? 'Could not upload this CV.')
        return
      }

      setAddWindow({ cvFilePath: uploadData.path, parsedCvData: parsed })
      setCvFile(null)
    } catch {
      setCvError('Could not process the CV. Try again.')
    } finally {
      setCvBusy(false)
    }
  }

  async function handleCandidateSaved(candidate: { id: string; first_name: string; last_name: string }) {
    setAddWindow(null)
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidate.id, role_id: role.id }),
    })
    if (res.ok) {
      const sub = await res.json()
      await loadSubmissions()
      triggerAssess(sub.id)
    } else if (res.status !== 409) {
      await loadSubmissions()
    } else {
      await loadSubmissions()
    }
  }

  return (
    <div className="relative h-full min-h-0 deck-panel rounded-[24px] overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto deck-scroll p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[#7E97BA] py-8 justify-center">
            <Loader2 size={14} className="animate-spin" /> Loading role...
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-[#5E7699]">{role.client?.name ?? '—'}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {detail?.seniority && <SkillPill name={detail.seniority} />}
                {detail?.location && <SkillPill name={detail.location} />}
                {detail?.collaboration_type && <SkillPill name={detail.collaboration_type.replace('_', ' ')} />}
                <span className="text-[10.5px] px-2 py-0.5 rounded-full border border-[#34D2FF]/30 bg-[#34D2FF]/10 text-[#34D2FF]">
                  {STATUS_LABEL[role.status] ?? role.status}
                </span>
              </div>
            </div>

            <section>
              <SectionTitle>Description</SectionTitle>
              <p className="text-[12px] text-[#C7D6EB] whitespace-pre-wrap leading-relaxed">
                {detail?.description || 'No description on record.'}
              </p>
            </section>

            {(detail?.required_skills?.length || detail?.preferred_skills?.length) ? (
              <section className="space-y-2">
                {!!detail?.required_skills?.length && (
                  <div>
                    <SectionTitle>Required skills</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.required_skills.map(s => <SkillPill key={s.id} name={s.name} />)}
                    </div>
                  </div>
                )}
                {!!detail?.preferred_skills?.length && (
                  <div>
                    <SectionTitle>Preferred skills</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.preferred_skills.map(s => <SkillPill key={s.id} name={s.name} />)}
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            <section>
              <SectionTitle>Rubix Matrix</SectionTitle>
              {criteria.length === 0 ? (
                <p className="text-[11.5px] text-[#5E7699]">No Rubix Matrix defined for this role.</p>
              ) : (
                <div className="space-y-1">
                  {criteria.map((cr, i) => (
                    <div key={cr.id} className="flex items-start gap-2 text-[11.5px]">
                      <span className="flex-none w-9 text-right font-mono text-[#5FE0A8] font-semibold">{cr.weight}%</span>
                      <span className="text-[#C7D6EB]">{i + 1}. {cr.criterion}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionTitle>Add candidate from CV</SectionTitle>
              <div className="flex items-center gap-2">
                <label className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border cursor-pointer transition-colors ${
                  isClosed ? 'opacity-40 cursor-not-allowed border-white/10 text-[#5E7699]' : 'border-white/15 text-[#C7D6EB] hover:border-[#34D2FF] hover:text-[#34D2FF]'
                }`}>
                  <Upload size={13} />
                  {cvFile ? cvFile.name : 'Choose CV file'}
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    disabled={isClosed || cvBusy}
                    onChange={e => { setCvFile(e.target.files?.[0] ?? null); setCvError('') }}
                    className="hidden"
                  />
                </label>
                {cvFile && !cvBusy && (
                  <button onClick={() => setCvFile(null)} className="p-1 text-[#5E7699] hover:text-red-300">
                    <X size={13} />
                  </button>
                )}
                <button
                  onClick={handleGo}
                  disabled={!cvFile || cvBusy || isClosed}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#34D2FF] text-[#06131F] text-[12px] font-semibold rounded-lg hover:bg-[#34D2FF]/90 disabled:opacity-40 transition-colors"
                >
                  {cvBusy ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                  {cvBusy ? 'Reading CV...' : 'GO'}
                </button>
              </div>
              {cvError && <p className="mt-1.5 text-[11px] text-red-300">{cvError}</p>}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-2">
                <SectionTitle>Candidates ({submissions.length})</SectionTitle>
                <Sparkles size={11} className="text-[#5E7699] -mt-2" />
              </div>
              <RoleCandidateList
                submissions={submissions}
                criteria={criteria}
                rubixCandidates={rubixCandidates}
                assessing={assessing}
                onAssess={triggerAssess}
              />
            </section>
          </div>
        )}
      </div>

      {addWindow && (
        <AddCandidateWindow
          cvFilePath={addWindow.cvFilePath}
          parsedCvData={addWindow.parsedCvData}
          onClose={() => setAddWindow(null)}
          onSaved={handleCandidateSaved}
        />
      )}
    </div>
  )
}
