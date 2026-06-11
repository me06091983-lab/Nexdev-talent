'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import type { Submission } from './KanbanBoard'

export interface InterviewSlot {
  label: string
  enabled: boolean
  datetime: string
  status: 'waiting_customer' | 'set' | 'passed' | 'rejected'
  feedback: string
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

const STATUS_COLORS: Record<string, string> = {
  waiting_customer: 'text-gray-500 bg-gray-50 border-gray-200',
  set:              'text-blue-600 bg-blue-50 border-blue-200',
  passed:           'text-green-600 bg-green-50 border-green-200',
  rejected:         'text-red-600 bg-red-50 border-red-200',
}

function mergeSlots(saved: InterviewSlot[]): InterviewSlot[] {
  return DEFAULT_SLOTS.map((def, i) => ({ ...def, ...(saved[i] ?? {}) }))
}

interface Props {
  submission: Submission
  onClose: () => void
  onSaved: () => void
}

export function InterviewPanel({ submission, onClose, onSaved }: Props) {
  const [slots, setSlots] = useState<InterviewSlot[]>(() =>
    mergeSlots((submission.interviews ?? []) as InterviewSlot[])
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync if submission changes (different card selected)
  useEffect(() => {
    setSlots(mergeSlots((submission.interviews ?? []) as InterviewSlot[]))
    setSaved(false)
  }, [submission.id, submission.interviews])

  function update(idx: number, field: keyof InterviewSlot, value: unknown) {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviews: slots }),
      })
      if (res.ok) {
        setSaved(true)
        onSaved()
      }
    } finally {
      setSaving(false)
    }
  }

  const c = submission.candidate

  return (
    <div className="bg-white border-t-2 border-[#2AA3FF]/30 rounded-b-2xl shadow-lg">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60 rounded-t-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
            {c ? `${c.first_name[0]}${c.last_name[0]}`.toUpperCase() : '?'}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0B1A33]">
              {c ? `${c.first_name} ${c.last_name}` : 'Candidat'}
            </p>
            {c?.profile && <p className="text-xs text-gray-400">{c.profile.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600 font-medium">Salvat ✓</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1A33] text-white text-xs font-medium rounded-xl hover:bg-[#0B1A33]/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            Salvează
          </button>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Interview grid */}
      <div className="px-5 py-3">
        {/* Column headers */}
        <div className="grid grid-cols-[20px_120px_180px_160px_1fr] gap-3 mb-2 px-1">
          <div />
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Interviu</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Data și ora</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Feedback</div>
        </div>

        <div className="space-y-2">
          {slots.map((slot, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-[20px_120px_180px_160px_1fr] gap-3 items-center px-1 py-2 rounded-xl transition-colors ${
                slot.enabled ? 'bg-blue-50/40' : 'bg-gray-50/40'
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={slot.enabled}
                onChange={e => update(idx, 'enabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-[#2AA3FF] cursor-pointer"
              />

              {/* Label */}
              <span className={`text-sm font-medium ${slot.enabled ? 'text-[#0B1A33]' : 'text-gray-400'}`}>
                {slot.label}
              </span>

              {/* DateTime */}
              <input
                type="datetime-local"
                value={slot.datetime}
                onChange={e => update(idx, 'datetime', e.target.value)}
                disabled={!slot.enabled}
                className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/40 transition-opacity ${
                  slot.enabled
                    ? 'border-gray-200 bg-white text-gray-700'
                    : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                }`}
              />

              {/* Status */}
              <select
                value={slot.status}
                onChange={e => update(idx, 'status', e.target.value as InterviewSlot['status'])}
                disabled={!slot.enabled}
                className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/40 appearance-none font-medium transition-opacity ${
                  slot.enabled
                    ? STATUS_COLORS[slot.status]
                    : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                }`}
              >
                {INTERVIEW_STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Feedback */}
              <input
                type="text"
                value={slot.feedback}
                onChange={e => update(idx, 'feedback', e.target.value)}
                disabled={!slot.enabled}
                placeholder={slot.enabled ? 'Adaugă feedback...' : '—'}
                className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/40 transition-opacity ${
                  slot.enabled
                    ? 'border-gray-200 bg-white text-gray-700'
                    : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
