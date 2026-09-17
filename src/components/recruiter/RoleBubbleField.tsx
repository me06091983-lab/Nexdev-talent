'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Archive } from 'lucide-react'
import type { RecruiterRole } from './RecruiterClient'

const OPEN_STATUSES = new Set(['draft', 'active', 'on_hold'])

const STATUS_RING: Record<string, string> = {
  draft: 'border-gray-400/50',
  active: 'border-[#5FE0A8]/70',
  on_hold: 'border-amber-400/70',
  closed: 'border-gray-500/40',
  filled: 'border-[#2AA3FF]/60',
}

function shortTitle(title: string) {
  const words = title.split(' ')
  if (words.length <= 3) return title
  return words.slice(0, 3).join(' ') + '…'
}

function Bubble({
  role,
  size,
  dim,
  index,
  onOpen,
}: {
  role: RecruiterRole
  size: number
  dim: boolean
  index: number
  onOpen: () => void
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      animate={reduceMotion ? undefined : { y: [0, -7, 0] }}
      transition={reduceMotion ? undefined : { duration: 5.5 + (index % 4) * 0.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.22 }}
    >
      <motion.button
        layoutId={`role-bubble-${role.id}`}
        onClick={onOpen}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        style={{ width: size, height: size }}
        className={`relative rounded-full flex items-center justify-center text-center px-3 border-2 ${STATUS_RING[role.status] ?? 'border-white/20'} ${dim ? 'opacity-45 hover:opacity-80' : 'opacity-100'}`}
      >
        <div
          className="absolute inset-0 rounded-full deck-panel"
          style={{ boxShadow: dim ? 'none' : '0 8px 30px rgba(42,163,255,.14), inset 0 1px 0 rgba(255,255,255,.08)' }}
        />
        <span className={`relative font-medium text-white leading-snug ${size >= 110 ? 'text-[13px]' : 'text-[10.5px]'}`}>
          {shortTitle(role.title)}
        </span>
      </motion.button>
      <span className="text-[10.5px] text-[#7E97BA] font-mono max-w-[120px] truncate text-center">
        {role.client?.name ?? '—'}
      </span>
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
  const openRoles = roles.filter(r => OPEN_STATUSES.has(r.status))
  const closedRoles = roles.filter(r => !OPEN_STATUSES.has(r.status))

  return (
    <div className="h-full min-h-0 overflow-y-auto deck-scroll flex flex-col items-center justify-center gap-10 px-10 py-12">
      <div className="text-center">
        <p className="text-[11px] font-mono uppercase tracking-widest text-[#7E97BA]">NexDev Recruiter</p>
        <h1 className="text-xl font-semibold text-white mt-1">Pick a role to open its workspace</h1>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-10 max-w-4xl">
        {openRoles.length === 0 && (
          <p className="text-sm text-[#7E97BA]">No open roles right now.</p>
        )}
        {openRoles.map((r, i) => (
          <Bubble key={r.id} role={r} size={128} dim={false} index={i} onOpen={() => onSelect(r.id)} />
        ))}
      </div>

      {closedRoles.length > 0 && (
        <div className="w-full max-w-4xl flex flex-col items-center">
          <button
            onClick={() => setClosedOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#7E97BA] hover:text-[#C6D5EA] transition-colors"
          >
            <Archive size={12} /> Closed roles ({closedRoles.length})
          </button>
          {closedOpen && (
            <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-8 mt-6">
              {closedRoles.map((r, i) => (
                <Bubble key={r.id} role={r} size={84} dim index={i} onOpen={() => onSelect(r.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
