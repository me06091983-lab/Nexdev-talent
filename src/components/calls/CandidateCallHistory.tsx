'use client'

import { useEffect, useState } from 'react'
import { Loader2, PhoneCall, Plus, Trash2, Briefcase } from 'lucide-react'
import { CallForm, type CandidateCall } from './CallForm'

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function CandidateCallHistory({ candidateId }: { candidateId: string }) {
  const [calls, setCalls] = useState<CandidateCall[]>([])
  const [me, setMe] = useState<{ id: string; is_admin: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`/api/candidates/${candidateId}/calls`).then(r => (r.ok ? r.json() : [])),
      fetch('/api/auth/me').then(r => (r.ok ? r.json() : null)),
    ]).then(([list, user]) => {
      if (cancelled) return
      setCalls(list)
      setMe(user)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [candidateId])

  async function remove(call: CandidateCall) {
    if (!confirm(`Delete the call note from ${fmtDate(call.call_date)}?`)) return
    setDeleting(call.id)
    setError('')
    try {
      const res = await fetch(`/api/candidates/${candidateId}/calls/${call.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not delete the call.')
      setCalls(prev => prev.filter(c => c.id !== call.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the call.')
    } finally {
      setDeleting(null)
    }
  }

  const canDelete = (c: CandidateCall) => !!me && (me.is_admin || c.created_by === me.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {loading ? 'Loading...' : `${calls.length} call${calls.length === 1 ? '' : 's'} logged`}
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 bg-[#2AA3FF] hover:bg-[#1a8fe0] text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus size={14} /> Add call
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <PhoneCall size={14} className="text-[#2AA3FF]" /> New call
          </h3>
          <CallForm
            candidateId={candidateId}
            autoFocus
            onCancel={() => setAdding(false)}
            onSaved={call => {
              setCalls(prev => [call, ...prev].sort((a, b) => b.call_date.localeCompare(a.call_date) || b.created_at.localeCompare(a.created_at)))
              setAdding(false)
            }}
          />
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
          <Loader2 size={14} className="animate-spin" /> Loading calls...
        </div>
      ) : calls.length === 0 && !adding ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center text-sm text-gray-400">
          No calls logged yet. Use <span className="font-medium text-gray-600">Add call</span> to record one.
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-semibold text-gray-900 text-sm">{fmtDate(c.call_date)}</span>
                  {c.role && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                      <Briefcase size={10} /> {c.role.title}
                    </span>
                  )}
                  {c.created_by_email && <span className="text-gray-400">by {c.created_by_email}</span>}
                </div>
                {canDelete(c) && (
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    disabled={deleting === c.id}
                    title="Delete call"
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-none"
                  >
                    {deleting === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2 leading-relaxed">{c.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
