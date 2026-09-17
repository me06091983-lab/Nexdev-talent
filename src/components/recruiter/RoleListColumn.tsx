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
  draft: 'bg-gray-300',
  active: 'bg-green-400',
  on_hold: 'bg-amber-400',
  closed: 'bg-gray-300',
  filled: 'bg-[#2AA3FF]',
}

function fmtDeadline(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
  if (days < 0) return { text: 'Overdue', cls: 'text-red-500' }
  if (days <= 3) return { text: `${days}d left`, cls: 'text-red-500' }
  if (days <= 10) return { text: `${days}d left`, cls: 'text-amber-500' }
  return { text: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), cls: 'text-gray-400' }
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
      className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors border ${
        active
          ? 'bg-[#0B1A33] border-[#0B1A33] shadow-md'
          : 'bg-white border-gray-100 hover:border-[#2AA3FF]/40 hover:bg-blue-50/30'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[role.status] ?? 'bg-gray-300'}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium leading-snug truncate ${active ? 'text-white' : 'text-gray-900'}`}>
            {role.title}
          </p>
          <p className={`text-[11px] mt-0.5 truncate ${active ? 'text-white/50' : 'text-gray-400'}`}>
            {role.client?.name ?? 'No client'}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
              active ? 'bg-white/10 text-white/70' : 'bg-gray-50 text-gray-500'
            }`}>
              {STATUS_LABEL[role.status] ?? role.status}
            </span>
            {deadline && (
              <span className={`text-[10px] flex items-center gap-0.5 ${active ? 'text-white/50' : deadline.cls}`}>
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
    <div className="h-full min-h-0 flex flex-col bg-gray-50/60 border-r border-gray-200">
      <div className="flex-none px-4 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-[#2AA3FF]" />
          <h2 className="text-sm font-semibold text-gray-900">Roles</h2>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">{openRoles.length} open · {closedRoles.length} closed</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1.5">
        {openRoles.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">No open roles right now.</p>
        )}
        {openRoles.map(r => (
          <RoleRow key={r.id} role={r} active={r.id === selectedId} onClick={() => onSelect(r.id)} />
        ))}

        {closedRoles.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setClosedOpen(v => !v)}
              className="w-full flex items-center gap-1.5 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors"
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
