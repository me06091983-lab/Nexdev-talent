'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Users,
  FileText,
  TrendingUp,
  Activity,
  Briefcase,
  Send,
  Calendar,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Receipt,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  Area,
  Line,
  Legend,
} from 'recharts'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardData {
  candidates: {
    total: number
    byStatus: { pasiv: number; activ: number; angajat: number }
    bySource: { own: number; recruiter: number; partner: number }
    recentlyAdded: number
  }
  roles: { total: number; active: number; onHold: number; closed: number }
  submissionsByStatus: Record<string, number>
  recentActivity: Array<{
    id: string
    status: string
    updated_at: string
    candidate: { id: string; first_name: string; last_name: string } | null
    role: { id: string; title: string } | null
    client: { name: string } | null
  }>
  openRoles: Array<{
    id: string
    title: string
    status: string
    clientName: string | null
    candidatesCount: number
  }>
  candidatesByRole: Array<{
    roleId: string
    roleTitle: string
    clientName: string
    candidates: Array<{ submissionId: string; candidateName: string; status: string; updated_at: string }>
  }>
  interviewCandidates: Array<{
    id: string
    candidateName: string
    roleTitle: string | null
    clientName: string | null
    status: string
    updated_at: string
  }>
  contracts: {
    active: number
    terminated: number
    expiringContracts: Array<{
      id: string
      candidate: { first_name: string; last_name: string } | null
      role: { title: string } | null
      client: { name: string } | null
      end_date: string
      daysLeft: number
      currency: string
      bill_rate: number
      rate_type: string
    }>
    byClient: Array<{ client: string; count: number; monthlyRevenue: number; currency: string }>
    recentContracts: Array<{
      id: string
      candidateName: string
      roleTitle: string | null
      clientName: string | null
      start_date: string
      end_date: string | null
      bill_rate: number
      pay_rate: number
      rate_type: string
      currency: string
      contract_status: string
    }>
    byCurrency: Array<{
      currency: string
      revenue: number
      cost: number
      margin: number
      marginPct: number
      count: number
    }>
  }
  financials: {
    monthly: Array<{ label: string; year: number; month: number; revenue: number; cost: number; comms: number; profit: number }>
    ytd: { revenue: number; cost: number; comms: number; profit: number }
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  new: 'Nou',
  cv_received: 'CV primit',
  in_review: 'În analiză',
  match_found: 'Potrivire identificată',
  to_contact: 'De contactat',
  contacted: 'Contactat',
  screening_scheduled: 'Screening programat',
  screening_done: 'Screening realizat',
  submitted: 'Propus client',
  offer: 'Ofertă',
  rejected: 'Respins',
  on_hold: 'În așteptare',
  pipeline: 'Pipeline',
}

const PIPELINE_STAGE_ORDER = [
  'new', 'cv_received', 'in_review', 'match_found', 'to_contact',
  'contacted', 'screening_scheduled', 'screening_done', 'submitted', 'offer',
]

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  cv_received: 'bg-blue-50 text-blue-600',
  in_review: 'bg-indigo-50 text-indigo-600',
  match_found: 'bg-purple-50 text-purple-600',
  to_contact: 'bg-amber-50 text-amber-700',
  contacted: 'bg-orange-50 text-orange-600',
  screening_scheduled: 'bg-cyan-50 text-cyan-700',
  screening_done: 'bg-teal-50 text-teal-700',
  submitted: 'bg-green-50 text-green-700',
  offer: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-50 text-red-600',
  on_hold: 'bg-yellow-50 text-yellow-700',
  pipeline: 'bg-gray-100 text-gray-600',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('ro-RO', { maximumFractionDigits: 0 })
}

function fmtK(n: number) {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`
  return fmt(n)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}z`
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-200 rounded-xl', className)} />
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-5 h-64" />
        <Skeleton className="col-span-7 h-64" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, iconColor, iconBg,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  iconColor: string
  iconBg: string
}) {
  return (
    <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
        <Icon size={16} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-400 leading-none mb-1 truncate">{label}</p>
        <p className="text-xl font-bold text-[#0B1A33] leading-none">{value}</p>
      </div>
    </div>
  )
}

// ─── Chart placeholder ───────────────────────────────────────────────────────

