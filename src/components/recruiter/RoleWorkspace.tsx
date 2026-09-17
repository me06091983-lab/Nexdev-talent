'use client'

import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Rnd } from 'react-rnd'
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { Users, Database, Link2, FileText, CalendarClock } from 'lucide-react'
import { ChatColumn, type ChatMessage } from './ChatColumn'
import { CandidatePanel, type PanelRect } from './CandidatePanel'
import { CandidateRow } from './CandidateRow'
import { usePersistentState } from '@/lib/usePersistentState'
import type { MatchResult } from '@/lib/matching'
import type { RecruiterRole } from './RecruiterClient'

type SatelliteKey = 'submitted' | 'database' | 'linkedin' | 'cv_upload' | 'interview'
type PanelKey = 'chat' | SatelliteKey

function ChatPanel({
  role,
  defaultRect,
  zIndex,
  onFocus,
  ...chatProps
}: {
  role: RecruiterRole
  defaultRect: PanelRect
  zIndex: number
  onFocus: () => void
} & Omit<ComponentProps<typeof ChatColumn>, 'roleTitle'>) {
  const [rect, setRect] = usePersistentState<PanelRect>(`recruiter-panel-${role.id}-chat`, defaultRect)

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
      minWidth={300}
      minHeight={340}
      style={{ display: 'flex', flexDirection: 'column', zIndex, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}
      className="deck-panel rounded-3xl overflow-hidden flex flex-col"
    >
      <ChatColumn roleTitle={role.title} {...chatProps} />
    </Rnd>
  )
}

