'use client'

import { Loader2, ExternalLink, Plus, Check, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { MatchResult } from '@/lib/matching'

function scoreClasses(score: number) {
  if (score >= 80) return 'text-[#5FE0A8] bg-[#5FE0A8]/10 border-[#5FE0A8]/30'
  if (score >= 60) return 'text-amber-400 bg-amber-400/10 border-amber-400/30'
  return 'text-red-400 bg-red-400/10 border-red-400/30'
}

export function CandidateRow({
  item,
  showAdd,
  onAdd,
  dragId,
  panelKey,
}: {
  item: MatchResult
  showAdd: boolean
  onAdd: (item: MatchResult) => Promise<void>
  /** Unique id for this row within the DnD context — omit to render a plain, non-draggable row (e.g. inside a DragOverlay preview). */
  dragId?: string
  panelKey?: string
}) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const draggable = useDraggable({
    id: dragId ?? `static-${item.candidate_id}`,
    data: { item, panelKey },
    disabled: !dragId,
  })

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

  const style = draggable.transform
    ? { transform: CSS.Translate.toString(draggable.transform), opacity: draggable.isDragging ? 0.35 : 1 }
    : undefined

  return (
    <div
      ref={dragId ? draggable.setNodeRef : undefined}
      style={style}
      className="deck-card deck-materialize flex items-center justify-between gap-1 px-2.5 py-2 rounded-lg"
    >
      {dragId && (
        <button
          {...draggable.listeners}
          {...draggable.attributes}
          className="p-0.5 -ml-1 text-[#5E7699] hover:text-[#7E97BA] cursor-grab active:cursor-grabbing touch-none flex-none"
          title="Drag to another window"
        >
          <GripVertical size={12} />
        </button>
      )}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className={`flex-none text-[10.5px] font-bold font-mono px-1.5 py-0.5 rounded-md border ${scoreClasses(item.score)}`}>
          {Math.round(item.score)}%
        </span>
        <span className="text-[12.5px] font-medium text-[#EAF1FC] truncate">{item.candidate_name}</span>
      </div>
      <div
        className="flex items-center gap-0.5 flex-shrink-0"
        onPointerDown={e => e.stopPropagation()}
      >
        {showAdd && item.candidate_id && (
          <button
            onClick={handleAdd}
            disabled={adding || added}
            title={added ? 'Added to pipeline' : 'Add to pipeline'}
            className={`p-1 rounded-md transition-colors ${
              added ? 'text-[#5FE0A8]' : 'text-[#7E97BA] hover:text-[#34D2FF] hover:bg-[#34D2FF]/10'
            }`}
          >
            {adding ? <Loader2 size={12} className="animate-spin" /> : added ? <Check size={12} /> : <Plus size={12} />}
          </button>
        )}
        {item.candidate_id && (
          <Link
            href={`/candidates/${item.candidate_id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View profile in Candidates"
            className="p-1 text-[#7E97BA] hover:text-[#34D2FF] hover:bg-[#34D2FF]/10 rounded-md transition-colors"
          >
            <ExternalLink size={12} />
          </Link>
        )}
      </div>
    </div>
  )
}
