'use client'

import { Rnd } from 'react-rnd'
import type { LucideIcon } from 'lucide-react'
import { CandidateRow } from './CandidateRow'
import { usePersistentState } from '@/lib/usePersistentState'
import type { MatchResult } from '@/lib/matching'

export interface PanelRect {
  x: number
  y: number
  width: number
  height: number
}

export function CandidatePanel({
  storageKey,
  defaultRect,
  title,
  icon: Icon,
  accentClass,
  items,
  showAdd,
  onAdd,
  emptyText,
  zIndex,
  onFocus,
}: {
  storageKey: string
  defaultRect: PanelRect
  title: string
  icon: LucideIcon
  accentClass: string
  items: MatchResult[]
  showAdd: boolean
  onAdd: (item: MatchResult) => Promise<void>
  emptyText: string
  zIndex: number
  onFocus: () => void
}) {
  const [rect, setRect] = usePersistentState<PanelRect>(storageKey, defaultRect)

  return (
    <Rnd
      position={{ x: rect.x, y: rect.y }}
      size={{ width: rect.width, height: rect.height }}
      onDragStop={(_e, d) => setRect(r => ({ ...r, x: d.x, y: d.y }))}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        setRect({ x: pos.x, y: pos.y, width: parseInt(ref.style.width, 10), height: parseInt(ref.style.height, 10) })
      }
      onMouseDown={onFocus}
      onTouchStart={onFocus}
      bounds="parent"
      dragHandleClassName="panel-drag-handle"
      minWidth={200}
      minHeight={140}
      style={{ zIndex }}
      className="deck-panel rounded-2xl overflow-hidden flex flex-col"
    >
      <div className="panel-drag-handle flex-none px-3 py-2 border-b border-white/10 flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none">
        <Icon size={12} className={accentClass} />
        <span className="text-[11.5px] font-semibold text-white truncate">{title}</span>
        <span className="ml-auto text-[9.5px] font-mono text-[#7E97BA] flex-none">{items.length}</span>
      </div>
      <div className="deck-scroll flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1">
        {items.length === 0 ? (
          <p className="text-[10.5px] text-[#7E97BA] text-center py-6 px-2 leading-relaxed">{emptyText}</p>
        ) : (
          items.map(item => <CandidateRow key={item.submission_id ?? item.candidate_id} item={item} showAdd={showAdd} onAdd={onAdd} />)
        )}
      </div>
    </Rnd>
  )
}
