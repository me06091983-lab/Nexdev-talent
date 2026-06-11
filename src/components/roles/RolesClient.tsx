'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Pencil, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface Skill { id: string; name: string; category: string }
interface Client { id: string; name: string }
interface Role {
  id: string
  title: string
  client: Client | null
  client_id: string
  location: string | null
  seniority: string | null
  collaboration_type: string | null
  status: string
  fieldglass_id: string | null
  deadline: string | null
  required_skills: Skill[]
  preferred_skills: Skill[]
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; variant: 'gray' | 'blue' | 'green' | 'yellow' | 'red' }> = {
  draft:   { label: 'Draft',    variant: 'gray' },
  active:  { label: 'Activ',   variant: 'green' },
  on_hold: { label: 'On Hold', variant: 'yellow' },
  closed:  { label: 'Închis',  variant: 'red' },
  filled:  { label: 'Ocupat',  variant: 'blue' },
}

const SENIORITY_LABELS: Record<string, string> = {
  junior: 'Junior', mid: 'Mid', senior: 'Senior', lead: 'Lead', principal: 'Principal',
}

export function RolesClient({ roles, clients }: { roles: Role[]; clients: Client[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = roles.filter(r => {
    if (search) {
      const q = search.toLowerCase()
      if (!r.title.toLowerCase().includes(q) && !r.fieldglass_id?.toLowerCase().includes(q)) return false
    }
    if (clientFilter && r.client_id !== clientFilter) return false
    if (statusFilter && r.status !== statusFilter) return false
    return true
  })

  const hasFilters = search || clientFilter || statusFilter

  function clearAll() {
    setSearch('')
    setClientFilter('')
    setStatusFilter('')
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Ștergi rolul "${title}"?`)) return
    setDeleting(id)
    await fetch(`/api/roles/${id}`, { method: 'DELETE' })
    setDeleting(null)
    router.refresh()
  }

  return (
    <div>
      {/* Filtre */}
      <div className="glass rounded-2xl p-4 mb-6 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Titlu sau Fieldglass ID..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]" />
          </div>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]">
            <option value="">Toți clienții</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]">
            <option value="">Toate statusurile</option>
            {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <div className="flex justify-end">
            <button onClick={clearAll}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
              <X size={12} /> Resetează filtrele
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {filtered.length} {filtered.length === 1 ? 'rol' : 'roluri'}
          {hasFilters && <span className="text-gray-400"> din {roles.length} total</span>}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-gray-400">Niciun rol găsit{hasFilters ? ' pentru filtrele aplicate' : ''}.</p>
          {hasFilters && (
            <button onClick={clearAll} className="mt-3 text-sm text-[#2AA3FF] hover:underline">
              Resetează filtrele
            </button>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/40 bg-white/30 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Skilluri cheie</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deadline</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => {
                const statusInfo = STATUS_LABELS[r.status] ?? { label: r.status, variant: 'gray' as const }
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{r.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5 space-x-2">
                        {r.seniority && <span>{SENIORITY_LABELS[r.seniority]}</span>}
                        {r.location && <span>📍 {r.location}</span>}
                        {r.fieldglass_id && (
                          <span className="font-mono text-gray-500">{r.fieldglass_id}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.client?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.required_skills.slice(0, 4).map(s => (
                          <Badge key={s.id} variant="blue">{s.name}</Badge>
                        ))}
                        {r.required_skills.length > 4 && (
                          <Badge variant="gray">+{r.required_skills.length - 4}</Badge>
                        )}
                        {r.required_skills.length === 0 && r.preferred_skills.slice(0, 3).map(s => (
                          <Badge key={s.id} variant="gray">{s.name}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {r.deadline
                        ? new Date(r.deadline).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/roles/${r.id}`}
                          className="p-1.5 text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50 rounded transition-colors"
                          title="Editează">
                          <Pencil size={15} />
                        </Link>
                        <button onClick={() => handleDelete(r.id, r.title)}
                          disabled={deleting === r.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Șterge">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
