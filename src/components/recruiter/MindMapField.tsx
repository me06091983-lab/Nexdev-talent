'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useReducedMotion, type PanInfo } from 'motion/react'
import { usePersistentState } from '@/lib/usePersistentState'
import type { RecruiterRole } from './RecruiterClient'

const OPEN_STATUSES = new Set(['draft', 'active', 'on_hold'])

interface Pos {
  x: number
  y: number
}

function shortLabel(s: string, maxWords = 3) {
  const words = s.split(' ')
  if (words.length <= maxWords) return s
  return words.slice(0, maxWords).join(' ') + '…'
}

function groupByClient(roles: RecruiterRole[]): { name: string; roles: RecruiterRole[] }[] {
  const map = new Map<string, RecruiterRole[]>()
  for (const r of roles) {
    const key = r.client?.name ?? 'No client'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return [...map.entries()].map(([name, list]) => ({ name, roles: list })).sort((a, b) => b.roles.length - a.roles.length)
}

function NodeBubble({
  id,
  label,
  size,
  dim,
  ringClass,
  initial,
  index,
  onOpen,
  onMoved,
}: {
  id: string
  label: string
  size: number
  dim: boolean
  ringClass: string
  initial: Pos
  index: number
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
      key={id}
      drag
      dragMomentum
      dragElastic={0.12}
      style={{ position: 'absolute', left: -size / 2, top: -size / 2, x, y, width: size, height: size }}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.35 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.35 }}
      transition={{ type: 'spring', bounce: 0.3, duration: 0.4, delay: index * 0.045 }}
      whileHover={dragging ? undefined : { scale: 1.07 }}
      whileTap={{ scale: 0.94 }}
      className="cursor-grab active:cursor-grabbing"
    >
      <motion.div
        animate={reduceMotion || dragging ? undefined : { y: [0, -6, 0] }}
        transition={
          reduceMotion || dragging
            ? undefined
            : { duration: 5 + (index % 4) * 0.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }
        }
        style={{ width: size, height: size }}
      >
        <button
          onClick={() => !dragging && onOpen()}
          style={{ width: size, height: size }}
          className={`relative rounded-full deck-panel flex items-center justify-center text-center px-2.5 border-2 ${ringClass} ${
            dim ? 'opacity-45 hover:opacity-80' : ''
          }`}
        >
          <span
            className="relative font-medium text-white leading-snug pointer-events-none"
            style={{ fontSize: size >= 110 ? 13 : 10.5 }}
          >
            {label}
          </span>
        </button>
      </motion.div>
    </motion.div>
  )
}

