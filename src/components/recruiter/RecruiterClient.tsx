'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { RoleListColumn } from './RoleListColumn'
import { ChatColumn, type ChatMessage } from './ChatColumn'
import { CandidateResultsColumn, type ResultGroup } from './CandidateResultsColumn'
import type { MatchResult } from '@/components/pipeline/AIMatchPanel'

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
  }
}

function nowLabel() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function RecruiterClient({ roles }: { roles: RecruiterRole[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const firstOpen = roles.find(r => OPEN_STATUSES.has(r.status))
    return firstOpen?.id ?? roles[0]?.id ?? null
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [submissionsByRole, setSubmissionsByRole] = useState<Record<string, any[]>>({})
  const [discoveredByRole, setDiscoveredByRole] = useState<Record<string, MatchResult[]>>({})
  const [chatByRole, setChatByRole] = useState<Record<string, ChatMessage[]>>({})
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

  function pushMessage(roleId: string, msg: Omit<ChatMessage, 'id' | 'time'>) {
    setChatByRole(prev => ({
      ...prev,
      [roleId]: [...(prev[roleId] ?? []), { ...msg, id: crypto.randomUUID(), time: nowLabel() }],
    }))
  }

  async function handleSend(text: string) {
    if (!selectedId || busy) return
    const roleId = selectedId
    const historyForRequest = (chatByRole[roleId] ?? []).map(m => ({ from: m.from, text: m.text }))
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
      if (data.pipelineChanged) {
        await loadSubmissions(roleId)
      }
    } catch {
      pushMessage(roleId, { from: 'system', text: 'Could not reach the recruiter assistant. Check your connection and try again.' })
    } finally {
      setBusy(false)
    }
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
  const discoveredFiltered = discovered.filter(d => d.candidate_id && !pipelineCandidateIds.has(d.candidate_id))

  const groups: ResultGroup[] = [
    {
      key: 'pipeline',
      label: isClosed ? 'Past candidates' : 'In pipeline',
      items: submissions.map(submissionToResult),
      showAdd: false,
    },
    {
      key: 'discovered',
      label: 'New matches from database',
      items: discoveredFiltered,
      showAdd: !isClosed,
    },
  ]

  return (
    <div
      className="h-full grid overflow-hidden"
      style={{ gridTemplateColumns: '260px 1fr 300px', gridTemplateRows: 'minmax(0, 1fr)' }}
    >
      <RoleListColumn roles={roles} selectedId={selectedId} onSelect={setSelectedId} />
      <ChatColumn
        roleTitle={selectedRole?.title ?? null}
        disabled={!selectedId || isClosed}
        disabledReason={!selectedId ? 'Select a role on the left to start.' : 'This role is closed — chat actions are disabled here.'}
        messages={(selectedId && chatByRole[selectedId]) || []}
        busy={busy}
        onSend={handleSend}
      />
      <CandidateResultsColumn loading={loadingSubmissions} groups={groups} onAdd={handleAdd} />
    </div>
  )
}
