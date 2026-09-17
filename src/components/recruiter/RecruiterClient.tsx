'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { MindMapField } from './MindMapField'
import { RoleWindow } from './RoleWindow'
import { Dock } from './Dock'
import { HudDecoration } from './HudDecoration'
import { AuroraBackground } from './AuroraBackground'
import type { ChatMessage, ProposedCandidateData } from './ChatColumn'
import type { MatchResult, CandidateSource } from '@/lib/matching'

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
  const [openRoles, setOpenRoles] = useState<string[]>([])
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [submissionsByRole, setSubmissionsByRole] = useState<Record<string, any[]>>({})
  const [discoveredByRole, setDiscoveredByRole] = useState<Record<string, MatchResult[]>>({})
  const [chatByRole, setChatByRole] = useState<Record<string, ChatMessage[]>>({})
  const [busyByRole, setBusyByRole] = useState<Record<string, boolean>>({})

  const loadSubmissions = useCallback(async (roleId: string) => {
    const res = await fetch(`/api/submissions?role_id=${roleId}`)
    const data = res.ok ? await res.json() : []
    setSubmissionsByRole(prev => ({ ...prev, [roleId]: data }))
  }, [])

  useEffect(() => {
    for (const roleId of openRoles) {
      if (submissionsByRole[roleId]) continue
      fetch(`/api/submissions?role_id=${roleId}`)
        .then(res => (res.ok ? res.json() : []))
        .then(data => setSubmissionsByRole(prev => ({ ...prev, [roleId]: data })))
    }
  }, [openRoles, submissionsByRole])

  const hydratedRef = useRef(new Set<string>())

  useEffect(() => {
    for (const roleId of openRoles) {
      if (hydratedRef.current.has(roleId)) continue
      hydratedRef.current.add(roleId)
      fetch(`/api/recruiter/chat?role_id=${roleId}`)
        .then(res => (res.ok ? res.json() : { messages: [], discovered: [] }))
        .then((data: { messages?: Omit<ChatMessage, 'id'>[]; discovered?: MatchResult[] }) => {
          const persistedMessages = (data.messages ?? []).map(m => ({ ...m, id: crypto.randomUUID() }))
          if (persistedMessages.length > 0) {
            setChatByRole(prev => ({ ...prev, [roleId]: [...persistedMessages, ...(prev[roleId] ?? [])] }))
          }
          if (data.discovered && data.discovered.length > 0) {
            setDiscoveredByRole(prev => {
              const existing = prev[roleId] ?? []
              const merged = new Map(existing.map(c => [c.candidate_id, c]))
              for (const c of data.discovered!) {
                if (c.candidate_id && !merged.has(c.candidate_id)) merged.set(c.candidate_id, c)
              }
              return { ...prev, [roleId]: [...merged.values()] }
            })
          }
        })
    }
  }, [openRoles])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setActiveRoleId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function openRole(id: string) {
    setOpenRoles(prev => (prev.includes(id) ? prev : [...prev, id]))
    setActiveRoleId(id)
  }

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

  async function handleSend(roleId: string, text: string) {
    if (busyByRole[roleId]) return
    const historyForRequest = (chatByRole[roleId] ?? []).filter(m => !m.proposal).map(m => ({ from: m.from, text: m.text }))
    pushMessage(roleId, { from: 'user', text })
    setBusyByRole(prev => ({ ...prev, [roleId]: true }))
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
      setBusyByRole(prev => ({ ...prev, [roleId]: false }))
    }
  }

  async function handleAttachCv(roleId: string, file: File) {
    if (busyByRole[roleId]) return
    pushMessage(roleId, { from: 'user', text: `📎 ${file.name}` })
    setBusyByRole(prev => ({ ...prev, [roleId]: true }))
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
      setBusyByRole(prev => ({ ...prev, [roleId]: false }))
    }
  }

  async function handleConfirmProposal(roleId: string, messageId: string) {
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

  function handleDiscardProposal(roleId: string, messageId: string) {
    updateProposal(roleId, messageId, { status: 'discarded' })
  }

  async function handleAdd(roleId: string, item: MatchResult) {
    if (!item.candidate_id) return
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: item.candidate_id,
        role_id: roleId,
        ai_score: item.score,
        ai_summary: item.summary,
      }),
    })
    if (!res.ok && res.status !== 409) {
      const d = await res.json().catch(() => ({}))
      pushMessage(roleId, { from: 'system', text: d.error ?? 'Could not add this candidate to the pipeline.' })
      return
    }
    await loadSubmissions(roleId)
  }

  async function handleMoveToInterview(roleId: string, item: MatchResult) {
    if (!item.candidate_id) return
    try {
      let submissionId = item.submission_id
      if (!submissionId) {
        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_id: item.candidate_id, role_id: roleId, ai_score: item.score, ai_summary: item.summary }),
        })
        if (res.ok) {
          submissionId = (await res.json()).id
        } else if (res.status !== 409) {
          const d = await res.json().catch(() => ({}))
          pushMessage(roleId, { from: 'system', text: d.error ?? 'Could not move this candidate to interview.' })
          return
        }
      }
      if (submissionId) {
        await fetch(`/api/submissions/${submissionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'interview' }),
        })
      }
      await loadSubmissions(roleId)
    } catch {
      pushMessage(roleId, { from: 'system', text: 'Could not move this candidate to interview. Try again.' })
    }
  }

  function deriveCategories(roleId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submissions: any[] = submissionsByRole[roleId] || []
    const pipelineIds = new Set(submissions.map(s => s.candidate?.id).filter(Boolean))
    const discovered = (discoveredByRole[roleId] || []).filter(d => d.candidate_id && !pipelineIds.has(d.candidate_id))
    const bySource = (src: CandidateSource) =>
      discovered.filter(d => (d.source ?? 'database') === src).sort((a, b) => b.score - a.score)
    const inInterview = submissions.filter(s => s.status === 'interview')
    const notInInterview = submissions.filter(s => s.status !== 'interview')

    return {
      submitted: notInInterview.map(submissionToResult).sort((a, b) => b.score - a.score),
      interview: inInterview.map(submissionToResult).sort((a, b) => b.score - a.score),
      database: bySource('database'),
      linkedin: [...bySource('linkedin'), ...bySource('manual')].sort((a, b) => b.score - a.score),
      cvUpload: bySource('cv_upload'),
    }
  }

  function closeRole(id: string) {
    setOpenRoles(prev => prev.filter(x => x !== id))
    setActiveRoleId(prev => (prev === id ? null : prev))
  }

  function minimizeRole(id: string) {
    setActiveRoleId(prev => (prev === id ? null : prev))
  }

  const minimizedRoles = openRoles
    .filter(id => id !== activeRoleId)
    .map(id => roles.find(r => r.id === id))
    .filter((r): r is RecruiterRole => !!r)

  return (
    <div className="h-full deck-bg relative overflow-hidden">
      <AuroraBackground />
      <HudDecoration />

      <div className="relative h-full">
        <MindMapField roles={roles} onOpenRole={openRole} />
      </div>

      {openRoles.map(id => {
        const role = roles.find(r => r.id === id)
        if (!role) return null
        const cat = deriveCategories(id)
        return (
          <RoleWindow
            key={id}
            role={role}
            visible={id === activeRoleId}
            onMinimize={() => minimizeRole(id)}
            onClose={() => closeRole(id)}
            onFocus={() => setActiveRoleId(id)}
            isClosed={!OPEN_STATUSES.has(role.status)}
            messages={chatByRole[id] ?? []}
            busy={!!busyByRole[id]}
            onSend={text => handleSend(id, text)}
            onAttachCv={file => handleAttachCv(id, file)}
            onConfirmProposal={mid => handleConfirmProposal(id, mid)}
            onDiscardProposal={mid => handleDiscardProposal(id, mid)}
            loadingCandidates={submissionsByRole[id] === undefined}
            submitted={cat.submitted}
            database={cat.database}
            linkedin={cat.linkedin}
            cvUpload={cat.cvUpload}
            interview={cat.interview}
            onAdd={item => handleAdd(id, item)}
            onMoveToInterview={item => handleMoveToInterview(id, item)}
          />
        )
      })}

      <Dock items={minimizedRoles} onRestore={openRole} />
    </div>
  )
}
