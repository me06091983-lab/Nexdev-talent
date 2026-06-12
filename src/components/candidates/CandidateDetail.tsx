'use client'

import { useState, useEffect, useCallback } from 'react'
import { CandidateForm } from './CandidateForm'
import { cn } from '@/lib/utils'
import { Clock, User, AlertCircle, RefreshCw, MessageSquare, ScrollText, StickyNote, Trash2 } from 'lucide-react'

const SUBMISSION_STATUS: Record<string, { label: string; cls: string }> = {
  pipeline:    { label: 'În recrutare',  cls: 'bg-slate-100 text-slate-700' },
  submitted:   { label: 'Propus client', cls: 'bg-blue-100 text-blue-700' },
  shortlisted: { label: 'Selectat',      cls: 'bg-purple-100 text-purple-700' },
  interview:   { label: 'Interviu',      cls: 'bg-amber-100 text-amber-700' },
  rejected:    { label: 'Respins',       cls: 'bg-red-100 text-red-600' },
  offer:       { label: 'Ofertă',        cls: 'bg-green-100 text-green-700' },
}

const ROLE_STATUS: Record<string, { label: string; cls: string }> = {
  active:  { label: 'Rol activ',   cls: 'bg-green-50 text-green-700 border border-green-200' },
  filled:  { label: 'Rol ocupat',  cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  on_hold: { label: 'On Hold',     cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  draft:   { label: 'Draft',       cls: 'bg-gray-50 text-gray-500 border border-gray-200' },
  closed:  { label: 'Rol închis',  cls: 'bg-red-50 text-red-600 border border-red-200' },
}

const CONTRACT_STATUS: Record<string, { label: string; cls: string }> = {
  activ:    { label: 'Activ',    cls: 'bg-green-100 text-green-700' },
  terminat: { label: 'Terminat', cls: 'bg-gray-100 text-gray-500' },
}

interface SubmissionEntry {
  id: string
  status: string
  created_at: string
  updated_at: string
  role: { id: string; title: string; status: string; client: { name: string } | null } | null
  rejection_reason: string | null
  last_feedback: string | null
}

interface ContractEntry {
  id: string
  contract_status: string
  start_date: string
  end_date: string | null
  bill_rate: number
  currency: string
  role_title: string | null
  role_id: string | null
}

interface HistoryData {
  submissions: SubmissionEntry[]
  contracts: ContractEntry[]
}

interface NoteEntry {
  id: string
  text: string
  created_at: string
}

interface CandidateDetailProps {
  initial: Record<string, unknown>
  candidateId: string
  candidateName: string
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string) {
  if (!iso) return 'dată necunoscută'
  const d = new Date(iso)
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
}

function parseNotes(raw: unknown): NoteEntry[] {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as NoteEntry[]
    return [{ id: 'legacy-0', text: raw, created_at: '' }]
  } catch {
    return [{ id: 'legacy-0', text: raw, created_at: '' }]
  }
}

// ─── Notes Panel ─────────────────────────────────────────────────────────────

function NotesPanel({ candidateId, initialNotesRaw }: { candidateId: string; initialNotesRaw: unknown }) {
  const [notes, setNotes] = useState<NoteEntry[]>(() => parseNotes(initialNotesRaw))
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function persistNotes(updated: NoteEntry[]) {
    await fetch(`/api/candidates/${candidateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: JSON.stringify(updated) }),
    })
  }

  async function addNote() {
    const trimmed = text.trim()
    if (!trimmed || saving) return
    setSaving(true)
    const entry: NoteEntry = { id: crypto.randomUUID(), text: trimmed, created_at: new Date().toISOString() }
    const updated = [entry, ...notes]
    await persistNotes(updated)
    setNotes(updated)
    setText('')
    setSaving(false)
  }

  async function deleteNote(id: string) {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    await persistNotes(updated)
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <textarea
          rows={3}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote() }}
          placeholder="Scrie o notă internă... (Ctrl+Enter pentru a salva)"
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2AA3FF] placeholder:text-gray-300 resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={addNote}
            disabled={saving || !text.trim()}
            className="px-4 py-2 bg-[#0B1A33] text-white text-sm font-medium rounded-xl hover:bg-[#162540] transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvez...' : 'Adaugă notă'}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-gray-400">
          Nicio notă adăugată pentru acest candidat.
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                  {note.created_at && (
                    <p className="text-[11px] text-gray-400 mt-2">{fmtDateTime(note.created_at)}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="flex-shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors rounded mt-0.5"
                  title="Șterge nota"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CandidateDetail({ initial, candidateId, candidateName }: CandidateDetailProps) {
  const [tab, setTab] = useState<'profil' | 'note' | 'istoric'>('profil')
  const [data, setData] = useState<HistoryData>({ submissions: [], contracts: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/candidates/${candidateId}/history`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Eroare server')
      setData({ submissions: json.submissions ?? [], contracts: json.contracts ?? [] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea datelor')
    } finally {
      setLoading(false)
    }
  }, [candidateId])

  useEffect(() => {
    if (tab === 'istoric') fetchHistory()
  }, [tab, fetchHistory])

  useEffect(() => {
    if (tab !== 'istoric') return
    const onFocus = () => fetchHistory()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [tab, fetchHistory])

  const totalCount = data.submissions.length + data.contracts.length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {tab === 'profil' ? 'Editează:' : tab === 'note' ? 'Note interne:' : 'Istoric:'} {candidateName}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('profil')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'profil' ? 'bg-white text-[#0B1A33] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <User size={15} /> Profil
        </button>
        <button
          onClick={() => setTab('note')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'note' ? 'bg-white text-[#0B1A33] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <StickyNote size={15} /> Note interne
        </button>
        <button
          onClick={() => setTab('istoric')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'istoric' ? 'bg-white text-[#0B1A33] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Clock size={15} /> Istoric & Contracte
          {totalCount > 0 && (
            <span className="ml-1 text-xs bg-[#2AA3FF]/10 text-[#2AA3FF] px-1.5 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'profil' && (
        <div className="glass rounded-2xl p-8">
          <CandidateForm initial={initial} candidateId={candidateId} />
        </div>
      )}

      {tab === 'note' && (
        <NotesPanel candidateId={candidateId} initialNotesRaw={initial.notes} />
      )}

      {tab === 'istoric' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {!loading && `${data.submissions.length} roluri · ${data.contracts.length} contracte`}
            </p>
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Reîncarcă
            </button>
          </div>

          {loading && data.submissions.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-sm text-gray-400">Se încarcă...</div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* ── Contracte ── */}
          {data.contracts.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3 px-1">
                <ScrollText size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">Contracte</h2>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="space-y-2">
                {data.contracts.map(c => {
                  const cs = CONTRACT_STATUS[c.contract_status] ?? { label: c.contract_status, cls: 'bg-gray-100 text-gray-600' }
                  const isActive = c.contract_status === 'activ'
                  return (
                    <div key={c.id} className={cn(
                      'glass rounded-2xl p-4 flex items-center justify-between gap-4',
                      isActive && 'border border-green-100 bg-green-50/30'
                    )}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">
                            {c.role_title ?? 'Contract'}
                          </span>
                          <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', cs.cls)}>
                            {cs.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500">
                          <span>Start: <span className="font-medium text-gray-700">{fmtDate(c.start_date)}</span></span>
                          {c.end_date && (
                            <span>End: <span className="font-medium text-gray-700">{fmtDate(c.end_date)}</span></span>
                          )}
                          {!c.end_date && <span className="text-green-600 font-medium">Nedeterminat</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{c.bill_rate} {c.currency}</p>
                        <p className="text-[10px] text-gray-400">bill rate / zi</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Roluri (submisii) ── */}
          <div>
            <div className="flex items-center gap-3 mb-3 px-1">
              <Clock size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Roluri aplicate</h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {!loading && !error && data.submissions.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center text-sm text-gray-400">
                Candidatul nu a fost propus pentru niciun rol încă.
              </div>
            )}

            <div className="space-y-2">
              {data.submissions.map(entry => {
                const subStatus = SUBMISSION_STATUS[entry.status] ?? { label: entry.status, cls: 'bg-gray-100 text-gray-600' }
                const roleStatus = entry.role?.status ? (ROLE_STATUS[entry.role.status] ?? null) : null
                const isRejected = entry.status === 'rejected'
                const feedbackToShow = isRejected
                  ? (entry.rejection_reason ?? entry.last_feedback)
                  : entry.last_feedback

                return (
                  <div key={entry.id} className={cn(
                    'glass rounded-2xl p-4',
                    isRejected && 'border border-red-100'
                  )}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <a
                            href={`/roles/${entry.role?.id}/pipeline`}
                            className="font-medium text-gray-900 hover:text-[#2AA3FF] transition-colors text-sm"
                          >
                            {entry.role?.title ?? 'Rol necunoscut'}
                          </a>
                          {entry.role?.client?.name && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {entry.role.client.name}
                            </span>
                          )}
                          {roleStatus && (
                            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', roleStatus.cls)}>
                              {roleStatus.label}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-1">
                          <span>Aplicat: <span className="text-gray-600 font-medium">{fmtDate(entry.created_at)}</span></span>
                          {entry.created_at !== entry.updated_at && (
                            <span>Actualizat: <span className="text-gray-600 font-medium">{fmtDate(entry.updated_at)}</span></span>
                          )}
                        </div>

                        {feedbackToShow && (
                          <div className={cn(
                            'flex items-start gap-2 text-xs rounded-lg px-3 py-2 mt-2',
                            isRejected ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
                          )}>
                            <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                            <span className="italic">{feedbackToShow}</span>
                          </div>
                        )}
                      </div>

                      <span className={cn('text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0', subStatus.cls)}>
                        {subStatus.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
