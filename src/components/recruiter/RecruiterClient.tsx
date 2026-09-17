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

function parseCommand(text: string): { type: 'db_match'; threshold: number } | { type: 'linkedin' } | { type: 'unknown' } {
  const lower = text.toLowerCase()
  if (lower.includes('linkedin')) return { type: 'linkedin' }
  const pct = lower.match(/(\d{1,3})\s*%/)
  if (pct || /match|bază|baza|database|db\b/.test(lower)) {
    const threshold = pct ? Math.min(100, Math.max(0, parseInt(pct[1], 10))) : 50
    return { type: 'db_match', threshold }
  }
  return { type: 'unknown' }
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

  async function runDbMatch(roleId: string, threshold: number) {
    setBusy(true)
    try {
      const res = await fetch(`/api/roles/${roleId}/match`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        pushMessage(roleId, { from: 'system', text: data.error ?? 'Could not run matching for this role.' })
        return
      }
      const filtered: MatchResult[] = (data.discovered ?? []).filter((d: MatchResult) => d.score >= threshold)
      setDiscoveredByRole(prev => ({ ...prev, [roleId]: filtered }))
      await loadSubmissions(roleId)

      if (filtered.length === 0) {
        pushMessage(roleId, { from: 'system', text: `No candidates in the database matched ≥ ${threshold}% for this role.` })
      } else {
        const lines = filtered
          .slice(0, 10)
          .map(f => `• ${f.candidate_name} — ${Math.round(f.score)}%`)
          .join('\n')
        const more = filtered.length > 10 ? `\n…and ${filtered.length - 10} more` : ''
        pushMessage(roleId, {
          from: 'system',
          text: `Found ${filtered.length} candidate${filtered.length === 1 ? '' : 's'} with match ≥ ${threshold}%:\n${lines}${more}\n\nSee the Candidates column →`,
        })
      }
    } catch {
      pushMessage(roleId, { from: 'system', text: 'Something went wrong while searching the database. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  function handleSend(text: string) {
    if (!selectedId) return
    pushMessage(selectedId, { from: 'user', text })
    const cmd = parseCommand(text)
    if (cmd.type === 'linkedin') {
      pushMessage(selectedId, {
        from: 'system',
        text: 'LinkedIn search is not available yet in this workspace — it\'s planned for a later phase. For now I can search candidates already in the NexDev database.',
      })
      return
    }
    if (cmd.type === 'db_match') {
      runDbMatch(selectedId, cmd.threshold)
      return
    }
    pushMessage(selectedId, {
      from: 'system',
      text: 'I can currently search the NexDev database for matches — try "find candidates with match over 50%". Free-form conversation is coming in a later phase.',
    })
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
      badge: { label: 'Pipeline', className: 'bg-gray-100 text-gray-500' },
      items: submissions.map(submissionToResult),
      showAdd: false,
    },
    {
      key: 'discovered',
      label: 'New matches from database',
      badge: { label: 'DB match', className: 'bg-blue-50 text-[#2AA3FF]' },
      items: discoveredFiltered,
      showAdd: !isClosed,
    },
  ]

  return (
    <div className="h-full grid" style={{ gridTemplateColumns: '280px 1fr 380px' }}>
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
