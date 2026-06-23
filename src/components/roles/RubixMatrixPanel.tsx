'use client'

import { Loader2, RefreshCw, Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RubixCriterion {
  id?: string
  order_index: number
  criterion: string
  weight: number
}

interface Props {
  criteria: RubixCriterion[]
  onChange: (criteria: RubixCriterion[]) => void
  onRegenerate: () => void
  generating: boolean
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  saveError?: string
  roleId?: string
}

export function RubixMatrixPanel({ criteria, onChange, onRegenerate, generating, saveStatus, saveError, roleId }: Props) {
  const totalWeight = criteria.reduce((acc, c) => acc + (Number(c.weight) || 0), 0)
  const weightOk = totalWeight === 100

  function updateCriterion(idx: number, field: 'criterion' | 'weight', value: string | number) {
    onChange(criteria.map((c, i) =>
      i === idx ? { ...c, [field]: field === 'weight' ? (parseInt(String(value)) || 0) : value } : c
    ))
  }

  function removeCriterion(idx: number) {
    onChange(criteria.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order_index: i })))
  }

  function addCriterion() {
    const name = window.prompt('Evaluation criterion text:')
    if (!name?.trim()) return
    onChange([...criteria, { order_index: criteria.length, criterion: name.trim(), weight: 0 }])
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200/60">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-[#0B1A33] tracking-wide uppercase flex items-center gap-2">
            <span className="w-1 h-4 bg-[#2AA3FF] rounded-full inline-block" />
            Rubix Matrix
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Weighted evaluation rubric — generated from JD · score 0–5 per candidate · Weighted = Weight × Score ÷ 5
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Save status indicator */}
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <Loader2 size={10} className="animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1 text-[10px] text-green-600">
              <CheckCircle2 size={10} /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="inline-flex items-center gap-1 text-[10px] text-red-500" title={saveError}>
              <AlertCircle size={10} /> Error: {saveError}
            </span>
          )}

          <button
            type="button"
            onClick={onRegenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#2AA3FF]/10 hover:bg-[#2AA3FF]/20 text-[#2AA3FF] border border-[#2AA3FF]/30 rounded-lg transition-colors disabled:opacity-60 shrink-0"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {generating ? 'Generating...' : criteria.length ? 'Regenerate from JD' : 'Generate from JD (AI)'}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!generating && criteria.length === 0 && (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <p className="text-sm text-gray-400">
            Click <span className="font-semibold text-[#2AA3FF]">Generate from JD (AI)</span> to create the rubric automatically.
          </p>
          <p className="text-xs text-gray-300 mt-1">
            The AI will extract 6–10 compound criteria from the JD and weight them (sum = 100%).
          </p>
        </div>
      )}

      {generating && (
        <div className="text-center py-10">
          <Loader2 size={22} className="animate-spin mx-auto mb-2 text-[#2AA3FF]" />
          <p className="text-sm text-gray-500">Claude is analysing the JD and building the rubric...</p>
        </div>
      )}

      {!generating && criteria.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200/80">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#0B1A33] text-white">
                  <th className="w-8 px-3 py-2.5 text-center text-xs font-semibold opacity-60">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">Criterion (from JD)</th>
                  <th className="w-28 px-3 py-2.5 text-center text-xs font-semibold">Weight %</th>
                  <th className="w-8 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {criteria.map((c, idx) => (
                  <tr key={idx} className="group bg-white hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-2.5 text-center text-xs text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={c.criterion}
                        onChange={e => updateCriterion(idx, 'criterion', e.target.value)}
                        className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-[#2AA3FF]/40 rounded px-1 py-0.5"
                        placeholder="Describe the criterion..."
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={c.weight}
                          onChange={e => updateCriterion(idx, 'weight', e.target.value)}
                          className="w-14 text-center text-sm font-semibold border border-gray-200 rounded-md py-1 px-1 focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30 bg-white"
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeCriterion(idx)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className={cn('font-semibold text-sm', weightOk ? 'bg-green-50' : 'bg-amber-50')}>
                  <td />
                  <td className="px-4 py-2.5 flex items-center gap-2">
                    {weightOk
                      ? <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                      : <AlertCircle size={14} className="text-amber-500 shrink-0" />}
                    <span className={weightOk ? 'text-green-700' : 'text-amber-700'}>
                      {weightOk ? 'TOTAL FIT — correct distribution' : `TOTAL — ${totalWeight > 100 ? 'exceeds' : 'missing'} ${Math.abs(100 - totalWeight)}%`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn('font-bold text-base', weightOk ? 'text-green-700' : 'text-amber-600')}>
                      {totalWeight}%
                    </span>
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-xs text-gray-400">
              <span className="font-medium text-gray-500">Scoring scale:</span>{' '}
              5 = fully met · 4 = strong · 3 = partial · 2 = limited · 1 = minimal · 0 = absent
            </p>
            <button type="button" onClick={addCriterion}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#2AA3FF] transition-colors">
              <Plus size={13} /> Add criterion
            </button>
          </div>

          {!roleId && (
            <p className="mt-2 px-1 text-xs text-gray-400 italic">
              The matrix is saved automatically when the role is created.
            </p>
          )}
        </>
      )}
    </div>
  )
}
