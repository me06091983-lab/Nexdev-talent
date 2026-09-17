'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, type PanInfo } from 'motion/react'
import { Archive } from 'lucide-react'
import { usePersistentState } from '@/lib/usePersistentState'
import type { RecruiterRole } from './RecruiterClient'

const OPEN_STATUSES = new Set(['draft', 'active', 'on_hold'])

const STATUS_RING: Record<string, string> = {
  draft: 'border-gray-400/50',
  active: 'border-[#5FE0A8]/70',
  on_hold: 'border-amber-400/70',
  closed: 'border-gray-500/40',
  filled: 'border-[#34D2FF]/60',
}

function shortTitle(title: string) {
  const words = title.split(' ')
  if (words.length <= 3) return title
  return words.slice(0, 3).join(' ') + '…'
}

const BUBBLE = 124
const GAP_X = 36
const GROUP_GAP = 60
const ROW_GAP = 96

interface Pos {
  x: number
  y: number
}

function groupByClient(roles: RecruiterRole[]): [string, RecruiterRole[]][] {
  const map = new Map<string, RecruiterRole[]>()
  for (const r of roles) {
    const key = r.client?.name ?? 'No client'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
}

function computeLayout(groups: [string, RecruiterRole[]][], containerW: number) {
  const pos: Record<string, Pos> = {}
  const labels: { name: string; x: number; y: number; w: number }[] = []
  let x = 50
  let y = 70
  const safeW = Math.max(containerW, BUBBLE + 100)

  for (const [clientName, list] of groups) {
    const w = list.length * BUBBLE + (list.length - 1) * GAP_X
    if (x + w > safeW - 50 && x > 50) {
      x = 50
      y += BUBBLE + ROW_GAP
    }
    labels.push({ name: clientName, x, y: y - 34, w })
    list.forEach((r, i) => {
      pos[r.id] = { x: x + i * (BUBBLE + GAP_X), y }
    })
    x += w + GROUP_GAP
  }
  return { pos, labels, height: y + BUBBLE + 80 }
}

function Bubble({
  role,
  size,
  dim,
  index,
  initial,
  onOpen,
  onMoved,
}: {
  role: RecruiterRole
  size: number
  dim: boolean
  index: number
  initial: Pos
  onOpen: () => void
  onMoved: (pos: Pos) => void
}) {
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(initial.x)
  const y = useMotionValue(initial.y)
  const [dragging, setDragging] = useState(false)

  function handleDragEnd(_e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    setDragging(false)
    onMoved({ x: x.get(), y: y.get() })
    void info
  }

  return (
    <motion.div
      drag
      dragMomentum
      dragElastic={0.12}
      style={{ position: 'absolute', left: 0, top: 0, x, y, width: size, height: size }}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
      whileHover={dragging ? undefined : { scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      className="flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing"
    >
      <motion.div
        animate={reduceMotion || dragging ? undefined : { y: [0, -7, 0] }}
        transition={reduceMotion || dragging ? undefined : { duration: 5.5 + (index % 4) * 0.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.22 }}
        style={{ width: size, height: size }}
      >
        <button
          onClick={() => !dragging && onOpen()}
          style={{ width: size, height: size }}
          className={`relative rounded-full flex items-center justify-center text-center px-3 border-2 ${STATUS_RING[role.status] ?? 'border-white/20'} ${dim ? 'opacity-45 hover:opacity-80' : 'opacity-100'}`}
        >
          <div
            className="absolute inset-0 rounded-full deck-panel"
            style={{ boxShadow: dim ? 'none' : '0 8px 30px rgba(42,163,255,.14), inset 0 1px 0 rgba(255,255,255,.08)' }}
          />
          <span className={`relative font-medium text-white leading-snug pointer-events-none ${size >= 110 ? 'text-[13px]' : 'text-[10.5px]'}`}>
            {shortTitle(role.title)}
          </span>
        </button>
      </motion.div>
    </motion.div>
  )
}

export function RoleBubbleField({
  roles,
  onSelect,
}: {
  roles: RecruiterRole[]
  onSelect: (id: string) => void
}) {
  const [closedOpen, setClosedOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState<number | null>(null)
  const [overrides, setOverrides, hydrated] = usePersistentState<Record<string, Pos>>('recruiter-bubble-positions-v1', {})

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setContainerW(Math.round(entries[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const openRoles = roles.filter(r => OPEN_STATUSES.has(r.status))
  const closedRoles = roles.filter(r => !OPEN_STATUSES.has(r.status))

  const openGroups = groupByClient(openRoles)
  const closedGroups = groupByClient(closedRoles)

  const ready = containerW !== null && hydrated
  const openLayout = ready ? computeLayout(openGroups, containerW!) : null
  const closedLayout = ready ? computeLayout(closedGroups, Math.min(containerW!, 720)) : null

  function saveOverride(roleId: string, pos: Pos) {
    setOverrides(prev => ({ ...prev, [roleId]: pos }))
  }

  return (
    <div ref={containerRef} className="h-full min-h-0 overflow-y-auto deck-scroll relative">
      <div className="text-center pt-10 pb-2">
        <p className="text-[11px] font-mono uppercase tracking-widest text-[#7E97BA]">NexDev Recruiter</p>
        <h1 className="text-xl font-semibold text-white mt-1">Pick a role to open its workspace</h1>
        <p className="text-[11px] text-[#5E7699] mt-1">Grouped by client — drag any bubble to rearrange</p>
      </div>

      {ready && openLayout && (
        <div className="relative mx-auto" style={{ height: openLayout.height, maxWidth: Math.min(containerW!, 1400) }}>
          {openLayout.labels.map(l => (
            <div
              key={l.name}
              className="absolute text-[10px] font-mono uppercase tracking-wide text-[#5E7699]"
              style={{ left: l.x, top: l.y, width: l.w, textAlign: 'center' }}
            >
              {l.name}
            </div>
          ))}
          {openRoles.map((r, i) => (
            <Bubble
              key={r.id}
              role={r}
              size={BUBBLE}
              dim={false}
              index={i}
              initial={overrides[r.id] ?? openLayout.pos[r.id] ?? { x: 40, y: 40 }}
              onOpen={() => onSelect(r.id)}
              onMoved={pos => saveOverride(r.id, pos)}
            />
          ))}
          {openRoles.length === 0 && (
            <p className="text-sm text-[#7E97BA] text-center pt-10">No open roles right now.</p>
          )}
        </div>
      )}

      {closedRoles.length > 0 && (
        <div className="flex flex-col items-center pb-10">
          <button
            onClick={() => setClosedOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#7E97BA] hover:text-[#C6D5EA] transition-colors"
          >
            <Archive size={12} /> Closed roles ({closedRoles.length})
          </button>
          {closedOpen && ready && closedLayout && (
            <div className="relative mt-4" style={{ height: closedLayout.height, width: Math.min(containerW!, 720) }}>
              {closedLayout.labels.map(l => (
                <div
                  key={l.name}
                  className="absolute text-[9.5px] font-mono uppercase tracking-wide text-[#5E7699]"
                  style={{ left: l.x, top: l.y, width: l.w, textAlign: 'center' }}
                >
                  {l.name}
                </div>
              ))}
              {closedRoles.map((r, i) => (
                <Bubble
                  key={r.id}
                  role={r}
                  size={84}
                  dim
                  index={i}
                  initial={overrides[r.id] ?? closedLayout.pos[r.id] ?? { x: 40, y: 40 }}
                  onOpen={() => onSelect(r.id)}
                  onMoved={pos => saveOverride(r.id, pos)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
