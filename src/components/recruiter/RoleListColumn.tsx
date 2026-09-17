'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Briefcase, Archive, Clock } from 'lucide-react'
import type { RecruiterRole } from './RecruiterClient'

const OPEN_STATUSES = new Set(['draft', 'active', 'on_hold'])

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  on_hold: 'On hold',
  closed: 'Closed',
  filled: 'Filled',
}

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-gray-400',
  active: 'bg-[#5FE0A8]',
  on_hold: 'bg-amber-400',
  closed: 'bg-gray-500',
  filled: 'bg-[#2AA3FF]',
}

function fmtDeadline(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
  if (days < 0) return { text: 'Overdue', cls: 'text-red-400' }
  if (days <= 3) return { text: `${days}d left`, cls: 'text-red-400' }
  if (days <= 10) return { text: `${days}d left`, cls: 'text-amber-400' }
  return { text: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), cls: 'text-[#7E97BA]' }
}

function RoleRow({
  role,
  active,
  onClick,
}: {
  role: RecruiterRole
  active: boolean
  onClick: () => void
}) {
  const deadline = fmtDeadline(role.deadline)
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3.5 py-3 rounded-xl transition-all border ${
        active
          ? 'bg-[#2AA3FF]/12 border-[#2AA3FF]/50 shadow-[0_0_0_1px_rgba(42,163,255,.15),0_8px_24px_rgba(42,163,255,.12)]'
          : 'deck-card'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[role.status] ?? 'bg-gray-400'}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium leading-snug truncate ${active ? 'text-white' : 'text-[#EAF1FC]'}`}>
            {role.title}
          </p>
          <p className="text-[11px] mt-0.5 truncate text-[#7E97BA]">
            {role.client?.name ?? 'No client'}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] font-mono font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/5 text-[#9FB6D6]">
              {STATUS_LABEL[role.status] ?? role.status}
            </span>
            {deadline && (
              <span className={`text-[10px] font-mono flex items-center gap-0.5 ${deadline.cls}`}>
                <Clock size={9} /> {deadline.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export function RoleListColumn({
  roles,
  selectedId,
  onSelect,
}: {
  roles: RecruiterRole[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [closedOpen, setClosedOpen] = useState(false)

  const openRoles = roles.filter(r => OPEN_STATUSES.has(r.status))
  const closedRoles = roles.filter(r => !OPEN_STATUSES.has(r.status))

  return (
    <div className="h-full min-h-0 flex flex-col deck-panel border-r-0">
      <div className="flex-none px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-[#2AA3FF]" />
          <h2 className="text-sm font-semibold text-white">Roles</h2>
        </div>
        <p className="text-[11px] text-[#7E97BA] mt-0.5 font-mono">{openRoles.length} open · {closedRoles.length} closed</p>
      </div>

      <div className="deck-scroll flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1.5">
        {openRoles.length === 0 && (
          <p className="text-xs text-[#7E97BA] text-center py-6">No open roles right now.</p>
        )}
        {openRoles.map(r => (
          <RoleRow key={r.id} role={r} active={r.id === selectedId} onClick={() => onSelect(r.id)} />
        ))}

        {closedRoles.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setClosedOpen(v => !v)}
              className="w-full flex items-center gap-1.5 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#7E97BA] hover:text-[#C6D5EA] transition-colors"
            >
              {closedOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <Archive size={12} />
              Closed roles ({closedRoles.length})
            </button>
            {closedOpen && (
              <div className="space-y-1.5 mt-1">
                {closedRoles.map(r => (
                  <RoleRow key={r.id} role={r} active={r.id === selectedId} onClick={() => onSelect(r.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
