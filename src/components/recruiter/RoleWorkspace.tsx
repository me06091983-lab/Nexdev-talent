'use client'

import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Rnd } from 'react-rnd'
import { Users, Database, Link2, FileText } from 'lucide-react'
import { ChatColumn, type ChatMessage } from './ChatColumn'
import { CandidatePanel, type PanelRect } from './CandidatePanel'
import { usePersistentState } from '@/lib/usePersistentState'
import type { MatchResult } from '@/lib/matching'
import type { RecruiterRole } from './RecruiterClient'

type SatelliteKey = 'submitted' | 'database' | 'linkedin' | 'cv_upload'
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
      style={{ zIndex, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}
      className="deck-panel rounded-3xl overflow-hidden flex flex-col"
    >
      <ChatColumn roleTitle={role.title} {...chatProps} />
    </Rnd>
  )
}

export function RoleWorkspace({
  role,
  variant,
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
  onAdd,
}: {
  role: RecruiterRole
  variant: 'single' | 'split'
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
  onAdd: (item: MatchResult) => Promise<void>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [front, setFront] = useState<PanelKey>('chat')

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

  const chatW = variant === 'split' ? Math.min(300, size ? size.w - 260 : 300) : 440
  const chatH = size ? Math.min(variant === 'split' ? 520 : 620, size.h - 56) : 500

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
    }
  }

  const rects = size ? defaultRects(size.w, size.h) : null

  return (
    <div className="relative h-full min-h-0 deck-panel rounded-[24px] overflow-hidden">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 text-center pointer-events-none">
        <p className="text-[10px] font-mono uppercase tracking-wide text-[#5E7699]">{role.client?.name ?? '—'}</p>
      </div>

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
          </>
        )}

        {loadingCandidates && (
          <div className="absolute top-3 right-3 z-40 text-[10px] font-mono text-[#7E97BA]">loading…</div>
        )}
      </div>
    </div>
  )
}
