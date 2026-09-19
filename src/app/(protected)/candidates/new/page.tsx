'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CandidateForm } from '@/components/candidates/CandidateForm'
import { resolveLockedPartner, type LockedPartner } from '@/lib/resolveLockedPartner'
import { Briefcase, Loader2 } from 'lucide-react'

interface TargetRole { id: string; title: string; client: { name: string } | null }

function NewCandidateInner() {
  const [saving, setSaving] = useState(false)
  const [lockedPartner, setLockedPartner] = useState<LockedPartner | undefined>(undefined)
  const [resolvingPartner, setResolvingPartner] = useState(true)
  const [targetRole, setTargetRole] = useState<TargetRole | null>(null)
  const [linkError, setLinkError] = useState<{ message: string; candidateId: string } | null>(null)
  const [linking, setLinking] = useState(false)
  const busy = saving || linking
  const router = useRouter()
  const roleId = useSearchParams().get('role_id')

  useEffect(() => {
    let cancelled = false
    resolveLockedPartner().then(p => {
      if (!cancelled) {
        setLockedPartner(p)
        setResolvingPartner(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!roleId) return
    fetch(`/api/roles/${roleId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => data && setTargetRole({ id: data.id, title: data.title, client: data.client ?? null }))
      .catch(() => {})
  }, [roleId])

  const backHref = roleId ? `/recruiter?role=${roleId}` : '/candidates'

  async function addToRoleAndReturn(candidateId: string) {
    if (!roleId) return
    setLinkError(null)
    setLinking(true)
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, role_id: roleId }),
    })
    if (res.ok) {
      const sub = await res.json()
      router.push(`/recruiter?role=${roleId}&assess=${sub.id}`)
      return
    }
    if (res.status === 409) {
      router.push(`/recruiter?role=${roleId}`)
      return
    }
    const data = await res.json().catch(() => ({}))
    setLinkError({ message: `The candidate was saved, but could not be added to the role: ${data.error ?? 'unknown error'}`, candidateId })
    setLinking(false)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New candidate</h1>
          <p className="text-gray-500 mt-1">Fill in the details or upload a CV for automatic pre-filling</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            disabled={busy}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="candidate-form"
            disabled={busy}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {busy ? 'Saving...' : roleId ? 'Save & add to role' : 'Save candidate'}
          </button>
        </div>
      </div>

      {roleId && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <Briefcase size={16} className="text-[#2AA3FF] flex-none" />
          <p className="text-sm text-gray-700">
            This candidate will be added to the pipeline for{' '}
            <span className="font-semibold text-gray-900">{targetRole?.title ?? '…'}</span>
            {targetRole?.client?.name && <span className="text-gray-500"> · {targetRole.client.name}</span>}
          </p>
        </div>
      )}

      {linkError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-3">
          <span className="flex-1">{linkError.message}</span>
          <button
            type="button"
            onClick={() => addToRoleAndReturn(linkError.candidateId)}
            disabled={linking}
            className="px-3 py-1.5 bg-[#2AA3FF] hover:bg-[#1a8fe0] disabled:opacity-60 text-white text-xs font-medium rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      <div className="glass rounded-2xl p-8">
        {resolvingPartner ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
            <Loader2 size={14} className="animate-spin" /> Loading...
          </div>
        ) : (
          <CandidateForm
            onSavingChange={setSaving}
            lockedPartner={lockedPartner}
            onSaved={roleId ? c => addToRoleAndReturn(c.id) : undefined}
            onUseExisting={roleId ? addToRoleAndReturn : undefined}
            useExistingLabel="Add existing candidate to this role"
          />
        )}
      </div>
    </div>
  )
}

export default function NewCandidatePage() {
  return (
    <Suspense fallback={null}>
      <NewCandidateInner />
    </Suspense>
  )
}
