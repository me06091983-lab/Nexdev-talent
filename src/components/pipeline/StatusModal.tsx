'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, Plus, Trash2, CalendarDays } from 'lucide-react'
import { PIPELINE_STATUSES, type PipelineStatus } from '@/lib/pipeline'
import type { Submission } from './KanbanBoard'
import type { InterviewSlot } from './InterviewPanel'

interface Props {
  submission: Submission
  onClose: () => void
  onSaved: (submissionId: string, newStatus: PipelineStatus) => void
}

const INTERVIEW_STATUS_OPTIONS = [
  { value: 'waiting_customer', label: 'Waiting customer' },
  { value: 'set',              label: 'Set' },
  { value: 'pending_feedback', label: 'Pending Feedback' },
  { value: 'passed',           label: 'Passed' },
  { value: 'rejected',         label: 'Rejected' },
]

const SLOT_STATUS_COLORS: Record<string, string> = {
  waiting_customer: 'text-gray-500 bg-gray-50 border-gray-200',
  set:              'text-blue-600 bg-blue-50 border-blue-200',
  pending_feedback: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  passed:           'text-green-600 bg-green-50 border-green-200',
  rejected:         'text-red-600 bg-red-50 border-red-200',
}

function loadSlots(saved: InterviewSlot[]): InterviewSlot[] {
  return saved.filter(s => s.label || s.datetime || s.enabled)
}

// ─── DateTimePicker ───────────────────────────────────────────────────────────

function DateTimePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const dateRef = useRef<HTMLInputElement>(null)

  const datePart = value ? value.slice(0, 10) : ''
  const timePart = value && value.includes('T') ? value.slice(11, 16) : ''

  function handleDate(d: string) {
    const t = timePart || '09:00'
    onChange(d ? `${d}T${t}` : '')
  }

  function handleTime(t: string) {
    const d = datePart || new Date().toISOString().slice(0, 10)
    onChange(t ? `${d}T${t}` : '')
  }

  function openDatePicker() {
    if (dateRef.current) {
      if (typeof dateRef.current.showPicker === 'function') {
        dateRef.current.showPicker()
      } else {
        dateRef.current.focus()
      }
    }
  }

  return (
    <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus-within:ring-2 focus-within:ring-[#2AA3FF]/30 focus-within:border-[#2AA3FF]">
      <button
        type="button"
        onClick={openDatePicker}
        className="text-gray-400 hover:text-[#2AA3FF] transition-colors flex-shrink-0"
        title="Selectează data"
      >
        <CalendarDays size={13} />
      </button>
      <input
        ref={dateRef}
        type="date"
        value={datePart}
        onChange={e => handleDate(e.target.value)}
        className="text-xs text-gray-700 bg-transparent focus:outline-none w-[100px]"
      />
      <span className="text-gray-200 text-xs select-none">|</span>
      <input
        type="time"
        value={timePart}
        onChange={e => handleTime(e.target.value)}
        className="text-xs text-gray-700 bg-transparent focus:outline-none w-[60px]"
      />
    </div>
  )
}

// ─── StatusModal ─────────────────────────────────────────────────────────────

export function StatusModal({ submission, onClose, onSaved }: Props) {
  const [status, setStatus] = useState<PipelineStatus>(submission.status)
  const [slots, setSlots] = useState<InterviewSlot[]>(() =>
    loadSlots((submission.interviews ?? []) as InterviewSlot[])
  )
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setStatus(submission.status)
    setSlots(loadSlots((submission.interviews ?? []) as InterviewSlot[]))
    setFeedback('')
    setError('')
  }, [submission.id])

  const c = submission.candidate

  function addSlot() {
    setSlots(prev => [...prev, { label: '', enabled: true, datetime: '', status: 'waiting_customer', feedback: '', candidate_accepted: false }])
  }

  function removeSlot(idx: number) {
    setSlots(prev => prev.filter((_, i) => i !== idx))
  }

  function updateSlot(idx: number, field: keyof InterviewSlot, value: unknown) {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
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

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
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

          {/* Interview slots — dynamic */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Interviuri</label>
              <button
                type="button"
                onClick={addSlot}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#2AA3FF] border border-[#2AA3FF]/30 rounded-lg hover:bg-[#2AA3FF]/5 transition-colors"
              >
                <Plus size={12} />
                Adaugă interviu
              </button>
            </div>

            {slots.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-xl">
                Niciun interviu adăugat. Apasă &quot;Adaugă interviu&quot; pentru a programa unul.
              </p>
            ) : (
              <div className="space-y-3">
                {slots.map((slot, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-xl p-3 space-y-2.5 bg-gray-50/50">
                    {/* Row 1: label + delete */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={slot.label}
                        onChange={e => updateSlot(idx, 'label', e.target.value)}
                        placeholder="Tip interviu (ex: Interviu tehnic)"
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30 focus:border-[#2AA3FF] bg-white placeholder:text-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeSlot(idx)}
                        className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                        title="Șterge interviu"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Row 2: date+time + status */}
                    <div className="flex items-center gap-2">
                      <DateTimePicker
                        value={slot.datetime}
                        onChange={v => updateSlot(idx, 'datetime', v)}
                      />
                      <select
                        value={slot.status}
                        onChange={e => updateSlot(idx, 'status', e.target.value as InterviewSlot['status'])}
                        className={`flex-1 px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/40 appearance-none font-medium ${SLOT_STATUS_COLORS[slot.status]}`}
                      >
                        {INTERVIEW_STATUS_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Row 3: candidat acceptat */}
                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                      <input
                        type="checkbox"
                        checked={slot.candidate_accepted ?? false}
                        onChange={e => updateSlot(idx, 'candidate_accepted', e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 accent-green-500 cursor-pointer"
                      />
                      <span className={`text-xs font-medium ${slot.candidate_accepted ? 'text-green-600' : 'text-gray-500'}`}>
                        Candidat a acceptat interviul
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
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

        <div className="flex gap-2 px-5 pb-5 pt-2 flex-shrink-0">
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
