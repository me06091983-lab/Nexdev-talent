'use client'

import { Users, Loader2, ExternalLink, Plus, Check } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { MatchResult } from '@/components/pipeline/AIMatchPanel'

export interface ResultGroup {
  key: string
  label: string
  items: MatchResult[]
  showAdd: boolean
}

function scoreClasses(score: number) {
  if (score >= 75) return 'text-[#2AA3FF] bg-blue-50 border-blue-200'
  if (score >= 55) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-red-500 bg-red-50 border-red-200'
}

function CandidateRow({
  item,
  showAdd,
  onAdd,
}: {
  item: MatchResult
  showAdd: boolean
  onAdd: (item: MatchResult) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  async function handleAdd() {
    if (adding || added) return
    setAdding(true)
    try {
      await onAdd(item)
      setAdded(true)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50/70 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`flex-none text-[11px] font-bold px-1.5 py-1 rounded-lg border ${scoreClasses(item.score)}`}>
          {Math.round(item.score)}%
        </span>
        <span className="text-sm font-medium text-gray-900 truncate">{item.candidate_name}</span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {showAdd && item.candidate_id && (
          <button
            onClick={handleAdd}
            disabled={adding || added}
            title={added ? 'Added to pipeline' : 'Add to pipeline'}
            className={`p-1.5 rounded-lg transition-colors ${
              added ? 'text-green-500' : 'text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50'
            }`}
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : added ? <Check size={14} /> : <Plus size={14} />}
          </button>
        )}
        {item.candidate_id && (
          <Link
            href={`/candidates/${item.candidate_id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View profile in Candidates"
            className="p-1.5 text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ExternalLink size={14} />
          </Link>
        )}
      </div>
    </div>
  )
}

export function CandidateResultsColumn({
  loading,
  groups,
  onAdd,
}: {
  loading: boolean
  groups: ResultGroup[]
  onAdd: (item: MatchResult) => Promise<void>
}) {
  const total = groups.reduce((acc, g) => acc + g.items.length, 0)

  return (
    <div className="h-full min-h-0 flex flex-col bg-white">
      <div className="flex-none px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#2AA3FF]" />
          <h2 className="text-sm font-semibold text-gray-900">Candidates</h2>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">{total} identified for this role</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-5">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 py-10">
            <Loader2 size={13} className="animate-spin" /> Loading...
          </div>
        )}

        {!loading && total === 0 && (
          <p className="text-xs text-gray-400 text-center py-10">
            No candidates yet. Select a role, then ask the chat to find matches.
          </p>
        )}

        {!loading && groups.map(g => g.items.length > 0 && (
          <div key={g.key}>
            <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              {g.label} ({g.items.length})
            </p>
            <div className="space-y-1">
              {g.items.map(item => (
                <CandidateRow
                  key={item.submission_id ?? item.candidate_id}
                  item={item}
                  showAdd={g.showAdd}
                  onAdd={onAdd}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