export function RoleWorkspace({
  role,
  isClosed,
  messages,
  busy,
  onSend,
  onAttachCv,
  onConfirmProposal,
  onDiscardProposal,
  loadingCandidates,
  submitted,
  database,
  linkedin,
  cvUpload,
  interview,
  onAdd,
  onMoveToInterview,
}: {
  role: RecruiterRole
  isClosed: boolean
  messages: ChatMessage[]
  busy: boolean
  onSend: (text: string) => void
  onAttachCv: (file: File) => void
  onConfirmProposal: (messageId: string) => Promise<void>
  onDiscardProposal: (messageId: string) => void
  loadingCandidates: boolean
  submitted: MatchResult[]
  database: MatchResult[]
  linkedin: MatchResult[]
  cvUpload: MatchResult[]
  interview: MatchResult[]
  onAdd: (item: MatchResult) => Promise<void>
  onMoveToInterview: (item: MatchResult) => Promise<void>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [front, setFront] = useState<PanelKey>('chat')
  const [activeItem, setActiveItem] = useState<MatchResult | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const chatW = 440
  const chatH = size ? Math.min(620, size.h - 56) : 500

  function defaultRects(w: number, h: number): Record<SatelliteKey, PanelRect> {
    const margin = 16
    // Space available beside the centered chat, so satellites default to a
    // position that doesn't start out underneath it (still user-resizable).
    const sideSpace = (w - chatW) / 2 - margin - 20
    const panelW = Math.max(130, Math.min(230, sideSpace))
    const panelH = Math.max(130, (h - 40) / 2 - margin)
    return {
      submitted: { x: margin, y: margin, width: panelW, height: panelH },
      database: { x: w - panelW - margin, y: margin, width: panelW, height: panelH },
      linkedin: { x: margin, y: h - panelH - margin, width: panelW, height: panelH },
      cv_upload: { x: w - panelW - margin, y: h - panelH - margin, width: panelW, height: panelH },
      // Cascades near the top, overlapping a little by default — like any
      // new window in a desktop window manager. Fully draggable/resizable.
      interview: { x: w / 2 + 24, y: margin + 26, width: panelW, height: panelH * 0.85 },
    }
  }

  const rects = size ? defaultRects(size.w, size.h) : null

  function handleDragStart(e: DragStartEvent) {
    const item = e.active.data.current?.item as MatchResult | undefined
    setActiveItem(item ?? null)
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveItem(null)
    if (e.over?.id === 'interview-dropzone') {
      const item = e.active.data.current?.item as MatchResult | undefined
      if (item) await onMoveToInterview(item)
    }
  }

  return (
    <div className="relative h-full min-h-0 deck-panel rounded-[24px] overflow-hidden">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 text-center pointer-events-none">
        <p className="text-[10px] font-mono uppercase tracking-wide text-[#5E7699]">{role.client?.name ?? '—'}</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div ref={containerRef} className="absolute inset-0">
          {rects && (
            <>
              <ChatPanel
                role={role}
                defaultRect={{ x: size!.w / 2 - chatW / 2, y: size!.h / 2 - chatH / 2, width: chatW, height: chatH }}
                zIndex={front === 'chat' ? 20 : 15}
                onFocus={() => setFront('chat')}
                disabled={isClosed}
                disabledReason="This role is closed — chat actions are disabled here."
                messages={messages}
                busy={busy}
                onSend={onSend}
                onAttachCv={onAttachCv}
                onConfirmProposal={onConfirmProposal}
                onDiscardProposal={onDiscardProposal}
              />
              <CandidatePanel
                storageKey={`recruiter-panel-${role.id}-submitted`}
                panelKey="submitted"
                defaultRect={rects.submitted}
                title="Submitted"
                icon={Users}
                accentClass="text-[#7E97BA]"
                items={submitted}
                showAdd={false}
                onAdd={onAdd}
                emptyText="No candidates submitted to this role yet."
                zIndex={front === 'submitted' ? 20 : 10}
                onFocus={() => setFront('submitted')}
              />
              <CandidatePanel
                storageKey={`recruiter-panel-${role.id}-database`}
                panelKey="database"
                defaultRect={rects.database}
                title="Database"
                icon={Database}
                accentClass="text-[#7E97BA]"
                items={database}
                showAdd={!isClosed}
                onAdd={onAdd}
                emptyText="Ask the chat to find matches from the database."
                zIndex={front === 'database' ? 20 : 10}
                onFocus={() => setFront('database')}
              />
              <CandidatePanel
                storageKey={`recruiter-panel-${role.id}-linkedin`}
                panelKey="linkedin"
                defaultRect={rects.linkedin}
                title="LinkedIn"
                icon={Link2}
                accentClass="text-[#34D2FF]"
                items={linkedin}
                showAdd={!isClosed}
                onAdd={onAdd}
                emptyText="Paste a LinkedIn profile in the chat to add one."
                zIndex={front === 'linkedin' ? 20 : 10}
                onFocus={() => setFront('linkedin')}
              />
              <CandidatePanel
                storageKey={`recruiter-panel-${role.id}-cv`}
                panelKey="cv_upload"
                defaultRect={rects.cv_upload}
                title="CV upload"
                icon={FileText}
                accentClass="text-purple-400"
                items={cvUpload}
                showAdd={!isClosed}
                onAdd={onAdd}
                emptyText="Attach a CV in the chat to add one."
                zIndex={front === 'cv_upload' ? 20 : 10}
                onFocus={() => setFront('cv_upload')}
              />
              <CandidatePanel
                storageKey={`recruiter-panel-${role.id}-interview`}
                panelKey="interview"
                defaultRect={rects.interview}
                title="Interview"
                icon={CalendarClock}
                accentClass="text-[#F5B45C]"
                items={interview}
                showAdd={false}
                onAdd={onAdd}
                emptyText="Drag candidates here from any window to shortlist them for interview."
                dropHint="Drop to move to interview"
                zIndex={front === 'interview' ? 25 : 12}
                onFocus={() => setFront('interview')}
                droppableId="interview-dropzone"
              />
            </>
          )}

          {loadingCandidates && (
            <div className="absolute top-3 right-3 z-40 text-[10px] font-mono text-[#7E97BA]">loading…</div>
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <div className="w-56 shadow-2xl rounded-lg">
              <CandidateRow item={activeItem} showAdd={false} onAdd={async () => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
