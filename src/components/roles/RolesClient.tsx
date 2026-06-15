'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Pencil, Trash2, X, Kanban, ChevronRight, ChevronDown, Loader2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  rate: number | null
  rate_currency: string
  rate_type: string
  positions_count: number | null
  required_skills: Skill[]
  preferred_skills: Skill[]
  created_at: string
}

interface InterviewSlot {
  label: string
  enabled: boolean
  datetime: string
  status: 'waiting_customer' | 'set' | 'passed' | 'rejected'
  feedback: string
}

interface Submission {
  id: string
  status: string
  ai_score: number | null
  submission_rate: number | null
  submission_currency: string | null
  submission_rate_type: string | null
  interviews: InterviewSlot[]
  candidate: {
    first_name: string
    last_name: string
  } | null
}

const STATUS_LABELS: Record<string, { label: string; variant: 'gray' | 'blue' | 'green' | 'yellow' | 'red' }> = {
  draft:   { label: 'Draft',    variant: 'gray' },
  active:  { label: 'Activ',   variant: 'green' },
  on_hold: { label: 'On Hold', variant: 'yellow' },
  closed:  { label: 'Închis',  variant: 'red' },
  filled:  { label: 'Ocupat',  variant: 'blue' },
}

const PIPELINE_LABELS: Record<string, { label: string; cls: string }> = {
  pipeline:    { label: 'În recrutare',  cls: 'bg-slate-100 text-slate-600' },
  submitted:   { label: 'Propus client', cls: 'bg-blue-50 text-blue-600' },
  shortlisted: { label: 'Selectat',      cls: 'bg-purple-50 text-purple-600' },
  interview:   { label: 'Interviu',      cls: 'bg-amber-50 text-amber-600' },
  rejected:    { label: 'Respins',       cls: 'bg-red-50 text-red-500' },
  offer:       { label: 'Ofertă',        cls: 'bg-green-50 text-green-600' },
}

const STATUS_GROUP_ORDER = ['active', 'filled', 'on_hold', 'draft', 'closed']
const STATUS_GROUP_LABELS: Record<string, string> = {
  active:  'Roluri active',
  filled:  'Roluri ocupate',
  on_hold: 'On Hold',
  draft:   'Draft',
  closed:  'Închise',
}

const INTERVIEW_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  waiting_customer: { label: 'Așteptare',  cls: 'bg-gray-100 text-gray-500' },
  set:              { label: 'Programat',  cls: 'bg-blue-50 text-blue-600' },
  passed:           { label: 'Trecut',     cls: 'bg-green-50 text-green-600' },
  rejected:         { label: 'Respins',    cls: 'bg-red-50 text-red-500' },
}

const SENIORITY_LABELS: Record<string, string> = {
  junior: 'Junior', mid: 'Mid', senior: 'Senior', lead: 'Lead', principal: 'Principal',
}

// ─── Candidates sub-table ─────────────────────────────────────────────────────
// Uses table-layout:fixed + colgroup so column widths are identical across every
// expanded role, regardless of the parent table's column widths.