export function MindMapField({ roles, onOpenRole }: { roles: RecruiterRole[]; onOpenRole: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null)
  const [started, setStarted] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [positions, setPositions] = useState<Record<string, Pos>>({})
  const [overrides, setOverrides, hydrated] = usePersistentState<Record<string, Pos>>('recruiter-mindmap-positions-v1', {})

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries =>
      setContainerSize({ w: Math.round(entries[0].contentRect.width), h: Math.round(entries[0].contentRect.height) })
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const ready = containerSize !== null && hydrated
  const companies = useMemo(() => groupByClient(roles.filter(r => OPEN_STATUSES.has(r.status))), [roles])
  const centerPos: Pos = containerSize ? { x: containerSize.w / 2, y: containerSize.h / 2 } : { x: 400, y: 300 }

  const visibleIds = useMemo(() => {
    const ids: { id: string; parentId: string | null }[] = [{ id: 'start', parentId: null }]
    if (started) {
      for (const c of companies) {
        const companyId = `company:${c.name}`
        ids.push({ id: companyId, parentId: 'start' })
        if (expanded.has(c.name)) {
          for (const r of c.roles) {
            ids.push({ id: `role:${r.id}`, parentId: companyId })
          }
        }
      }
    }
    return ids
  }, [started, companies, expanded])

  // Seed a position for every node the moment it becomes visible, anchored to
  // its parent's current position — so children fan out from where the
  // parent actually is, not a recomputed static spot.
  useEffect(() => {
    if (!ready) return
    // Seeds positions only for newly-visible nodes (guarded by `changed`,
    // returns the same reference otherwise) — not an unbounded cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPositions(prev => {
      const next = { ...prev }
      let changed = false
      for (const { id } of visibleIds) {
        if (next[id]) continue
        changed = true
        if (id === 'start') {
          next[id] = overrides[id] ?? centerPos
        } else if (id.startsWith('company:')) {
          const name = id.slice('company:'.length)
          const idx = companies.findIndex(c => c.name === name)
          const angle = (idx / Math.max(companies.length, 1)) * 2 * Math.PI - Math.PI / 2
          const origin = next['start'] ?? centerPos
          next[id] = overrides[id] ?? { x: origin.x + 220 * Math.cos(angle), y: origin.y + 220 * Math.sin(angle) }
        } else if (id.startsWith('role:')) {
          const roleId = id.slice('role:'.length)
          const company = companies.find(c => c.roles.some(r => r.id === roleId))
          const companyId = `company:${company?.name}`
          const siblings = company?.roles ?? []
          const idx = siblings.findIndex(r => r.id === roleId)
          const angle = (idx / Math.max(siblings.length, 1)) * 2 * Math.PI
          const origin = next[companyId] ?? centerPos
          next[id] = overrides[id] ?? { x: origin.x + 140 * Math.cos(angle), y: origin.y + 140 * Math.sin(angle) }
        }
      }
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds, ready])

  function commitPos(id: string, pos: Pos) {
    setPositions(prev => ({ ...prev, [id]: pos }))
    setOverrides(prev => ({ ...prev, [id]: pos }))
  }

  return (
    <div ref={containerRef} className="h-full min-h-0 relative overflow-hidden">
      {!started && ready && (
        <div className="absolute inset-x-0 top-10 text-center pointer-events-none">
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#7E97BA]">NexDev Recruiter</p>
          <h1 className="text-xl font-semibold text-white mt-1">Click START to browse your roles</h1>
        </div>
      )}

      {ready && (
        <>
          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
            {visibleIds.map(({ id, parentId }) => {
              if (!parentId) return null
              const p1 = positions[parentId]
              const p2 = positions[id]
              if (!p1 || !p2) return null
              return (
                <line
                  key={id}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="rgba(52,210,255,.25)"
                  strokeWidth={1.5}
                />
              )
            })}
          </svg>

          <AnimatePresence>
            {visibleIds.map(({ id }, i) => {
              const pos = positions[id]
              if (!pos) return null

              if (id === 'start') {
                return (
                  <NodeBubble
                    key={id}
                    id={id}
                    label="START"
                    size={92}
                    dim={false}
                    ringClass="border-[#34D2FF]/70"
                    initial={pos}
                    index={i}
                    onOpen={() => setStarted(v => !v)}
                    onMoved={p => commitPos(id, p)}
                  />
                )
              }
              if (id.startsWith('company:')) {
                const name = id.slice('company:'.length)
                return (
                  <NodeBubble
                    key={id}
                    id={id}
                    label={shortLabel(name)}
                    size={104}
                    dim={false}
                    ringClass="border-[#F5B45C]/60"
                    initial={pos}
                    index={i}
                    onOpen={() =>
                      setExpanded(prev => {
                        const next = new Set(prev)
                        if (next.has(name)) next.delete(name)
                        else next.add(name)
                        return next
                      })
                    }
                    onMoved={p => commitPos(id, p)}
                  />
                )
              }
              const roleId = id.slice('role:'.length)
              const role = roles.find(r => r.id === roleId)
              if (!role) return null
              return (
                <NodeBubble
                  key={id}
                  id={id}
                  label={shortLabel(role.title)}
                  size={88}
                  dim={!OPEN_STATUSES.has(role.status)}
                  ringClass="border-[#5FE0A8]/60"
                  initial={pos}
                  index={i}
                  onOpen={() => onOpenRole(roleId)}
                  onMoved={p => commitPos(id, p)}
                />
              )
            })}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
