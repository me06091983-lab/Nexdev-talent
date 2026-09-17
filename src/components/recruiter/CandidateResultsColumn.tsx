'use client'

import { Users, Loader2, ExternalLink, Plus, Check, Database, Link2, FileText, UserPlus2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { MatchResult, CandidateSource } from '@/lib/matching'

export interface ResultGroup {
  key: string
  label: string
  items: MatchResult[]
  showAdd: boolean
}

function scoreClasses(score: number) {
  if (score >= 80) return 'text-[#5FE0A8] bg-[#5FE0A8]/10 border-[#5FE0A8]/30'
  if (score >= 60) return 'text-amber-400 bg-amber-400/10 border-amber-400/30'
  return 'text-red-400 bg-red-400/10 border-red-400/30'
}

const SOURCE_META: Record<CandidateSource, { icon: typeof Database; label: string; cls: string }> = {
  database: { icon: Database, label: 'From NexDev database', cls: 'text-[#7E97BA]' },
  linkedin: { icon: Link2, label: 'Sourced from LinkedIn', cls: 'text-[#2AA3FF]' },
  cv_upload: { icon: FileText, label: 'Added from CV upload', cls: 'text-purple-400' },
  manual: { icon: UserPlus2, label: 'Added manually', cls: 'text-[#7E97BA]' },
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
  const source = SOURCE_META[item.source ?? 'database']
  const SourceIcon = source.icon

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
    <div className="deck-card deck-rise flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`flex-none text-[11px] font-bold font-mono px-1.5 py-1 rounded-lg border ${scoreClasses(item.score)}`}>
          {Math.round(item.score)}%
        </span>
        <SourceIcon size={12} className={`flex-none ${source.cls}`} aria-label={source.label} />
        <span className="text-sm font-medium text-[#EAF1FC] truncate" title={source.label}>{item.candidate_name}</span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {showAdd && item.candidate_id && (
          <button
            onClick={handleAdd}
            disabled={adding || added}
            title={added ? 'Added to pipeline' : 'Add to pipeline'}
            className={`p-1.5 rounded-lg transition-colors ${
              added ? 'text-[#5FE0A8]' : 'text-[#7E97BA] hover:text-[#2AA3FF] hover:bg-[#2AA3FF]/10'
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
            className="p-1.5 text-[#7E97BA] hover:text-[#2AA3FF] hover:bg-[#2AA3FF]/10 rounded-lg transition-colors"
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
  activeTab,
  onTabChange,
  onAdd,
}: {
  loading: boolean
  groups: ResultGroup[]
  activeTab: string
  onTabChange: (key: string) => void
  onAdd: (item: MatchResult) => Promise<void>
}) {
  const active = groups.find(g => g.key === activeTab) ?? groups[0]

  return (
    <div className="h-full min-h-0 flex flex-col deck-panel border-l-0">
      <div className="flex-none px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#2AA3FF]" />
          <h2 className="text-sm font-semibold text-white">Candidates</h2>
        </div>
      </div>

      <div className="flex-none flex gap-1 p-1 mx-3 mt-3 rounded-lg bg-white/5">
        {groups.map(g => (
          <button
            key={g.key}
            onClick={() => onTabChange(g.key)}
            className={`flex-1 text-[11.5px] font-medium px-2.5 py-1.5 rounded-md transition-colors ${
              g.key === active.key ? 'bg-[#2AA3FF] text-[#04101F]' : 'text-[#9FB6D6] hover:text-white'
            }`}
          >
            {g.label} ({g.items.length})
          </button>
        ))}
      </div>

      <div className="deck-scroll flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-[#7E97BA] py-10">
            <Loader2 size={13} className="animate-spin" /> Loading...
          </div>
        )}

        {!loading && active.items.length === 0 && (
          <p className="text-xs text-[#7E97BA] text-center py-10">
            {active.key === 'identified'
              ? 'No candidates yet. Ask the chat to find matches, paste a LinkedIn profile, or attach a CV.'
              : 'No candidates submitted to this role yet.'}
          </p>
        )}

        {!loading && active.items.map(item => (
          <CandidateRow key={item.submission_id ?? item.candidate_id} item={item} showAdd={active.showAdd} onAdd={onAdd} />
        ))}
      </div>
    </div>
  )
}
