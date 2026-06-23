'use client'

import { useState } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronRight, Plus, Check, User, FileText, X } from 'lucide-react'
import { CandidateViewModal } from '@/components/candidates/CandidateViewModal'
import { CandidateCVModal } from '@/components/candidates/CandidateCVModal'

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'RON']
const RATE_TYPE_OPTIONS = [
  { value: 'daily', label: '/day' },
  { value: 'hourly', label: '/hour' },
]

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

export interface AddCandidateParams {
  candidateId: string
  rate?: number | null
  currency: string
  rateType: string
  aiScore: number
  aiSummary: string
}

interface Props {
  roleId: string
  onAddCandidate: (params: AddCandidateParams) => Promise<void> | void
  onClose?: () => void
}

function ScoreCircle({ score }: { score: number }) {
  const cls = score >= 75
    ? 'border-[#2AA3FF] text-[#2AA3FF] bg-blue-50/40'
    : score >= 55
    ? 'border-amber-400 text-amber-600 bg-amber-50/40'
    : 'border-red-400 text-red-500 bg-red-50/40'
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
          Wished: <span className="text-amber-600 font-semibold">{wish} {cur}</span>
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
      const msg = e instanceof Error ? e.message : 'Error adding'
      if (msg.includes('deja în pipeline') || msg.includes('already in pipeline')) {
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
              <span key={s} className="text-[10px] bg-blue-50 text-[#2AA3FF] border border-blue-100 px-1.5 py-0.5 rounded" title="Covered criteria">✓ {s}</span>
            ))}
            {item.missing_skills.slice(0, 2).map(s => (
              <span key={s} className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded" title="Weak criteria">✗ {s}</span>
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
            title="Add to pipeline"
          >
            {adding ? <Loader2 size={11} className="animate-spin" /> : added ? <Check size={11} /> : <Plus size={11} />}
            {added ? 'Added' : 'Add'}
          </button>
        )}

        {/* View profile */}
        {onViewProfile && (
          <button
            onClick={onViewProfile}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-[#2AA3FF] hover:text-[#2AA3FF] transition-colors"
            title="Candidate profile"
          >
            <User size={11} /> Profile
          </button>
        )}

        {/* View CV */}
        {onViewCV && (
          <button
            onClick={onViewCV}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
            title="View CV"
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

export function AIMatchPanel({ roleId, onAddCandidate, onClose }: Props) {
  const [data, setData] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewProfileId, setViewProfileId] = useState<string | null>(null)
  const [viewCV, setViewCV] = useState<{ id: string; name: string } | null>(null)

  // Rate submisie — shared pentru toți candidații din panel
  const [submissionRate, setSubmissionRate] = useState('')
  const [submissionCurrency, setSubmissionCurrency] = useState('EUR')
  const [submissionRateType, setSubmissionRateType] = useState('daily')

  async function runMatch() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/roles/${roleId}/match`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'AI matching error')
      setData(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#2AA3FF]" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI Matching</h3>
              <p className="text-[10px] text-gray-400 leading-tight">based on Rubix Matrix</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runMatch}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2AA3FF] text-white text-xs font-medium rounded-xl hover:bg-[#2AA3FF]/90 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {loading ? 'Analysing...' : data ? 'Re-analyse' : 'Analyse'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Rate submisie */}
        <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Submission rate</label>
          <div className="flex gap-1.5">
            <input
              type="number"
              min="0"
              step="0.01"
              value={submissionRate}
              onChange={e => setSubmissionRate(e.target.value)}
              placeholder="0.00"
              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50"
            />
            <select
              value={submissionCurrency}
              onChange={e => setSubmissionCurrency(e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50"
            >
              {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={submissionRateType}
              onChange={e => setSubmissionRateType(e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50"
            >
              {RATE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        {data && (
          <div className="space-y-4">
            {data.pipeline_scored.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  In pipeline ({data.pipeline_scored.length})
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
                  Matching candidates ({data.discovered.length})
                </p>
                <div className="space-y-2">
                  {data.discovered.map(item => (
                    <MatchCard
                      key={item.candidate_id}
                      item={item}
                      onAdd={item.candidate_id
                        ? async () => {
                            await onAddCandidate({
                              candidateId: item.candidate_id!,
                              rate: submissionRate ? parseFloat(submissionRate) : null,
                              currency: submissionCurrency,
                              rateType: submissionRateType,
                              aiScore: item.score,
                              aiSummary: item.summary,
                            })
                          }
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
              <p className="text-xs text-gray-400 text-center py-4">No matching candidates found.</p>
            )}
          </div>
        )}

        {!data && !loading && (
          <p className="text-xs text-gray-400 text-center py-6">
            Click &quot;Analyse&quot; to find matching candidates using AI.
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
