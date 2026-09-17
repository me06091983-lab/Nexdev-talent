'use client'

import { Users, Loader2 } from 'lucide-react'
import { MatchCard, type MatchResult } from '@/components/pipeline/AIMatchPanel'
import { CandidateViewModal } from '@/components/candidates/CandidateViewModal'
import { CandidateCVModal } from '@/components/candidates/CandidateCVModal'
import { useState } from 'react'

export interface ResultGroup {
  key: string
  label: string
  badge: { label: string; className: string }
  items: MatchResult[]
  showAdd: boolean
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
  const [viewProfileId, setViewProfileId] = useState<string | null>(null)
  const [viewCV, setViewCV] = useState<{ id: string; name: string } | null>(null)

  const total = groups.reduce((acc, g) => acc + g.items.length, 0)

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#2AA3FF]" />
          <h2 className="text-sm font-semibold text-gray-900">Candidates</h2>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">{total} identified for this role</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-5">
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
            <div className="space-y-2">
              {g.items.map(item => (
                <MatchCard
                  key={item.submission_id ?? item.candidate_id}
                  item={item}
                  badge={g.badge}
                  onAdd={g.showAdd && item.candidate_id ? () => onAdd(item) : undefined}
                  onViewProfile={item.candidate_id ? () => setViewProfileId(item.candidate_id!) : undefined}
                  onViewCV={item.candidate_id ? () => setViewCV({ id: item.candidate_id!, name: item.candidate_name }) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {viewProfileId && (
        <CandidateViewModal candidateId={viewProfileId} onClose={() => setViewProfileId(null)} leftPanel />
      )}
      {viewCV && (
        <CandidateCVModal candidateId={viewCV.id} candidateName={viewCV.name} onClose={() => setViewCV(null)} />
      )}
    </div>
  )
}
