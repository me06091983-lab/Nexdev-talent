'use client'

import { useState, useEffect, useCallback } from 'react'
import { CandidateForm } from './CandidateForm'
import { cn } from '@/lib/utils'
import { Clock, User, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pipeline:    { label: 'În recrutare',  cls: 'bg-slate-100 text-slate-700' },
  submitted:   { label: 'Propus client', cls: 'bg-blue-100 text-blue-700' },
  shortlisted: { label: 'Selectat',      cls: 'bg-purple-100 text-purple-700' },
  interview:   { label: 'Interviu',      cls: 'bg-amber-100 text-amber-700' },
  rejected:    { label: 'Respins',       cls: 'bg-red-100 text-red-600' },
  offer:       { label: 'Ofertă',        cls: 'bg-green-100 text-green-700' },
}

interface StageEntry {
  stage_name: string
  result: string | null
  feedback: string | null
  created_at: string
}

interface HistoryEntry {
  id: string
  status: string
  created_at: string
  updated_at: string
  role: { id: string; title: string; client: { name: string } | null } | null
  rejection_reason: string | null
  last_feedback: string | null
  stage_history: StageEntry[]
}

interface CandidateDetailProps {
  initial: Record<string, unknown>
  candidateId: string
  candidateName: string
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function CandidateDetail({ initial, candidateId, candidateName }: CandidateDetailProps) {
  const [tab, setTab] = useState<'profil' | 'istoric'>('profil')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const res = await fetch(`/api/candidates/${candidateId}/history`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Eroare server')
      setHistory(Array.isArray(data) ? data : [])
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Eroare la încărcarea istoricului')
    } finally {
      setHistoryLoading(false)
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {tab === 'profil' ? 'Editează:' : 'Istoric:'} {candidateName}
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
          onClick={() => setTab('istoric')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'istoric' ? 'bg-white text-[#0B1A33] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Clock size={15} /> Istoric roluri
          {history.length > 0 && (
            <span className="ml-1 text-xs bg-[#2AA3FF]/10 text-[#2AA3FF] px-1.5 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'profil' && (
        <div className="glass rounded-2xl p-8">
          <CandidateForm initial={initial} candidateId={candidateId} />
        </div>
      )}

      {tab === 'istoric' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {!historyLoading && `${history.length} ${history.length === 1 ? 'rol' : 'roluri'} în istoric`}
            </p>
            <button
              onClick={fetchHistory}
              disabled={historyLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} />
              Reîncarcă
            </button>
          </div>

          {historyLoading && history.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-sm text-gray-400">Se încarcă...</div>
          )}

          {historyError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={16} /> {historyError}
            </div>
          )}

          {!historyLoading && !historyError && history.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-sm text-gray-400">
              Candidatul nu a fost propus pentru niciun rol încă.
            </div>
          )}

          {history.map(entry => {
            const statusInfo = STATUS_LABEL[entry.status] ?? { label: entry.status, cls: 'bg-gray-100 text-gray-600' }
            const isRejected = entry.status === 'rejected'
            const feedbackToShow = isRejected
              ? (entry.rejection_reason ?? entry.last_feedback)
              : entry.last_feedback

            return (
              <div key={entry.id} className={cn(
                'glass rounded-2xl p-5',
                isRejected && 'border border-red-100'
              )}>
                <div className="flex items-start justify-between gap-4">
                  {/* Left: role info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <a
                        href={`/roles/${entry.role?.id}/pipeline`}
                        className="font-semibold text-gray-900 hover:text-[#2AA3FF] transition-colors"
                      >
                        {entry.role?.title ?? 'Rol necunoscut'}
                      </a>
                      {entry.role?.client?.name && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {entry.role.client.name}
                        </span>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-2">
                      <span>Aplicat: <span className="text-gray-600 font-medium">{fmt(entry.created_at)}</span></span>
                      {entry.created_at !== entry.updated_at && (
                        <span>Ultima actualizare: <span className="text-gray-600 font-medium">{fmt(entry.updated_at)}</span></span>
                      )}
                    </div>

                    {/* Feedback / rejection reason */}
                    {feedbackToShow && (
                      <div className={cn(
                        'flex items-start gap-2 text-sm rounded-lg px-3 py-2 mt-2',
                        isRejected ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
                      )}>
                        <MessageSquare size={13} className="mt-0.5 flex-shrink-0" />
                        <span className="italic">{feedbackToShow}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: status badge */}
                  <span className={cn('text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0', statusInfo.cls)}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
