'use client'

import { useState } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronRight, Plus, Check, User, FileText } from 'lucide-react'
import { CandidateViewModal } from '@/components/candidates/CandidateViewModal'
import { CandidateCVModal } from '@/components/candidates/CandidateCVModal'

interface MatchResult {
  candidate_id?: string
  candidate_name: string
  submission_id?: string
  score: number
  matched_skills: string[]
  missing_skills: string[]
  summary: string
  rate_min?: number | null
  rate_wish?: number | null
  currency?: string
  cv_file_path?: string | null
}

interface MatchData {
  pipeline_scored: MatchResult[]
  discovered: MatchResult[]
}

interface Props {
  roleId: string
  onAddCandidate: (candidateId: string) => Promise<void> | void
}

function ScoreCircle({ score }: { score: number }) {
  const cls = score >= 85
    ? 'border-green-400 text-green-600'
    : score >= 60
    ? 'border-yellow-400 text-yellow-600'
    : 'border-red-400 text-red-500'
  return (
    <div className={`w-11 h-11 rounded-full border-[3px] flex items-center justify-center flex-shrink-0 ${cls}`}>
      <span className="text-xs font-bold leading-none">{score}%</span>
    </div>
  )
}

function RateBadge({ min, wish, currency }: { min?: number | null; wish?: number | null; currency?: string }) {
  if (!min && !wish) return null
  const cur = currency ?? 'EUR'
  return (
    <div className="flex items-center gap-2 mt-1">
      {min && (
        <span className="text-[10px] text-gray-400">
          Min: <span className="text-gray-600 font-medium">{min} {cur}</span>
        </span>
      )}
      {wish && (
        <span className="text-[10px] text-gray-400">
          Dorit: <span className="text-amber-600 font-semibold">{wish} {cur}</span>
        </span>
      )}
    </div>
  )
}

function MatchCard({
  item,
  onAdd,
  onViewProfile,
  onViewCV,
}: {
  item: MatchResult
  onAdd?: () => Promise<void>
  onViewProfile?: () => void
  onViewCV?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [addError, setAddError] = useState('')

  async function handleAdd() {
    if (!onAdd || adding || added) return
    setAdding(true)
    setAddError('')
    try {
      await onAdd()
      setAdded(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Eroare la adăugare'
      if (msg.includes('deja în pipeline')) {
        setAdded(true)
      } else {
        setAddError(msg)
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl p-3 bg-white hover:shadow-sm transition-shadow">
      {/* Top row: score + name + rate + action buttons */}
      <div className="flex items-start gap-2.5">
        <ScoreCircle score={Math.round(item.score)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.candidate_name}</p>
          <RateBadge min={item.rate_min} wish={item.rate_wish} currency={item.currency} />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.matched_skills.slice(0, 3).map(s => (
              <span key={s} className="text-[10px] bg-green-50 text-green-700 border border-green-100 px-1.5 py-0.5 rounded">{s}</span>
            ))}
            {item.missing_skills.slice(0, 2).map(s => (
              <span key={s} className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded line-through">{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-50">
        {/* Add to pipeline */}
        {onAdd && (
          <button
            onClick={handleAdd}
            disabled={adding || added}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
              added
                ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                : 'bg-[#0B1A33] text-white hover:bg-[#0B1A33]/90 disabled:opacity-60'
            }`}
            title="Adaugă în pipeline"
          >
            {adding ? <Loader2 size={11} className="animate-spin" /> : added ? <Check size={11} /> : <Plus size={11} />}
            {added ? 'Adăugat' : 'Adaugă'}
          </button>
        )}

        {/* View profile */}
        {onViewProfile && (
          <button
            onClick={onViewProfile}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-[#2AA3FF] hover:text-[#2AA3FF] transition-colors"
            title="Profil candidat"
          >
            <User size={11} /> Profil
          </button>
        )}

        {/* View CV */}
        {onViewCV && (
          <button
            onClick={onViewCV}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
            title="Vizualizează CV"
          >
            <FileText size={11} /> CV
          </button>
        )}

        {/* Expand summary */}
        <button
          onClick={() => setOpen(v => !v)}
          className="ml-auto p-1 text-gray-300 hover:text-gray-500 rounded transition-colors"
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
      </div>

      {addError && (
        <p className="mt-1.5 text-[10px] text-red-500">{addError}</p>
      )}

      {open && item.summary && (
        <p className="mt-2 text-xs text-gray-500 leading-relaxed border-t border-gray-50 pt-2">{item.summary}</p>
      )}
    </div>
  )
}

export function AIMatchPanel({ roleId, onAddCandidate }: Props) {
  const [data, setData] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewProfileId, setViewProfileId] = useState<string | null>(null)
  const [viewCV, setViewCV] = useState<{ id: string; name: string } | null>(null)

  async function runMatch() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/roles/${roleId}/match`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Eroare AI matching')
      setData(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eroare necunoscută')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white/60 backdrop-blur rounded-2xl border border-gray-200 p-4 overflow-y-auto max-h-[calc(100vh-140px)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#2AA3FF]" />
            <h3 className="text-sm font-semibold text-gray-900">AI Matching</h3>
          </div>
          <button
            onClick={runMatch}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2AA3FF] text-white text-xs font-medium rounded-xl hover:bg-[#2AA3FF]/90 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {loading ? 'Analizez...' : data ? 'Re-analizează' : 'Analizează'}
          </button>
        </div>

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        {data && (
          <div className="space-y-4">
            {data.pipeline_scored.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  În pipeline ({data.pipeline_scored.length})
                </p>
                <div className="space-y-2">
                  {data.pipeline_scored.map(item => (
                    <MatchCard
                      key={item.submission_id ?? item.candidate_id}
                      item={item}
                      onViewProfile={item.candidate_id ? () => setViewProfileId(item.candidate_id!) : undefined}
                      onViewCV={item.candidate_id ? () => setViewCV({ id: item.candidate_id!, name: item.candidate_name }) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {data.discovered.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  Candidați potriviți ({data.discovered.length})
                </p>
                <div className="space-y-2">
                  {data.discovered.map(item => (
                    <MatchCard
                      key={item.candidate_id}
                      item={item}
                      onAdd={item.candidate_id
                        ? async () => { await onAddCandidate(item.candidate_id!) }
                        : undefined
                      }
                      onViewProfile={item.candidate_id ? () => setViewProfileId(item.candidate_id!) : undefined}
                      onViewCV={item.candidate_id ? () => setViewCV({ id: item.candidate_id!, name: item.candidate_name }) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {data.pipeline_scored.length === 0 && data.discovered.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Nu s-au găsit candidați potriviți.</p>
            )}
          </div>
        )}

        {!data && !loading && (
          <p className="text-xs text-gray-400 text-center py-6">
            Apasă &quot;Analizează&quot; pentru a găsi candidații potriviți cu AI.
          </p>
        )}
      </div>

      {/* Left-side popups */}
      {viewProfileId && (
        <CandidateViewModal
          candidateId={viewProfileId}
          onClose={() => setViewProfileId(null)}
          leftPanel
        />
      )}
      {viewCV && (
        <CandidateCVModal
          candidateId={viewCV.id}
          candidateName={viewCV.name}
          onClose={() => setViewCV(null)}
        />
      )}
    </>
  )
}
