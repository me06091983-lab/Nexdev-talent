'use client'

import { useState, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { PIPELINE_STATUSES, type PipelineStatus } from '@/lib/pipeline'
import type { Submission } from './KanbanBoard'
import type { InterviewSlot } from './InterviewPanel'

interface Props {
  submission: Submission
  onClose: () => void
  onSaved: (submissionId: string, newStatus: PipelineStatus) => void
}

const DEFAULT_SLOTS: InterviewSlot[] = [
  { label: 'Interview 1', enabled: false, datetime: '', status: 'waiting_customer', feedback: '' },
  { label: 'Interview 2', enabled: false, datetime: '', status: 'waiting_customer', feedback: '' },
  { label: 'Interview 3', enabled: false, datetime: '', status: 'waiting_customer', feedback: '' },
  { label: 'Interview 4', enabled: false, datetime: '', status: 'waiting_customer', feedback: '' },
]

const INTERVIEW_STATUS_OPTIONS = [
  { value: 'waiting_customer', label: 'Waiting customer' },
  { value: 'set',              label: 'Set' },
  { value: 'passed',           label: 'Passed' },
  { value: 'rejected',         label: 'Rejected' },
]

const SLOT_STATUS_COLORS: Record<string, string> = {
  waiting_customer: 'text-gray-500 bg-gray-50 border-gray-200',
  set:              'text-blue-600 bg-blue-50 border-blue-200',
  passed:           'text-green-600 bg-green-50 border-green-200',
  rejected:         'text-red-600 bg-red-50 border-red-200',
}

function mergeSlots(saved: InterviewSlot[]): InterviewSlot[] {
  return DEFAULT_SLOTS.map((def, i) => ({ ...def, ...(saved[i] ?? {}) }))
}

export function StatusModal({ submission, onClose, onSaved }: Props) {
  const [status, setStatus] = useState<PipelineStatus>(submission.status)
  const [slots, setSlots] = useState<InterviewSlot[]>(() =>
    mergeSlots((submission.interviews ?? []) as InterviewSlot[])
  )
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setStatus(submission.status)
    setSlots(mergeSlots((submission.interviews ?? []) as InterviewSlot[]))
    setFeedback('')
    setError('')
  }, [submission.id])

  function updateSlot(idx: number, field: keyof InterviewSlot, value: unknown) {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const c = submission.candidate

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          interviews: slots,
          ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Eroare la salvare')
      }
      onSaved(submission.id, status)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eroare necunoscută')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
              {c ? `${c.first_name[0]}${c.last_name[0]}`.toUpperCase() : '?'}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">
                {c ? `${c.first_name} ${c.last_name}` : 'Candidat'}
              </h2>
              {c?.profile && <p className="text-xs text-gray-400">{c.profile.name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* AI Summary */}
          {submission.ai_summary && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
              <span className="font-semibold">AI: </span>{submission.ai_summary}
            </div>
          )}

          {/* Status pipeline */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Status pipeline</label>
            <div className="relative">
              <select
                value={status}
                onChange={e => setStatus(e.target.value as PipelineStatus)}
                className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50 bg-white"
              >
                {PIPELINE_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Interview slots */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Interviuri</label>
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-[18px_100px_1fr_140px] gap-2.5 px-1 mb-1">
                <div />
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide"></div>
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Data și ora</div>
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Status</div>
              </div>

              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-[18px_100px_1fr_140px] gap-2.5 items-center px-1 py-2 rounded-xl transition-colors ${
                    slot.enabled ? 'bg-blue-50/50' : 'bg-gray-50/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={slot.enabled}
                    onChange={e => updateSlot(idx, 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#2AA3FF] cursor-pointer"
                  />
                  <span className={`text-sm font-medium ${slot.enabled ? 'text-[#0B1A33]' : 'text-gray-400'}`}>
                    {slot.label}
                  </span>
                  <input
                    type="datetime-local"
                    value={slot.datetime}
                    onChange={e => updateSlot(idx, 'datetime', e.target.value)}
                    disabled={!slot.enabled}
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/40 transition-opacity ${
                      slot.enabled
                        ? 'border-gray-200 bg-white text-gray-700'
                        : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                    }`}
                  />
                  <select
                    value={slot.status}
                    onChange={e => updateSlot(idx, 'status', e.target.value as InterviewSlot['status'])}
                    disabled={!slot.enabled}
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/40 appearance-none font-medium transition-opacity ${
                      slot.enabled
                        ? SLOT_STATUS_COLORS[slot.status]
                        : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {INTERVIEW_STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Final note */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Notă / feedback</label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Adaugă un comentariu sau feedback general..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 text-sm bg-[#0B1A33] text-white rounded-xl font-medium hover:bg-[#0B1A33]/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvez...' : 'Salvează'}
          </button>
        </div>
      </div>
    </div>
  )
}