function ChartPlaceholder({ height }: { height: number }) {
  return <div className="bg-gray-100 rounded-xl w-full" style={{ height }} />
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FinancialTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500 capitalize">{p.name}:</span>
          <span className="font-medium text-gray-800">{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PipelineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 text-xs">
      <p className="font-semibold text-gray-700">{item.payload.label}</p>
      <p className="text-[#2AA3FF] font-medium">{item.value} candidați</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ClientRevenueTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 text-xs">
      <p className="font-semibold text-gray-700">{item.payload.client}</p>
      <p className="text-indigo-600 font-medium">{item.payload.count} contracte</p>
      <p className="text-gray-600">Revenue: {fmt(item.value)}</p>
    </div>
  )
}

// ─── Tab 1: Recrutare ─────────────────────────────────────────────────────────

function TabRecrutare({ data, mounted }: { data: DashboardData; mounted: boolean }) {
  const [actions, setActions] = useState<{ id: string; text: string }[]>([])
  const [newAction, setNewAction] = useState('')
  const [collapsedRoles, setCollapsedRoles] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexdev_dashboard_actions')
      if (saved) setActions(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  function toggleRole(roleId: string) {
    setCollapsedRoles(prev => {
      const next = new Set(prev)
      if (next.has(roleId)) next.delete(roleId)
      else next.add(roleId)
      return next
    })
  }

  function addAction() {
    const trimmed = newAction.trim()
    if (!trimmed) return
    const updated = [...actions, { id: crypto.randomUUID(), text: trimmed }]
    setActions(updated)
    setNewAction('')
    localStorage.setItem('nexdev_dashboard_actions', JSON.stringify(updated))
  }

  function removeAction(id: string) {
    const updated = actions.filter(a => a.id !== id)
    setActions(updated)
    localStorage.setItem('nexdev_dashboard_actions', JSON.stringify(updated))
  }

  const totalSubmissions = Object.values(data.submissionsByStatus).reduce((s, v) => s + v, 0)
  const rejectedCount = data.submissionsByStatus['rejected'] ?? 0
  const activeSubmissions = totalSubmissions - rejectedCount

  const pieData = [
    { name: 'Pasiv', value: data.candidates.byStatus.pasiv, color: '#94a3b8' },
    { name: 'Activ', value: data.candidates.byStatus.activ, color: '#2AA3FF' },
    { name: 'Angajat', value: data.candidates.byStatus.angajat, color: '#22c55e' },
  ]

  return (
    <div className="space-y-5">
      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Candidați" value={data.candidates.total} icon={Users} iconColor="text-blue-500" iconBg="bg-blue-50" />
        <StatCard label="Activi în pipeline" value={data.candidates.byStatus.activ} icon={Activity} iconColor="text-green-500" iconBg="bg-green-50" />
        <StatCard label="Roluri active" value={data.roles.active} icon={Briefcase} iconColor="text-indigo-500" iconBg="bg-indigo-50" />
        <StatCard label="Submisii active" value={activeSubmissions} icon={Send} iconColor="text-amber-500" iconBg="bg-amber-50" />
      </div>

      {/* Row 2: Pie chart + Candidați per rol */}
      <div className="grid grid-cols-12 gap-4">
        {/* Pie chart */}
        <div className="col-span-5 glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Candidați pe status</h3>
          {mounted ? (
            <div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ cx, cy }) => (
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={cx} dy="-6" fontSize={22} fontWeight={700} fill="#0B1A33">{data.candidates.total}</tspan>
                        <tspan x={cx} dy={20} fontSize={10} fill="#94a3b8">total</tspan>
                      </text>
                    )}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-1">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </div>
          ) : <ChartPlaceholder height={220} />}
        </div>

        {/* Candidați per rol */}
        <div className="col-span-7 glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Candidați per rol</h3>
          {data.candidatesByRole.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
              <div className="text-center">
                <Users size={24} className="mx-auto mb-2 text-gray-300" />
                Niciun candidat activ în pipeline
              </div>
            </div>
          ) : (
            <div className="space-y-1 overflow-y-auto max-h-[270px] pr-1">
              {data.candidatesByRole.map(group => {
                const isCollapsed = collapsedRoles.has(group.roleId)
                return (
                  <div key={group.roleId} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleRole(group.roleId)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      {isCollapsed
                        ? <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                        : <ChevronDown size={14} className="text-[#2AA3FF] flex-shrink-0" />
                      }
                      <span className="text-xs font-semibold text-gray-800 truncate flex-1">{group.roleTitle}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{group.clientName}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 flex-shrink-0 ml-1">
                        {group.candidates.length}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="border-t border-gray-50 divide-y divide-gray-50">
                        {group.candidates.map(c => (
                          <div key={c.submissionId} className="flex items-center justify-between px-4 py-2">
                            <span className="text-xs text-gray-600">{c.candidateName}</span>
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2', STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500')}>
                              {PIPELINE_STAGE_LABELS[c.status] ?? c.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Roluri deschise + Activitate recentă */}
      <div className="grid grid-cols-2 gap-4">
        {/* Roluri deschise */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Roluri deschise</h3>
          {data.openRoles.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              <div className="text-center">
                <Briefcase size={20} className="mx-auto mb-2 text-gray-300" />
                Niciun rol deschis momentan
              </div>
            </div>
          ) : (
            <div className="space-y-1 overflow-y-auto max-h-[200px]">
              {data.openRoles.map(role => (
                <div key={role.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{role.title}</p>
                    <p className="text-[10px] text-gray-400">{role.clientName ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-gray-400 tabular-nums">{role.candidatesCount} candidați</span>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      role.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    )}>
                      {role.status === 'active' ? 'Activ' : 'În așteptare'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">
              <span className="font-medium text-[#2AA3FF]">{data.candidates.recentlyAdded}</span> candidați adăugați în ultimele 30 zile
            </p>
          </div>
        </div>

        {/* Activitate recentă */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Activitate recentă</h3>
          {data.recentActivity.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              <div className="text-center">
                <Activity size={20} className="mx-auto mb-2 text-gray-300" />
                Nicio activitate
              </div>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[200px] pr-1">
              {data.recentActivity.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {item.candidate ? `${item.candidate.first_name} ${item.candidate.last_name}` : '—'}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {item.role?.title ?? '—'} · {item.client?.name ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-500')}>
                      {PIPELINE_STAGE_LABELS[item.status] ?? item.status}
                    </span>
                    <span className="text-[10px] text-gray-300 tabular-nums">{timeAgo(item.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Candidați la interviu */}
      {data.interviewCandidates.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Candidați la interviu</h3>
          <div className="grid grid-cols-2 gap-2">
            {data.interviewCandidates.map(c => (
              <div key={c.id} className={cn(
                'flex items-center gap-3 p-3 rounded-xl border',
                c.status === 'screening_scheduled' ? 'bg-cyan-50/60 border-cyan-100' : 'bg-teal-50/60 border-teal-100'
              )}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800">{c.candidateName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{c.roleTitle ?? '—'} · {c.clientName ?? '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={cn(
                    'block text-[10px] px-2 py-0.5 rounded-full font-medium mb-0.5',
                    c.status === 'screening_scheduled' ? 'bg-cyan-100 text-cyan-700' : 'bg-teal-100 text-teal-700'
                  )}>
                    {PIPELINE_STAGE_LABELS[c.status]}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(c.updated_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 5: Acțiuni */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Acțiuni</h3>
        <div className="flex gap-2 mb-4">
          <input
            value={newAction}
            onChange={e => setNewAction(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAction()}
            placeholder="Adaugă o acțiune nouă..."
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2AA3FF] placeholder:text-gray-300"
          />
          <button
            onClick={addAction}
            className="px-4 py-2 bg-[#0B1A33] text-white text-sm font-medium rounded-xl hover:bg-[#162540] transition-colors flex-shrink-0"
          >
            Adaugă
          </button>
        </div>
        {actions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">
            Nicio acțiune adăugată. Folosește câmpul de mai sus pentru a adăuga.
          </p>
        ) : (
          <div className="space-y-2">
            {actions.map(action => (
              <label key={action.id} className="flex items-center gap-3 cursor-pointer group py-1.5 border-b border-gray-50 last:border-0">
                <input
                  type="checkbox"
                  onChange={() => removeAction(action.id)}
                  className="w-4 h-4 rounded cursor-pointer accent-[#2AA3FF] flex-shrink-0"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{action.text}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab 2: Contracte ─────────────────────────────────────────────────────────

function TabContracte({ data, mounted }: { data: DashboardData; mounted: boolean }) {
  const [actions, setActions] = useState<{ id: string; text: string }[]>([])
  const [newAction, setNewAction] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexdev_dashboard_actions_contracte')
      if (saved) setActions(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  function addAction() {
    const trimmed = newAction.trim()
    if (!trimmed) return
    const updated = [...actions, { id: crypto.randomUUID(), text: trimmed }]
    setActions(updated)
    setNewAction('')
    localStorage.setItem('nexdev_dashboard_actions_contracte', JSON.stringify(updated))
  }

  function removeAction(id: string) {
    const updated = actions.filter(a => a.id !== id)
    setActions(updated)
    localStorage.setItem('nexdev_dashboard_actions_contracte', JSON.stringify(updated))
  }

  const expiring30 = data.contracts.expiringContracts.filter(c => c.daysLeft <= 30).length
  const expiring31to60 = data.contracts.expiringContracts.filter(c => c.daysLeft > 30 && c.daysLeft <= 60).length

  const ratePieData = [
    { name: 'Daily', value: 0, color: '#6366f1' },
    { name: 'Hourly', value: 0, color: '#a855f7' },
  ]
  for (const c of data.contracts.expiringContracts) {
    if (c.rate_type === 'daily') ratePieData[0].value++
    else ratePieData[1].value++
  }
  const remainingActive = data.contracts.active - data.contracts.expiringContracts.length
  if (remainingActive > 0) ratePieData[0].value += remainingActive

  const statusPieData = [
    { name: 'Active', value: data.contracts.active, color: '#22c55e' },
    { name: 'Terminate', value: data.contracts.terminated, color: '#94a3b8' },
  ]

  return (
    <div className="space-y-5">
      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Contracte active" value={data.contracts.active} icon={Users} iconColor="text-green-600" iconBg="bg-green-50" />
        <div className={cn('glass rounded-2xl px-4 py-3 flex items-center gap-3', expiring30 > 0 ? 'border border-red-200 bg-red-50/30' : '')}>
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', expiring30 > 0 ? 'bg-red-50' : 'bg-amber-50')}>
            <Calendar size={16} className={expiring30 > 0 ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-gray-400 leading-none mb-1">Expiră în 30 zile</p>
            <p className={cn('text-xl font-bold leading-none', expiring30 > 0 ? 'text-red-600' : 'text-[#0B1A33]')}>{expiring30}</p>
          </div>
        </div>
        <StatCard label="Expiră 31-60 zile" value={expiring31to60} icon={Calendar} iconColor="text-amber-500" iconBg="bg-amber-50" />
        <StatCard label="Total terminate" value={data.contracts.terminated} icon={XCircle} iconColor="text-gray-400" iconBg="bg-gray-100" />
      </div>

      {/* Row 2: Contracte recente + Expiring list */}
      <div className="grid grid-cols-2 gap-4">
        {/* Contracte emise în ultima lună */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#0B1A33]">Contracte noi — ultima lună</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full">
              {data.contracts.recentContracts.length}
            </span>
          </div>
          {data.contracts.recentContracts.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
              <div className="text-center">
                <FileText size={24} className="mx-auto mb-2 text-gray-300" />
                Niciun contract nou în ultima lună
              </div>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[270px] pr-1">
              {data.contracts.recentContracts.map(c => (
                <div key={c.id} className="border border-gray-100 rounded-xl px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{c.candidateName}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        {c.roleTitle ?? '—'} · {c.clientName ?? '—'}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                      c.contract_status === 'activ' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {c.contract_status === 'activ' ? 'Activ' : c.contract_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                    <span>Start: {new Date(c.start_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {c.end_date && <span>· End: {new Date(c.end_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    <span className="ml-auto font-medium text-gray-600">
                      {c.bill_rate} {c.currency}/{c.rate_type === 'daily' ? 'zi' : 'h'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring contracts list */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Contracte care expiră în 60 zile</h3>
          {data.contracts.expiringContracts.length === 0 ? (
            <div className="flex items-center justify-center h-52 gap-2 text-green-600 text-sm">
              <CheckCircle size={18} />
              <span>Nicio expirare în 60 de zile</span>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[270px] pr-1">
              {data.contracts.expiringContracts.map(c => (
                <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {c.candidate ? `${c.candidate.first_name} ${c.candidate.last_name}` : '—'}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{c.role?.title ?? '—'} · {c.client?.name ?? '—'}</p>
                    <p className="text-[10px] text-gray-400">
                      Expiră: {new Date(c.end_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0',
                    c.daysLeft <= 14 ? 'bg-red-50 text-red-700 border-red-200'
                    : c.daysLeft <= 30 ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  )}>
                    {c.daysLeft}z
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Distribution pie charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Status contracte</h3>
          {mounted ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={160}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {statusPieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-500">{d.name}:</span>
                    <span className="font-semibold text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <ChartPlaceholder height={160} />}
        </div>

        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Lunar per currency — contracte active</h3>
          {data.contracts.byCurrency.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-gray-400 text-sm">
              <div className="text-center">
                <TrendingUp size={20} className="mx-auto mb-2 text-gray-300" />
                Niciun contract activ
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {data.contracts.byCurrency.map(cur => {
                const costPct = cur.revenue > 0 ? Math.round((cur.cost / cur.revenue) * 100) : 0
                return (
                  <div key={cur.currency}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-700">{cur.currency}</span>
                      <span className="text-[10px] text-gray-400">{cur.count} contracte</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-indigo-500 font-medium">Încasez lunar</span>
                        <span className="font-semibold text-gray-800 tabular-nums">{fmt(cur.revenue)} {cur.currency}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-rose-400 font-medium">Plătesc lunar</span>
                        <span className="font-semibold text-gray-800 tabular-nums">{fmt(cur.cost)} {cur.currency}</span>
                      </div>
                      {/* Visual bar: cost as % of revenue */}
                      <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.min(costPct, 100)}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-green-600 font-medium">Marjă: {fmt(cur.margin)} {cur.currency}</span>
                        <span className="text-green-500">{cur.marginPct}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Acțiuni */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Acțiuni</h3>
        <div className="flex gap-2 mb-4">
          <input
            value={newAction}
            onChange={e => setNewAction(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAction()}
            placeholder="Adaugă o acțiune nouă..."
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2AA3FF] placeholder:text-gray-300"
          />
          <button
            onClick={addAction}
            className="px-4 py-2 bg-[#0B1A33] text-white text-sm font-medium rounded-xl hover:bg-[#162540] transition-colors flex-shrink-0"
          >
            Adaugă
          </button>
        </div>
        {actions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">
            Nicio acțiune adăugată. Folosește câmpul de mai sus pentru a adăuga.
          </p>
        ) : (
          <div className="space-y-2">
            {actions.map(action => (
              <label key={action.id} className="flex items-center gap-3 cursor-pointer group py-1.5 border-b border-gray-50 last:border-0">
                <input
                  type="checkbox"
                  onChange={() => removeAction(action.id)}
                  className="w-4 h-4 rounded cursor-pointer accent-[#2AA3FF] flex-shrink-0"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{action.text}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab 3: Financiar ─────────────────────────────────────────────────────────

function TabFinanciar({ data, mounted }: { data: DashboardData; mounted: boolean }) {
  const { monthly, ytd } = data.financials
  const profitPct = ytd.revenue > 0 ? ((ytd.profit / ytd.revenue) * 100).toFixed(1) : '0.0'
  const profitPositive = ytd.profit >= 0

  // Last 3 months vs previous 3 months trend
  const last3 = monthly.slice(-3)
  const prev3 = monthly.slice(-6, -3)

  function monthTrend(idx: number) {
    const current = last3[idx]
    const previous = idx > 0 ? last3[idx - 1] : prev3[prev3.length - 1]
    if (!current || !previous) return null
    const revChange    = previous.revenue > 0  ? ((current.revenue  - previous.revenue)  / previous.revenue)  * 100 : 0
    const costChange   = previous.cost > 0     ? ((current.cost     - previous.cost)     / previous.cost)     * 100 : 0
    const commsChange  = previous.comms > 0    ? ((current.comms    - previous.comms)    / previous.comms)    * 100 : 0
    const profitChange = previous.profit !== 0 ? ((current.profit   - previous.profit)   / Math.abs(previous.profit)) * 100 : 0
    return { revChange, costChange, commsChange, profitChange, current, previous }
  }

  // Best profit month
  const bestMonth = [...monthly].sort((a, b) => b.profit - a.profit)[0]
  const avgProfit = monthly.length > 0 ? monthly.reduce((s, m) => s + m.profit, 0) / monthly.length : 0
  const maxCostMonth = [...monthly].sort((a, b) => b.cost - a.cost)[0]

  // Trend: compare last 3 vs prev 3
  const last3Revenue = last3.reduce((s, m) => s + m.revenue, 0)
  const prev3Revenue = prev3.reduce((s, m) => s + m.revenue, 0)
  const overallTrendUp = last3Revenue >= prev3Revenue

  return (
    <div className="space-y-5">
      {/* Row 1: YTD Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <ArrowUpRight size={16} className="text-indigo-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">Revenue YTD</p>
          </div>
          <p className="text-xl font-bold text-[#0B1A33]">{fmtK(ytd.revenue)}</p>
          <p className="text-[10px] text-gray-400 mt-1">cumulat de la 1 ian.</p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <ArrowDownLeft size={16} className="text-rose-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">Cost YTD</p>
          </div>
          <p className="text-xl font-bold text-[#0B1A33]">{fmtK(ytd.cost)}</p>
          <p className="text-[10px] text-gray-400 mt-1">cumulat de la 1 ian.</p>
        </div>

        <div className="glass rounded-2xl p-4 border border-amber-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Receipt size={16} className="text-amber-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">Comisioane YTD</p>
          </div>
          <p className="text-xl font-bold text-amber-700">{fmtK(ytd.comms)}</p>
          <p className="text-[10px] text-gray-400 mt-1">plătite partenerilor</p>
        </div>

        <div className={cn('glass rounded-2xl p-4', profitPositive ? 'border border-green-100' : 'border border-red-100')}>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', profitPositive ? 'bg-green-50' : 'bg-red-50')}>
              <TrendingUp size={16} className={profitPositive ? 'text-green-500' : 'text-red-500'} />
            </div>
            <p className="text-xs font-medium text-gray-500">Profit net YTD</p>
          </div>
          <p className={cn('text-xl font-bold', profitPositive ? 'text-green-700' : 'text-red-600')}>{fmtK(ytd.profit)}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            <span className={cn('font-medium', profitPositive ? 'text-green-600' : 'text-red-500')}>{profitPct}%</span> din revenue
          </p>
        </div>
      </div>

      {/* Row 2: Composed Chart */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-[#0B1A33] mb-4">Evoluție financiară — ultimele 12 luni</h3>
        {mounted ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={monthly} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
              <Tooltip content={<FinancialTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                fill="#6366f1"
                fillOpacity={0.2}
                stroke="#6366f1"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cost"
                name="Cost"
                fill="#f43f5e"
                fillOpacity={0.2}
                stroke="#f43f5e"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="comms"
                name="Comisioane"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <ChartPlaceholder height={320} />
        )}
      </div>

      {/* Row 3: MoM Trend + Key Financials */}
      <div className="grid grid-cols-2 gap-4">
        {/* Month-over-month trend */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Trend lunar (ultimele 3 luni)</h3>
          <div className="space-y-3">
            {[0, 1, 2].map(idx => {
              const trend = monthTrend(idx)
              if (!trend) return (
                <div key={idx} className="text-xs text-gray-400 py-2">Date insuficiente</div>
              )
              const { revChange, costChange, commsChange, profitChange, current } = trend
              return (
                <div key={idx} className="border border-gray-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">{current.label}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Revenue',    value: current.revenue, change: revChange,    good: revChange    >= 0 },
                      { label: 'Cost',       value: current.cost,    change: costChange,   good: costChange   <= 0 },
                      { label: 'Comisioane', value: current.comms,   change: commsChange,  good: commsChange  <= 0 },
                      { label: 'Profit',     value: current.profit,  change: profitChange, good: profitChange >= 0 },
                    ].map(item => (
                      <div key={item.label} className="text-center">
                        <p className="text-[10px] text-gray-400 mb-0.5">{item.label}</p>
                        <p className="text-xs font-semibold text-gray-800">{fmtK(item.value)}</p>
                        <div className={cn('flex items-center justify-center gap-0.5 text-[10px]', item.good ? 'text-green-600' : 'text-red-500')}>
                          {item.change >= 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                          {Math.abs(item.change).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Key financials */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Indicatori cheie</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <p className="text-[10px] text-emerald-600 font-medium mb-1">Luna cea mai bună</p>
              <p className="text-sm font-bold text-emerald-700">{bestMonth?.label ?? '—'}</p>
              <p className="text-xs text-emerald-600">{bestMonth ? fmtK(bestMonth.profit) : '—'} profit</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-[10px] text-blue-600 font-medium mb-1">Medie profit lunar</p>
              <p className="text-sm font-bold text-blue-700">{fmtK(avgProfit)}</p>
              <p className="text-[10px] text-blue-500">pe ultimele 12 luni</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
              <p className="text-[10px] text-rose-600 font-medium mb-1">Cel mai mare cost</p>
              <p className="text-sm font-bold text-rose-700">{maxCostMonth?.label ?? '—'}</p>
              <p className="text-xs text-rose-600">{maxCostMonth ? fmtK(maxCostMonth.cost) : '—'} cost</p>
            </div>
            <div className={cn('border rounded-xl p-3', overallTrendUp ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100')}>
              <p className={cn('text-[10px] font-medium mb-1', overallTrendUp ? 'text-green-600' : 'text-amber-600')}>Trend general</p>
              <div className={cn('flex items-center gap-1', overallTrendUp ? 'text-green-700' : 'text-amber-700')}>
                {overallTrendUp ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                <span className="text-sm font-bold">{overallTrendUp ? 'Crescător' : 'Descrescător'}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Ultimele 3 vs anterioarele 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Data table */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Detaliu lunar — ultimele 12 luni</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Lună</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Revenue</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Cost</th>
                <th className="text-right py-2 px-3 text-amber-500 font-medium">Comisioane</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Profit</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Marjă%</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m, i) => {
                const marja = m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0
                const marjaInt = Math.round(marja)
                const marjaColor = marjaInt >= 20 ? 'text-green-600 font-semibold' : marjaInt >= 10 ? 'text-amber-600' : marjaInt >= 0 ? 'text-gray-500' : 'text-red-500'
                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-1.5 px-3 font-medium text-gray-700">{m.label}</td>
                    <td className="py-1.5 px-3 text-right text-gray-600">{fmt(m.revenue)}</td>
                    <td className="py-1.5 px-3 text-right text-gray-600">{fmt(m.cost)}</td>
                    <td className="py-1.5 px-3 text-right text-amber-600">{m.comms > 0 ? fmt(m.comms) : <span className="text-gray-300">—</span>}</td>
                    <td className={cn('py-1.5 px-3 text-right font-medium', m.profit >= 0 ? 'text-green-700' : 'text-red-600')}>
                      {fmt(m.profit)}
                    </td>
                    <td className={cn('py-1.5 px-3 text-right', marjaColor)}>
                      {marja.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                <td className="py-2 px-3 font-semibold text-gray-700">Total YTD</td>
                <td className="py-2 px-3 text-right font-semibold text-gray-700">{fmt(ytd.revenue)}</td>
                <td className="py-2 px-3 text-right font-semibold text-gray-700">{fmt(ytd.cost)}</td>
                <td className="py-2 px-3 text-right font-semibold text-amber-600">{ytd.comms > 0 ? fmt(ytd.comms) : '—'}</td>
                <td className={cn('py-2 px-3 text-right font-semibold', ytd.profit >= 0 ? 'text-green-700' : 'text-red-600')}>
                  {fmt(ytd.profit)}
                </td>
                <td className="py-2 px-3 text-right font-semibold text-gray-600">
                  {ytd.revenue > 0 ? ((ytd.profit / ytd.revenue) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'recruitare' | 'contracte' | 'financiar'>('recruitare')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const tabs = [
    { key: 'recruitare' as const, label: 'Recrutare', icon: Users },
    { key: 'contracte' as const, label: 'Contracte', icon: FileText },
    { key: 'financiar' as const, label: 'Financiar', icon: TrendingUp },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1A33]">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Bun venit pe platforma NexDev Talent</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="bg-gray-100 rounded-xl p-1 flex gap-1 mb-6 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                activeTab === tab.key
                  ? 'bg-white shadow text-[#0B1A33]'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-red-500 font-medium">Eroare la încărcarea datelor</p>
          <p className="text-gray-400 text-sm mt-1">{error}</p>
        </div>
      ) : data ? (
        <>
          {activeTab === 'recruitare' && <TabRecrutare data={data} mounted={mounted} />}
          {activeTab === 'contracte' && <TabContracte data={data} mounted={mounted} />}
          {activeTab === 'financiar' && <TabFinanciar data={data} mounted={mounted} />}
        </>
      ) : null}
    </div>
  )
}
