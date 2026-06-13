'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CandidateForm } from './CandidateForm'
import { cn } from '@/lib/utils'
import {
  Clock, User, AlertCircle, RefreshCw, MessageSquare, ScrollText,
  Trash2, FileDown, Loader2, MapPin, Briefcase, ExternalLink,
  FileText, StickyNote, Upload, CheckCircle, Sparkles, X, Eye,
} from 'lucide-react'
import { CandidateCVModal } from './CandidateCVModal'
import type { ParsedCvData } from './CandidateForm'

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

const CANDIDATE_STATUS_INFO: Record<string, { label: string; cls: string }> = {
  activ:     { label: 'Activ',      cls: 'bg-green-100 text-green-700 border border-green-200' },
  pasiv:     { label: 'Pasiv',      cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  angajat:   { label: 'Angajat',    cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
  blacklist: { label: 'Black List', cls: 'bg-red-100 text-red-600 border border-red-200' },
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
    <div className="space-y-3">
      <div>
        <textarea
          rows={2}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote() }}
          placeholder="Notă internă... (Ctrl+Enter)"
          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2AA3FF] placeholder:text-gray-300 resize-none bg-gray-50/50"
        />
        <div className="flex justify-end mt-1.5">
          <button
            onClick={addNote}
            disabled={saving || !text.trim()}
            className="px-3 py-1.5 bg-[#0B1A33] text-white text-xs font-medium rounded-lg hover:bg-[#162540] transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvez...' : 'Adaugă'}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">Nicio notă adăugată.</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
          {notes.map(note => (
            <div key={note.id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                  {note.created_at && (
                    <p className="text-[10px] text-gray-400 mt-1">{fmtDateTime(note.created_at)}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="flex-shrink-0 p-0.5 text-gray-300 hover:text-red-400 transition-colors rounded mt-0.5"
                  title="Șterge nota"
                >
                  <Trash2 size={11} />
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
  const router = useRouter()
  const [tab, setTab] = useState<'profil' | 'istoric'>('profil')
  const [data, setData] = useState<HistoryData>({ submissions: [], contracts: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatingCV, setGeneratingCV] = useState(false)
  const [saving, setSaving] = useState(false)

  // CV state — managed here, passed down to CandidateForm
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvFileName, setCvFileName] = useState('')
  const [cvFilePath, setCvFilePath] = useState<string>((initial?.cv_file_path as string) ?? '')
  const [cvUploading, setCvUploading] = useState(false)
  const [cvParsing, setCvParsing] = useState(false)
  const [cvParsed, setCvParsed] = useState(false)
  const [cvError, setCvError] = useState('')
  const [showCvPreview, setShowCvPreview] = useState(false)
  const [parsedCvData, setParsedCvData] = useState<ParsedCvData | null>(null)

  async function handleCvFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCvFile(file)
    setCvFileName(file.name)
    setCvParsed(false)
    setCvError('')
    setCvUploading(true)
    try {
      const fd = new FormData()
      fd.append('cv', file)
      const res = await fetch('/api/cv-upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCvFilePath(data.path)
    } catch (err) {
      setCvError(err instanceof Error ? err.message : 'Eroare la încărcarea fișierului')
      setCvFile(null)
      setCvFileName('')
    } finally {
      setCvUploading(false)
    }
  }

  function handleClearCv() {
    setCvFile(null)
    setCvFileName('')
    setCvFilePath('')
    setCvParsed(false)
    setParsedCvData(null)
  }

  async function handleCvParse() {
    if (!cvFile && !cvFilePath) return
    setCvParsing(true)
    setCvParsed(false)
    setCvError('')
    try {
      let res: Response
      if (cvFile) {
        const fd = new FormData()
        fd.append('cv', cvFile)
        res = await fetch('/api/cv-parse', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/cv-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: cvFilePath }),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setParsedCvData({ ...data, _ts: Date.now() } as ParsedCvData)
      setCvParsed(true)
    } catch (err) {
      setCvError(err instanceof Error ? err.message : 'Eroare la parsarea CV-ului')
    } finally {
      setCvParsing(false)
    }
  }

  async function handleGenerateCV() {
    setGeneratingCV(true)
    try {
      const res = await fetch(`/api/candidates/${candidateId}/generate-cv`, { method: 'POST' })
      if (!res.ok) throw new Error('Eroare la generare')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CV_${candidateName.replace(/\s+/g, '_')}_NexDev.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Eroare la generarea CV-ului. Încearcă din nou.')
    } finally {
      setGeneratingCV(false)
    }
  }

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

  useEffect(() => { fetchHistory() }, [fetchHistory])

  useEffect(() => {
    const onFocus = () => fetchHistory()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchHistory])

  // Derived display values from saved data (header always shows saved state)
  const firstName = (initial.first_name as string) || ''
  const lastName = (initial.last_name as string) || ''
  const profileName = (initial as { profile?: { name?: string } })?.profile?.name ?? ''
  const location = (initial.location as string) || ''
  const seniority = (initial.seniority as string) || ''
  const linkedinUrl = (initial.linkedin_url as string) || ''
  const candidateStatus = (initial.candidate_status as string) || 'pasiv'
  const statusInfo = CANDIDATE_STATUS_INFO[candidateStatus] ?? CANDIDATE_STATUS_INFO.pasiv
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?'
  const totalCount = data.submissions.length + data.contracts.length

  return (
    <div>

      {/* ── Sticky header bar ── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-gray-100 -mx-6 px-6 py-3 mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            ← Candidați
          </button>
          <span className="text-gray-300 flex-shrink-0">/</span>
          <h1 className="text-base font-semibold text-gray-900 truncate">{candidateName}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Anulează
          </button>
          <button
            type="submit"
            form="candidate-form"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#2AA3FF] hover:bg-[#1a8fe0] disabled:opacity-60 text-white font-medium px-5 py-2 rounded-xl text-sm transition-colors shadow-sm"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Se salvează...' : 'Salvează modificările'}
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-[1fr_340px] gap-6 items-start">

        {/* ─────────── LEFT COLUMN ─────────── */}
        <div className="space-y-5">

          {/* Profile header card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#0B1A33] text-white text-xl font-bold flex items-center justify-center flex-shrink-0 select-none">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900">{firstName} {lastName}</h2>
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', statusInfo.cls)}>
                    {statusInfo.label}
                  </span>
                </div>
                {profileName && (
                  <p className="text-sm text-gray-500 mt-0.5">{profileName}</p>
                )}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {location && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={11} /> {location}
                    </span>
                  )}
                  {seniority && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Briefcase size={11} />
                      {seniority.charAt(0).toUpperCase() + seniority.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setTab('profil')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === 'profil' ? 'bg-white text-[#0B1A33] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <User size={14} /> Editează profil
            </button>
            <button
              onClick={() => setTab('istoric')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === 'istoric' ? 'bg-white text-[#0B1A33] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Clock size={14} /> Istoric & Contracte
              {totalCount > 0 && (
                <span className="ml-0.5 text-xs bg-[#2AA3FF]/10 text-[#2AA3FF] px-1.5 py-0.5 rounded-full">
                  {totalCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Profil tab: all form fields ── */}
          {tab === 'profil' && (
            <div className="glass rounded-2xl p-6 shadow-sm">
              <CandidateForm
                initial={initial}
                candidateId={candidateId}
                onSavingChange={setSaving}
                cvFilePath={cvFilePath}
                parsedCvData={parsedCvData}
              />
            </div>
          )}

          {/* ── Istoric tab ── */}
          {tab === 'istoric' && (
            <div className="space-y-5">
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
                <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 border border-gray-100">
                  Se încarcă...
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {/* Contracte */}
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
                          'bg-white rounded-2xl p-4 flex items-center justify-between gap-4 border',
                          isActive ? 'border-green-100 bg-green-50/30' : 'border-gray-100'
                        )}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">{c.role_title ?? 'Contract'}</span>
                              <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', cs.cls)}>{cs.label}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-500">
                              <span>Start: <span className="font-medium text-gray-700">{fmtDate(c.start_date)}</span></span>
                              {c.end_date && <span>End: <span className="font-medium text-gray-700">{fmtDate(c.end_date)}</span></span>}
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

              {/* Roluri aplicate */}
              <div>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <Clock size={14} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-700">Roluri aplicate</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {!loading && !error && data.submissions.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 border border-gray-100">
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
                        'bg-white rounded-2xl p-4 border',
                        isRejected ? 'border-red-100' : 'border-gray-100'
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

        {/* ─────────── RIGHT SIDEBAR ─────────── */}
        <div className="space-y-4 sticky top-[68px]">

          {/* Status card */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Status candidat</h3>
            <span className={cn('inline-flex text-sm font-semibold px-3 py-1.5 rounded-xl border', statusInfo.cls)}>
              {statusInfo.label}
            </span>
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              {candidateStatus === 'activ'     && 'Candidat activ în proces de recrutare.'}
              {candidateStatus === 'pasiv'     && 'În baza de date, fără proces activ.'}
              {candidateStatus === 'angajat'   && 'Candidat plasat cu succes.'}
              {candidateStatus === 'blacklist' && 'Candidat blocat — nu apare în pipeline.'}
            </p>
          </div>

          {/* LinkedIn */}
          {linkedinUrl && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">LinkedIn</h3>
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#2AA3FF] hover:underline"
              >
                <ExternalLink size={13} className="flex-shrink-0" />
                <span className="text-xs truncate">
                  {linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '') || linkedinUrl}
                </span>
              </a>
            </div>
          )}

          {/* CV & Documente — toate opțiunile CV într-un singur card */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">CV & Documente</h3>

            {/* Fișier curent */}
            {(cvFileName || cvFilePath) ? (
              <div className="flex items-center gap-2 mb-2 bg-blue-50 rounded-xl px-3 py-2">
                <FileText size={13} className="text-blue-500 flex-shrink-0" />
                <span className="text-xs text-blue-700 truncate flex-1">
                  {cvFileName || cvFilePath.split('/').pop()}
                </span>
                {cvUploading && <Loader2 size={11} className="animate-spin text-blue-400 flex-shrink-0" />}
                {!cvUploading && cvFilePath && <CheckCircle size={11} className="text-green-500 flex-shrink-0" />}
                {!cvUploading && (
                  <button type="button" onClick={handleClearCv}
                    className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={11} />
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-2">Niciun CV client încărcat.</p>
            )}

            {cvParsed && (
              <div className="flex items-center gap-1.5 text-green-700 text-xs font-medium mb-2 px-1">
                <CheckCircle size={11} /> Câmpurile au fost completate din CV
              </div>
            )}

            {cvError && (
              <p className="text-xs text-red-500 mb-2 px-1">{cvError}</p>
            )}

            {/* Butoane CV */}
            <div className="space-y-2 mt-1">
              {/* Upload / Înlocuiește */}
              <label className={cn(
                'flex items-center justify-center gap-2 cursor-pointer w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors border',
                cvUploading
                  ? 'bg-blue-50 border-blue-200 text-blue-400 cursor-not-allowed'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-[#2AA3FF] hover:text-[#2AA3FF]'
              )}>
                {cvUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {cvUploading ? 'Se încarcă...' : (cvFilePath ? 'Înlocuiește CV client' : 'Încarcă CV client')}
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleCvFileSelect}
                  disabled={cvUploading || cvParsing}
                  className="hidden"
                />
              </label>

              {/* Populează automat */}
              {(cvFilePath || cvFile) && !cvUploading && (
                <button
                  type="button"
                  onClick={handleCvParse}
                  disabled={cvParsing}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                    cvParsing
                      ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  )}
                >
                  {cvParsing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {cvParsing ? 'Se parsează...' : 'Populează automat din CV'}
                </button>
              )}

              {/* Vizualizează CV client */}
              {cvFilePath && !cvUploading && (
                <button
                  type="button"
                  onClick={() => setShowCvPreview(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:border-[#2AA3FF] hover:text-[#2AA3FF] transition-colors"
                >
                  <Eye size={12} /> Vizualizează CV client
                </button>
              )}

              {/* Separator */}
              <div className="border-t border-gray-100 pt-1" />

              {/* Generează CV NexDev */}
              <button
                onClick={handleGenerateCV}
                disabled={generatingCV}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#0B1A33] text-white text-xs font-medium rounded-xl hover:bg-[#162540] transition-colors disabled:opacity-60"
              >
                {generatingCV ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
                {generatingCV ? 'Se generează...' : 'Generează CV NexDev'}
              </button>
            </div>
          </div>

          {/* CV preview modal */}
          {showCvPreview && cvFilePath && (
            <CandidateCVModal
              candidateId={candidateId}
              candidateName={candidateName}
              onClose={() => setShowCvPreview(false)}
            />
          )}

          {/* Notițe interne */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote size={13} className="text-amber-400" />
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Notițe interne</h3>
            </div>
            <NotesPanel candidateId={candidateId} initialNotesRaw={initial.notes} />
          </div>

          {/* Activitate recentă */}
          {(data.submissions.length > 0 || data.contracts.length > 0) && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-gray-400" />
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Activitate</h3>
                </div>
                <button
                  onClick={() => setTab('istoric')}
                  className="text-[11px] text-[#2AA3FF] hover:underline"
                >
                  Vezi tot →
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-500 mb-2">{error}</p>
              )}

              <div className="space-y-2.5">
                {data.submissions.slice(0, 5).map(entry => {
                  const subStatus = SUBMISSION_STATUS[entry.status] ?? { label: entry.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <div key={entry.id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {entry.role?.title ?? 'Rol necunoscut'}
                        </p>
                        {entry.role?.client?.name && (
                          <p className="text-[10px] text-gray-400 truncate">{entry.role.client.name}</p>
                        )}
                      </div>
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap', subStatus.cls)}>
                        {subStatus.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {data.contracts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-500">
                    {data.contracts.length} contract{data.contracts.length !== 1 ? 'e' : ''} active
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
