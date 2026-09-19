'use client'

import { useMemo, useState } from 'react'
import { Building2, Search, Users } from 'lucide-react'
import { RoleDetailPanel } from './RoleDetailPanel'

interface Skill { id: string; name: string }

export interface RecruiterRole {
  id: string
  title: string
  status: string
  deadline: string | null
  description: string | null
  seniority: string | null
  location: string | null
  collaboration_type: string | null
  fieldglass_id: string | null
  recruiter_rate: number | null
  recruiter_rate_currency: string
  recruiter_rate_type: string
  client: { id: string; name: string } | null
  required_skills: Skill[]
  preferred_skills: Skill[]
}

export function RecruiterClient({
  roles,
  myCounts,
  currentUserId,
  initialRoleId,
  assessSubmissionId,
}: {
  roles: RecruiterRole[]
  myCounts: Record<string, number>
  currentUserId: string | null
  initialRoleId: string | null
  assessSubmissionId: string | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    roles.some(r => r.id === initialRoleId) ? initialRoleId : (roles[0]?.id ?? null)
  )
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const byClient = new Map<string, { name: string; roles: RecruiterRole[] }>()
    for (const r of roles) {
      if (q && !r.title.toLowerCase().includes(q) && !(r.client?.name ?? '').toLowerCase().includes(q)) continue
      const key = r.client?.id ?? 'none'
      if (!byClient.has(key)) byClient.set(key, { name: r.client?.name ?? 'No client', roles: [] })
      byClient.get(key)!.roles.push(r)
    }
    return [...byClient.values()]
      .map(g => ({ ...g, roles: g.roles.sort((a, b) => a.title.localeCompare(b.title)) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [roles, query])

  function selectRole(id: string) {
    setSelectedId(id)
    window.history.replaceState(null, '', `/recruiter?role=${id}`)
  }

  const selected = roles.find(r => r.id === selectedId) ?? null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recruiter</h1>
        <p className="text-gray-500 mt-1">{roles.length} active roles · pick a role, add candidates, follow their status</p>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6 items-start">
        <aside className="glass rounded-2xl p-3 sticky top-4 max-h-[calc(100vh-2rem)] flex flex-col">
          <div className="relative mb-3 flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search role or client"
              className="glass-input w-full pl-8 pr-3 py-2 rounded-lg text-sm"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            {groups.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">
                {roles.length === 0 ? 'No active roles.' : 'No roles match your search.'}
              </p>
            )}
            {groups.map(group => (
              <div key={group.name}>
                <div className="flex items-center gap-1.5 px-2 mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <Building2 size={12} />
                  <span className="flex-1 truncate">{group.name}</span>
                  <span className="text-gray-400">{group.roles.length}</span>
                </div>
                <div className="space-y-0.5">
                  {group.roles.map(role => {
                    const active = role.id === selectedId
                    const count = myCounts[role.id] ?? 0
                    return (
                      <button
                        key={role.id}
                        onClick={() => selectRole(role.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                          active ? 'bg-[#2AA3FF] text-white shadow-sm' : 'text-gray-700 hover:bg-blue-50'
                        }`}
                      >
                        <span className="flex-1 truncate font-medium">{role.title}</span>
                        <span
                          title="Candidates you added"
                          className={`flex-none inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md ${
                            active ? 'bg-white/20 text-white' : count ? 'bg-blue-50 text-[#2AA3FF]' : 'text-gray-300'
                          }`}
                        >
                          <Users size={11} /> {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0">
          {selected ? (
            <RoleDetailPanel
              key={selected.id}
              role={selected}
              currentUserId={currentUserId}
              assessSubmissionId={selected.id === initialRoleId ? assessSubmissionId : null}
            />
          ) : (
            <div className="glass rounded-2xl p-12 text-center text-gray-400">Select a role on the left.</div>
          )}
        </main>
      </div>
    </div>
  )
}