function CandidatesSubTable({ roleId }: { roleId: string }) {
  const [subs, setSubs] = useState<Submission[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    const timeout = setTimeout(() => { setLoadError(true); setLoading(false) }, 10000)
    try {
      const res = await fetch(`/api/submissions?role_id=${roleId}`)
      const data = await res.json()
      setSubs(data ?? [])
    } catch {
      setLoadError(true)
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }, [roleId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 text-gray-400 text-sm">
        <Loader2 size={14} className="animate-spin" /> Se încarcă candidații...
      </div>
    )
  }

  if (loadError) {
    return <p className="py-3 px-4 text-sm text-red-400 italic">Eroare la încărcarea candidaților. Reîncarcă pagina.</p>
  }

  if (!subs?.length) {
    return <p className="py-3 px-4 text-sm text-gray-400 italic">Niciun candidat adăugat în pipeline.</p>
  }

  return (
    <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '30%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '22%' }} />
        <col style={{ width: '17%' }} />
        <col style={{ width: '17%' }} />
      </colgroup>
      <thead>
        <tr className="bg-gray-50/80 text-left">
          <th className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Candidat</th>
          <th className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Rate propus</th>
          <th className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Stagiu</th>
          <th className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Interviu</th>
          <th className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status interviu</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {subs.map(s => {
          const c = s.candidate
          const rate = s.submission_rate
          const currency = s.submission_currency ?? 'EUR'
          const rateType = s.submission_rate_type === 'daily' ? '/zi' : '/oră'
          const pipeline = PIPELINE_LABELS[s.status] ?? { label: s.status, cls: 'bg-gray-100 text-gray-500' }
          const checkedSlots = (s.interviews ?? []).filter(i => i.enabled)
          const latestSlot = checkedSlots.length ? checkedSlots[checkedSlots.length - 1] : null
          const intStatus = latestSlot ? (INTERVIEW_STATUS_LABELS[latestSlot.status] ?? { label: latestSlot.status, cls: 'bg-gray-100 text-gray-500' }) : null

          return (
            <tr key={s.id} className="hover:bg-blue-50/20 transition-colors">
              <td className="px-4 py-2 overflow-hidden">
                <span className="font-medium text-gray-800 truncate block">
                  {c ? `${c.first_name} ${c.last_name}` : '—'}
                </span>
                {s.ai_score != null && (
                  <span className="text-[10px] text-gray-400">{Math.round(s.ai_score)}% match</span>
                )}
              </td>
              <td className="px-4 py-2 overflow-hidden">
                {rate
                  ? <span className="font-medium text-amber-700">{rate} {currency}<span className="text-gray-400 font-normal text-[10px] ml-0.5">{rateType}</span></span>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-2 overflow-hidden">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${pipeline.cls}`}>
                  {pipeline.label}
                </span>
              </td>
              <td className="px-4 py-2 overflow-hidden">
                {latestSlot
                  ? <span className="text-[11px] font-medium text-blue-600">{latestSlot.label.replace('Interview', 'Int.')}</span>
                  : <span className="text-gray-300">—</span>
                }
              </td>
              <td className="px-4 py-2 overflow-hidden">
                {intStatus
                  ? <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${intStatus.cls}`}>{intStatus.label}</span>
                  : <span className="text-gray-300">—</span>
                }
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RolesClient({ roles, clients }: { roles: Role[]; clients: Client[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

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

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Ștergi rolul "${title}"?`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d.error ?? 'Eroare la ștergerea rolului.')
        return
      }
      router.refresh()
    } finally {
      setDeleting(null)
    }
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
        <div className="space-y-6">
          {STATUS_GROUP_ORDER.map(groupStatus => {
            const groupRoles = filtered.filter(r => r.status === groupStatus)
            if (groupRoles.length === 0) return null
            const groupLabel = STATUS_GROUP_LABELS[groupStatus]
            const isInactive = groupStatus === 'closed' || groupStatus === 'draft'
            return (
              <div key={groupStatus}>
                <div className="flex items-center gap-3 mb-2 px-1">
                  <h2 className={cn('text-sm font-semibold', isInactive ? 'text-gray-400' : 'text-gray-700')}>
                    {groupLabel}
                  </h2>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    groupStatus === 'active' ? 'bg-green-100 text-green-700' :
                    groupStatus === 'filled' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  )}>
                    {groupRoles.length}
                  </span>
                  <div className={cn('flex-1 h-px', isInactive ? 'bg-gray-100' : 'bg-gray-200')} />
                </div>
                <div className={cn('glass rounded-2xl overflow-hidden', isInactive && 'opacity-70')}>
                  <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '3%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '6%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '13%' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-white/40 bg-white/30 text-left">
                        <th className="px-2 py-3"></th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Skilluri cheie</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Poziții</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deadline</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupRoles.map(r => {
                        const isExpanded = expanded.has(r.id)
                        return (
                          <Fragment key={r.id}>
                            <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                              <td className="px-2 py-3 text-center">
                                <button
                                  onClick={() => toggleExpand(r.id)}
                                  className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                                  title={isExpanded ? 'Restrânge' : 'Extinde candidați'}
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900 text-sm">{r.title}</div>
                                <div className="text-xs text-gray-400 mt-0.5 space-x-2">
                                  {r.seniority && <span>{SENIORITY_LABELS[r.seniority]}</span>}
                                  {r.location && <span>📍 {r.location}</span>}
                                  {r.fieldglass_id && <span className="font-mono text-gray-500">{r.fieldglass_id}</span>}
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
                              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                {r.rate ? (
                                  <span>{r.rate} {r.rate_currency} <span className="text-gray-400 text-xs">/ {r.rate_type === 'daily' ? 'zi' : 'oră'}</span></span>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {(r.positions_count ?? 1) > 1 ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                                    {r.positions_count}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-sm">1</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {r.deadline
                                  ? new Date(r.deadline).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
                                  : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                  <Link href={`/roles/${r.id}/pipeline`}
                                    className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded transition-colors"
                                    title="Pipeline">
                                    <Kanban size={15} />
                                  </Link>
                                  {r.status === 'closed' ? (
                                    <Link href={`/roles/${r.id}`}
                                      className="p-1.5 text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50 rounded transition-colors"
                                      title="Vizualizează">
                                      <Eye size={15} />
                                    </Link>
                                  ) : (
                                    <>
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
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-gray-50/40 border-b border-gray-200">
                                <td className="border-l-2 border-blue-200"></td>
                                <td colSpan={7} className="py-1">
                                  <CandidatesSubTable roleId={r.id} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
