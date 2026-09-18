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

function nodeColor(id: string) {
  if (id === 'start') return '#34D2FF'
  if (id.startsWith('company:')) return '#F5B45C'
  return '#5FE0A8'
}

/** A gentle quadratic-bezier arc between two nodes instead of a flat line. */
function curvedPath(p1: Pos, p2: Pos) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const dist = Math.hypot(dx, dy) || 1
  const offset = Math.min(46, dist * 0.16)
  const mx = (p1.x + p2.x) / 2 + (-dy / dist) * offset
  const my = (p1.y + p2.y) / 2 + (dx / dist) * offset
  return `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`
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
          className={`water-bubble water-wobble relative rounded-full flex items-center justify-center text-center px-3 border-2 ${ringClass} ${
            dim ? 'opacity-45 hover:opacity-80' : ''
          }`}
        >
          <span
            className="relative font-semibold text-white leading-snug pointer-events-none"
            style={{ fontSize: size >= 120 ? 16.5 : 13.5, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}
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
          next[id] = overrides[id] ?? { x: origin.x + 240 * Math.cos(angle), y: origin.y + 240 * Math.sin(angle) }
        } else if (id.startsWith('role:')) {
          const roleId = id.slice('role:'.length)
          const company = companies.find(c => c.roles.some(r => r.id === roleId))
          const companyId = `company:${company?.name}`
          const siblings = company?.roles ?? []
          const idx = siblings.findIndex(r => r.id === roleId)
          const angle = (idx / Math.max(siblings.length, 1)) * 2 * Math.PI
          const origin = next[companyId] ?? centerPos
          next[id] = overrides[id] ?? { x: origin.x + 165 * Math.cos(angle), y: origin.y + 165 * Math.sin(angle) }
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

  const reduceMotion = useReducedMotion()
  const connections = useMemo(
    () =>
      visibleIds
        .filter(v => v.parentId && positions[v.parentId] && positions[v.id])
        .map(v => ({ id: v.id, parentId: v.parentId as string, p1: positions[v.parentId as string], p2: positions[v.id] })),
    [visibleIds, positions]
  )

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
            <defs>
              {connections.map(({ id, parentId, p1, p2 }, i) => (
                <linearGradient key={id} id={`link-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={nodeColor(parentId)} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={nodeColor(id)} stopOpacity={0.55} />
                </linearGradient>
              ))}
            </defs>
            {connections.map(({ id, p1, p2 }, i) => {
              const path = curvedPath(p1, p2)
              return (
                <g key={id}>
                  {/* soft base arc */}
                  <path d={path} fill="none" stroke={`url(#link-${i})`} strokeWidth={1.5} strokeLinecap="round" />
                  {/* bright travelling pulse on top, suggesting a live connection */}
                  {!reduceMotion && (
                    <motion.path
                      d={path}
                      fill="none"
                      stroke={`url(#link-${i})`}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeDasharray="1 22"
                      initial={{ strokeDashoffset: 0 }}
                      animate={{ strokeDashoffset: -23 }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </g>
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
                    size={108}
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
                    size={124}
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
                  size={104}
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
