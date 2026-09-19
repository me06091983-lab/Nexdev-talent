'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export interface CandidateCall {
  id: string
  call_date: string
  notes: string
  created_by: string | null
  created_by_email: string | null
  created_at: string
  role: { id: string; title: string } | null
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CallForm({
  candidateId,
  roleId,
  onSaved,
  onCancel,
  autoFocus,
}: {
  candidateId: string
  roleId?: string | null
  onSaved: (call: CandidateCall) => void
  onCancel: () => void
  autoFocus?: boolean
}) {
  const [callDate, setCallDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!callDate) { setError('Pick the call date.'); return }
    if (!notes.trim()) { setError('Write some notes about the call.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/candidates/${candidateId}/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_date: callDate, notes, role_id: roleId ?? null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save the call.')
      onSaved(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the call.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Call date</label>
        <input
          type="date"
          value={callDate}
          onChange={e => setCallDate(e.target.value)}
          className="glass-input px-3 py-2 rounded-lg text-sm w-48"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          autoFocus={autoFocus}
          rows={5}
          placeholder="What did you discuss? Availability, expectations, motivation, next steps..."
          className="glass-input w-full px-3 py-2 rounded-lg text-sm resize-y"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#2AA3FF] hover:bg-[#1a8fe0] disabled:opacity-60 text-white font-medium px-5 py-2 rounded-xl text-sm transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving...' : 'Save call'}
        </button>
      </div>
    </div>
  )
}
