'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Criterion {
  id: string
  order_index: number
  criterion: string
  weight: number
}

interface CandidateScore {
  submission_id: string
  candidate_name: string
  candidate_id: string
  has_scores: boolean
  overall_fit: number | null
  scores: Record<string, { score: number; evidence: string | null }>
}

interface RubixViewData {
  hasCriteria: boolean
  criteria: Criterion[]
  candidates: CandidateScore[]
}

function FitBadge({ fit }: { fit: number | null }) {
  if (fit === null) return <span className="text-xs text-gray-300">—</span>
  const cls = fit >= 75 ? 'text-green-700 bg-green-50 border-green-200'
    : fit >= 55 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200'
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-bold border', cls)}>
      {fit.toFixed(1)}%
    </span>
  )
}

function ScoreCell({ score, evidence, weight }: {
  score: number | undefined
  evidence: string | null | undefined
  weight: number
}) {
  const [showTip, setShowTip] = useState(false)

  if (score === undefined) {
    return <td className="px-3 py-2 text-center text-xs text-gray-200 border-l border-gray-100">—</td>
  }

  const weighted = (weight * score) / 5
  const cls = score >= 4 ? 'text-green-700' : score >= 3 ? 'text-amber-600' : score >= 1.5 ? 'text-orange-500' : 'text-red-500'

  return (
    <td className="px-2 py-1.5 text-center border-l border-gray-100 relative">
      <div
        className="inline-flex flex-col items-center gap-0.5 cursor-default"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        <span className={cn('text-sm font-bold tabular-nums', cls)}>{score}</span>
        <span className="text-[10px] text-gray-400 tabular-nums">{weighted.toFixed(1)}%</span>
      </div>
      {showTip && evidence && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-60 bg-[#0B1A33] text-white text-[11px] rounded-lg px-3 py-2 shadow-xl leading-relaxed pointer-events-none whitespace-normal text-left">
          {evidence}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0B1A33]" />
        </div>
      )}
    </td>
  )
}

interface Props {
  roleId: string
  newSubmissionId?: string | null
}

export function RubixMatrixView({ roleId, newSubmissionId }: Props) {
  const [data, setData] = useState<RubixViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [assessing, setAssessing] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const res = await fetch(`/api/roles/${roleId}/rubix-view`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [roleId])

  useEffect(() => { load() }, [load])

  // Auto-assess when a new submission is added
  useEffect(() => {
    if (!newSubmissionId) return
    triggerAssess(newSubmissionId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSubmissionId])

  async function triggerAssess(submissionId: string) {
    setAssessing(prev => new Set(prev).add(submissionId))
    try {
      await fetch(`/api/submissions/${submissionId}/rubix-assess`, { method: 'POST' })
      await load()
    } finally {
      setAssessing(prev => { const s = new Set(prev); s.delete(submissionId); return s })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-3 px-4 bg-white/60 border border-gray-200 rounded-xl">
        <Loader2 size={13} className="animate-spin" /> Se încarcă Rubix Matrix...
      </div>
    )
  }

  if (!data?.hasCriteria) {
    return (
      <div className="px-4 py-3 text-xs text-gray-400 bg-gray-50/60 border border-dashed border-gray-200 rounded-xl">
        Nicio Rubix Matrix definită pentru acest rol. Adaugă una din <strong>editare rol</strong>.
      </div>
    )
  }

  const { criteria, candidates } = data
  const anyAssessing = assessing.size > 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0B1A33] text-white">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest">Rubix Matrix</span>
          <span className="text-xs text-white/40">{criteria.length} criterii · {candidates.length} candidați</span>
          {anyAssessing && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#2AA3FF]">
              <Loader2 size={10} className="animate-spin" /> Evaluare în curs...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); load() }}
            className="p-1 text-white/40 hover:text-white transition-colors rounded"
            title="Actualizează"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-1 text-white/40 hover:text-white transition-colors rounded"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Legend */}
      {!collapsed && (
        <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 flex items-center gap-1">
          <span className="font-medium text-gray-500">Scală:</span>
          5 = îndeplinit complet · 4 = puternic · 3 = parțial · 2 = limitat · 1 = minimal · 0 = absent
          <span className="ml-2 text-gray-300">|</span>
          <span className="ml-1">celula = scor / weighted%</span>
          <span className="text-gray-300 mx-1">·</span>
          <span>hover = evidență</span>
        </div>
      )}

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-7 px-2 py-2 text-center text-[10px] font-semibold text-gray-400 sticky left-0 bg-gray-50">#</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 min-w-[280px] sticky left-7 bg-gray-50 border-r border-gray-200">
                  Criteriu (din JD)
                </th>
                <th className="w-16 px-3 py-2 text-center text-[10px] font-semibold text-gray-500 border-r border-gray-200">
                  Pondere
                </th>
                {candidates.map(c => (
                  <th key={c.submission_id} className="px-2 py-2 text-center min-w-[100px] max-w-[120px] border-l border-gray-100">
                    <div className="text-[10px] font-semibold text-[#0B1A33] truncate" title={c.candidate_name}>
                      {c.candidate_name.split(' ')[0]} {(c.candidate_name.split(' ')[1] ?? '')[0]}.
                    </div>
                    <div className="mt-0.5">
                      {assessing.has(c.submission_id) ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-[#2AA3FF]">
                          <Loader2 size={9} className="animate-spin" /> analizează...
                        </span>
                      ) : c.has_scores ? (
                        <FitBadge fit={c.overall_fit} />
                      ) : (
                        <button
                          onClick={() => triggerAssess(c.submission_id)}
                          className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#2AA3FF]/10 text-[#2AA3FF] hover:bg-[#2AA3FF]/20 border border-[#2AA3FF]/20 transition-colors"
                        >
                          <Sparkles size={8} /> Analizează
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {criteria.map((cr, i) => (
                <tr key={cr.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-2 py-2 text-center text-[10px] text-gray-300 font-mono sticky left-0 bg-white">{i + 1}</td>
                  <td className="px-4 py-2 text-xs text-gray-700 leading-relaxed sticky left-7 bg-white border-r border-gray-100">{cr.criterion}</td>
                  <td className="px-3 py-2 text-center text-xs font-semibold text-gray-500 border-r border-gray-100">{cr.weight}%</td>
                  {candidates.map(c => (
                    <ScoreCell
                      key={c.submission_id}
                      score={c.scores[cr.id]?.score}
                      evidence={c.scores[cr.id]?.evidence}
                      weight={cr.weight}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-[#0B1A33]/[0.04]">
                <td className="sticky left-0 bg-[#f8f8f9]" />
                <td className="px-4 py-2.5 text-xs font-bold text-[#0B1A33] sticky left-7 bg-[#f8f8f9] border-r border-gray-200">
                  OVERALL FIT
                </td>
                <td className="px-3 py-2.5 text-center text-xs font-bold text-gray-600 border-r border-gray-200">100%</td>
                {candidates.map(c => (
                  <td key={c.submission_id} className="px-2 py-2.5 text-center border-l border-gray-100">
                    {assessing.has(c.submission_id)
                      ? <Loader2 size={12} className="animate-spin text-[#2AA3FF] mx-auto" />
                      : <FitBadge fit={c.has_scores ? c.overall_fit : null} />
                    }
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>

          {candidates.length === 0 && (
            <div className="text-center py-6 text-xs text-gray-400">
              Adaugă candidați în pipeline pentru a vedea scorurile Rubix.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
