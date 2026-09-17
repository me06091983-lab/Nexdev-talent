'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { AnimatePresence } from 'motion/react'
import { RoleBubbleField } from './RoleBubbleField'
import { RecruiterModal } from './RecruiterModal'
import type { ChatMessage, ProposedCandidateData } from './ChatColumn'
import type { ResultGroup } from './CandidateResultsColumn'
import type { MatchResult } from '@/lib/matching'

export interface RecruiterRole {
  id: string
  title: string
  status: string
  deadline: string | null
  client: { name: string } | null
}

const OPEN_STATUSES = new Set(['draft', 'active', 'on_hold'])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function submissionToResult(s: any): MatchResult {
  return {
    candidate_id: s.candidate?.id,
    candidate_name: s.candidate ? `${s.candidate.first_name} ${s.candidate.last_name}` : 'Unknown candidate',
    submission_id: s.id,
    score: s.rubix_fit ?? s.ai_score ?? 0,
    matched_skills: [],
    missing_skills: [],
    summary: s.ai_summary ?? '',
    rate_min: s.candidate?.rate_min ?? null,
    rate_wish: s.candidate?.rate_wish ?? null,
    currency: s.candidate?.currency ?? 'EUR',
    cv_file_path: null,
    source: 'database',
  }
}

function nowLabel() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function RecruiterClient({ roles }: { roles: RecruiterRole[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [submissionsByRole, setSubmissionsByRole] = useState<Record<string, any[]>>({})
  const [discoveredByRole, setDiscoveredByRole] = useState<Record<string, MatchResult[]>>({})
  const [chatByRole, setChatByRole] = useState<Record<string, ChatMessage[]>>({})
  const [activeTab, setActiveTab] = useState('identified')
  const [busy, setBusy] = useState(false)

  const selectedRole = useMemo(() => roles.find(r => r.id === selectedId) ?? null, [roles, selectedId])
  const isClosed = selectedRole ? !OPEN_STATUSES.has(selectedRole.status) : false
  const loadingSubmissions = !!selectedId && submissionsByRole[selectedId] === undefined

  const loadSubmissions = useCallback(async (roleId: string) => {
    const res = await fetch(`/api/submissions?role_id=${roleId}`)
    const data = res.ok ? await res.json() : []
    setSubmissionsByRole(prev => ({ ...prev, [roleId]: data }))
  }, [])

  useEffect(() => {
    if (!selectedId || submissionsByRole[selectedId]) return
    fetch(`/api/submissions?role_id=${selectedId}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => setSubmissionsByRole(prev => ({ ...prev, [selectedId]: data })))
  }, [selectedId, submissionsByRole])

  const hydratedRef = useRef(new Set<string>())

  useEffect(() => {
    if (!selectedId || hydratedRef.current.has(selectedId)) return
    hydratedRef.current.add(selectedId)
    fetch(`/api/recruiter/chat?role_id=${selectedId}`)
      .then(res => (res.ok ? res.json() : { messages: [], discovered: [] }))
      .then((data: { messages?: Omit<ChatMessage, 'id'>[]; discovered?: MatchResult[] }) => {
        const persistedMessages = (data.messages ?? []).map(m => ({ ...m, id: crypto.randomUUID() }))
        if (persistedMessages.length > 0) {
          setChatByRole(prev => ({ ...prev, [selectedId]: [...persistedMessages, ...(prev[selectedId] ?? [])] }))
        }
        if (data.discovered && data.discovered.length > 0) {
          setDiscoveredByRole(prev => {
            const existing = prev[selectedId] ?? []
            const merged = new Map(existing.map(c => [c.candidate_id, c]))
            for (const c of data.discovered!) {
              if (c.candidate_id && !merged.has(c.candidate_id)) merged.set(c.candidate_id, c)
            }
            return { ...prev, [selectedId]: [...merged.values()] }
          })
        }
      })
  }, [selectedId])

  useEffect(() => {
    if (!selectedId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  function pushMessage(roleId: string, msg: Omit<ChatMessage, 'id' | 'time'>) {
    const id = crypto.randomUUID()
    setChatByRole(prev => ({
      ...prev,
      [roleId]: [...(prev[roleId] ?? []), { ...msg, id, time: nowLabel() }],
    }))
    return id
  }

  function updateProposal(roleId: string, messageId: string, patch: Partial<ProposedCandidateData>) {
    setChatByRole(prev => ({
      ...prev,
      [roleId]: (prev[roleId] ?? []).map(m =>
        m.id === messageId && m.proposal ? { ...m, proposal: { ...m.proposal, ...patch } } : m
      ),
    }))
  }

  async function handleSend(text: string) {
    if (!selectedId || busy) return
    const roleId = selectedId
    const historyForRequest = (chatByRole[roleId] ?? []).filter(m => !m.proposal).map(m => ({ from: m.from, text: m.text }))
    pushMessage(roleId, { from: 'user', text })
    setBusy(true)
    try {
      const res = await fetch('/api/recruiter/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId, message: text, history: historyForRequest }),
      })
      const data = await res.json()
      if (!res.ok) {
        pushMessage(roleId, { from: 'system', text: data.error ?? 'The recruiter assistant hit an error. Try again.' })
        return
      }
      pushMessage(roleId, { from: 'system', text: data.reply ?? 'Done.' })
      if (Array.isArray(data.candidates) && data.candidates.length > 0) {
        setDiscoveredByRole(prev => {
          const existing = prev[roleId] ?? []
          const merged = new Map(existing.map(c => [c.candidate_id, c]))
          for (const c of data.candidates as MatchResult[]) {
            if (c.candidate_id) merged.set(c.candidate_id, c)
          }
          return { ...prev, [roleId]: [...merged.values()].sort((a, b) => b.score - a.score) }
        })
      }
      if (Array.isArray(data.proposedCandidates)) {
        for (const p of data.proposedCandidates as Omit<ProposedCandidateData, 'status'>[]) {
          pushMessage(roleId, { from: 'system', text: '', proposal: { ...p, status: 'pending' } })
        }
      }
      if (data.pipelineChanged) {
        await loadSubmissions(roleId)
      }
    } catch {
      pushMessage(roleId, { from: 'system', text: 'Could not reach the recruiter assistant. Check your connection and try again.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleAttachCv(file: File) {
    if (!selectedId || busy) return
    const roleId = selectedId
    pushMessage(roleId, { from: 'user', text: `📎 ${file.name}` })
    setBusy(true)
    try {
      const uploadFd = new FormData()
      uploadFd.append('cv', file)
      const parseFd = new FormData()
      parseFd.append('cv', file)

      const [uploadRes, parseRes] = await Promise.all([
        fetch('/api/cv-upload', { method: 'POST', body: uploadFd }),
        fetch('/api/cv-parse', { method: 'POST', body: parseFd }),
      ])
      const uploadData = await uploadRes.json()
      const parsed = await parseRes.json()

      if (!parseRes.ok) {
        pushMessage(roleId, { from: 'system', text: parsed.error ?? 'Could not read this CV.' })
        return
      }
      if (!parsed.first_name || !parsed.last_name) {
        pushMessage(roleId, { from: 'system', text: "Could not extract a name from this CV — it may be scanned/image-based. Try a text-based PDF or DOCX." })
        return
      }

      pushMessage(roleId, {
        from: 'system',
        text: '',
        proposal: {
          first_name: parsed.first_name,
          last_name: parsed.last_name,
          email: parsed.email ?? null,
          phone: parsed.phone ?? null,
          linkedin_url: parsed.linkedin_url ?? null,
          location: parsed.location ?? null,
          seniority: parsed.seniority ?? null,
          skills: (parsed.matched_skills ?? []).map((s: { name: string }) => s.name),
          summary: parsed.profile_summary ?? '',
          cv_file_path: uploadRes.ok ? uploadData.path : null,
          source: 'cv_upload',
          status: 'pending',
        },
      })
    } catch {
      pushMessage(roleId, { from: 'system', text: 'Could not process the CV. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmProposal(messageId: string) {
    if (!selectedId) return
    const roleId = selectedId
    const msg = (chatByRole[roleId] ?? []).find(m => m.id === messageId)
    if (!msg?.proposal) return
    const { status: _status, ...candidate } = msg.proposal
    void _status

    const res = await fetch('/api/recruiter/confirm-candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: roleId, candidate, add_to_pipeline: false }),
    })
    const data = await res.json()
    if (!res.ok) {
      pushMessage(roleId, { from: 'system', text: data.error ?? 'Could not save this candidate.' })
      return
    }
    updateProposal(roleId, messageId, { status: 'added' })
    setDiscoveredByRole(prev => {
      const existing = prev[roleId] ?? []
      const merged = new Map(existing.map(c => [c.candidate_id, c]))
      merged.set(data.candidate_id, data as MatchResult)
      return { ...prev, [roleId]: [...merged.values()] }
    })
  }

  function handleDiscardProposal(messageId: string) {
    if (!selectedId) return
    updateProposal(selectedId, messageId, { status: 'discarded' })
  }

  async function handleAdd(item: MatchResult) {
    if (!selectedId || !item.candidate_id) return
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: item.candidate_id,
        role_id: selectedId,
        ai_score: item.score,
        ai_summary: item.summary,
      }),
    })
    if (!res.ok && res.status !== 409) {
      const d = await res.json().catch(() => ({}))
      pushMessage(selectedId, { from: 'system', text: d.error ?? 'Could not add this candidate to the pipeline.' })
      return
    }
    await loadSubmissions(selectedId)
  }

  const submissions = (selectedId && submissionsByRole[selectedId]) || []
  const pipelineCandidateIds = new Set(
    submissions.map((s: { candidate?: { id?: string } }) => s.candidate?.id).filter(Boolean)
  )
  const discovered = (selectedId && discoveredByRole[selectedId]) || []
  const discoveredFiltered = discovered
    .filter(d => d.candidate_id && !pipelineCandidateIds.has(d.candidate_id))
    .sort((a, b) => b.score - a.score)

  const groups: ResultGroup[] = [
    {
      key: 'identified',
      label: 'Identified',
      items: discoveredFiltered,
      showAdd: !isClosed,
    },
    {
      key: 'submitted',
      label: isClosed ? 'Past candidates' : 'Submitted',
      items: submissions.map(submissionToResult).sort((a, b) => b.score - a.score),
      showAdd: false,
    },
  ]

  return (
    <div className="h-full deck-bg relative overflow-hidden">
      <div className="absolute inset-0 deck-grid pointer-events-none" />
      <div className="relative h-full">
        <RoleBubbleField roles={roles} onSelect={setSelectedId} />
      </div>

      <AnimatePresence>
        {selectedRole && (
          <RecruiterModal
            role={selectedRole}
            onClose={() => setSelectedId(null)}
            isClosed={isClosed}
            messages={(selectedId && chatByRole[selectedId]) || []}
            busy={busy}
            onSend={handleSend}
            onAttachCv={handleAttachCv}
            onConfirmProposal={handleConfirmProposal}
            onDiscardProposal={handleDiscardProposal}
            loadingCandidates={loadingSubmissions}
            groups={groups}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onAdd={handleAdd}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
