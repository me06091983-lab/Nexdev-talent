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
  ChevronRight,
  ChevronLeft,
  Receipt,
  Download,
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
  LabelList,
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
    positionsCount: number
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
  pendingFeedbackInterviews: Array<{
    submissionId: string
    candidateName: string
    roleTitle: string | null
    clientName: string | null
    roleId: string | null
    interviewLabel: string
    datetime: string
    interviewStatus: string
    candidateAccepted: boolean
  }>
  interviewHistory: Array<{
    submissionId: string
    candidateName: string
    roleTitle: string | null
    clientName: string | null
    roleId: string | null
    interviewLabel: string
    datetime: string
    interviewStatus: string
    candidateAccepted: boolean
  }>
  topAiMatches: Array<{
    id: string
    candidateId: string | null
    candidateName: string
    roleTitle: string | null
    clientName: string | null
    aiScore: number
    status: string
  }>
  weeklyInterviews: Array<{
    submissionId: string
    candidateName: string
    roleTitle: string | null
    clientName: string | null
    roleId: string | null
    interviewLabel: string
    datetime: string
    interviewStatus: string
    candidateAccepted: boolean
    isToday: boolean
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
    ytdByCurrency: Array<{ currency: string; revenue: number; cost: number; comms: number; profit: number }>
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  new: 'New',
  cv_received: 'CV received',
  in_review: 'In review',
  match_found: 'Match found',
  to_contact: 'To contact',
  contacted: 'Contacted',
  screening_scheduled: 'Screening scheduled',
  screening_done: 'Screening done',
  submitted: 'Submitted to client',
  offer: 'Offer',
  rejected: 'Rejected',
  on_hold: 'On hold',
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

function groupWeeklyInterviewsByDay(interviews: DashboardData['weeklyInterviews']) {
  const groups = new Map<string, { dateKey: string; dateLabel: string; isToday: boolean; items: typeof interviews }>()
  for (const iv of interviews) {
    const d = new Date(iv.datetime)
    const dateKey = d.toISOString().slice(0, 10)
    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        dateKey,
        dateLabel: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
        isToday: iv.isToday,
        items: [],
      })
    }
    groups.get(dateKey)!.items.push(iv)
  }
  return Array.from(groups.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

function fmt(n: number) {
  return n.toLocaleString('en-GB', { maximumFractionDigits: 0 })
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
  return `${days}d`
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
      <p className="text-[#2AA3FF] font-medium">{item.value} candidates</p>
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
      <p className="text-indigo-600 font-medium">{item.payload.count} contracts</p>
      <p className="text-gray-600">Revenue: {fmt(item.value)}</p>
    </div>
  )
}

// ─── Tab 1: Recrutare ─────────────────────────────────────────────────────────

const PIPELINE_PIE_COLORS: Record<string, string> = {
  pipeline: '#94a3b8', submitted: '#6366f1', shortlisted: '#a855f7',
  interview: '#f59e0b', offer: '#22c55e', rejected: '#ef4444',
  new: '#94a3b8', cv_received: '#60a5fa', in_review: '#818cf8',
  match_found: '#c084fc', to_contact: '#fb923c', contacted: '#34d399',
  screening_scheduled: '#22d3ee', screening_done: '#14b8a6', on_hold: '#fbbf24',
}

const AVATAR_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-green-500', 'bg-rose-500']

function initials(name: string) {
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function InterviewCard({ iv }: {
  iv: { candidateName: string; roleTitle: string | null; clientName: string | null; interviewLabel: string; datetime: string; interviewStatus: string; candidateAccepted: boolean }
}) {
  const bg =
    iv.interviewStatus === 'rejected' ? 'bg-red-50 border-red-100' :
    iv.interviewStatus === 'pending_feedback' ? 'bg-yellow-50 border-yellow-100' :
    iv.interviewStatus === 'passed' ? 'bg-blue-50 border-blue-100' :
    iv.interviewStatus === 'set' && iv.candidateAccepted ? 'bg-green-50 border-green-100' :
    iv.interviewStatus === 'set' ? 'bg-orange-50 border-orange-100' :
    'bg-white border-gray-100'
  const textColor =
    iv.interviewStatus === 'rejected' ? 'text-red-600' :
    iv.interviewStatus === 'pending_feedback' ? 'text-yellow-700' :
    iv.interviewStatus === 'passed' ? 'text-blue-700' :
    iv.interviewStatus === 'set' && iv.candidateAccepted ? 'text-green-700' :
    iv.interviewStatus === 'set' ? 'text-orange-600' :
    'text-gray-500'
  const statusLabel =
    iv.interviewStatus === 'rejected' ? 'Rejected' :
    iv.interviewStatus === 'pending_feedback' ? 'Pending Feedback' :
    iv.interviewStatus === 'passed' ? 'Passed' :
    iv.interviewStatus === 'set' ? 'Set' :
    iv.interviewStatus === 'waiting_customer' ? 'Waiting customer' :
    iv.interviewStatus
  const d = new Date(iv.datetime)
  const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={cn('flex items-start gap-3 px-3 py-2.5 rounded-xl border', bg)}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-800 truncate">{iv.candidateName}</p>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">
          {iv.roleTitle ?? '—'}{iv.clientName ? ` · ${iv.clientName}` : ''}
        </p>
        <p className={cn('text-[10px] font-medium mt-0.5', textColor)}>{iv.interviewLabel}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', textColor,
          iv.interviewStatus === 'rejected' ? 'bg-red-100' :
          iv.interviewStatus === 'pending_feedback' ? 'bg-yellow-100' :
          iv.interviewStatus === 'passed' ? 'bg-blue-100' :
          iv.interviewStatus === 'set' ? 'bg-orange-100' : 'bg-gray-100'
        )}>
          {statusLabel}
        </span>
        <span className="text-[10px] text-gray-500 font-medium">{dateStr}</span>
        <span className="text-[10px] text-gray-400">{timeStr}</span>
      </div>
    </div>
  )
}

function TabRecrutare({ data, mounted }: { data: DashboardData; mounted: boolean }) {
  const [actions, setActions] = useState<{ id: string; text: string; completed?: boolean; completedAt?: string }[]>([])
  const [newAction, setNewAction] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexdev_dashboard_actions')
      if (saved) setActions(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  function addAction() {
    const trimmed = newAction.trim()
    if (!trimmed) return
    const updated = [...actions, { id: crypto.randomUUID(), text: trimmed, completed: false }]
    setActions(updated)
    setNewAction('')
    localStorage.setItem('nexdev_dashboard_actions', JSON.stringify(updated))
  }

  function completeAction(id: string) {
    const updated = actions.map(a =>
      a.id === id ? { ...a, completed: true, completedAt: new Date().toISOString() } : a
    )
    setActions(updated)
    localStorage.setItem('nexdev_dashboard_actions', JSON.stringify(updated))
  }

  const totalSubmissions = Object.values(data.submissionsByStatus).reduce((s, v) => s + v, 0)
  const rejectedCount = data.submissionsByStatus['rejected'] ?? 0
  const activeSubmissions = totalSubmissions - rejectedCount
  const deContactatCount = (data.submissionsByStatus['to_contact'] ?? 0) + (data.submissionsByStatus['contacted'] ?? 0)

  const pipelineChartData = Object.entries(data.submissionsByStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      key: k,
      label: PIPELINE_STAGE_LABELS[k] ?? k,
      value: v,
      color: PIPELINE_PIE_COLORS[k] ?? '#94a3b8',
    }))
    .sort((a, b) => b.value - a.value)

  const topRoles = [...data.candidatesByRole]
    .sort((a, b) => b.candidates.length - a.candidates.length)
    .slice(0, 6)
  const maxCandidates = Math.max(...topRoles.map(r => r.candidates.length), 1)

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0B1A33]">Welcome back, Marius! 👋</h2>
          <p className="text-gray-400 text-sm mt-0.5">Here&apos;s what&apos;s happening with your recruitment today.</p>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Users size={17} className="text-blue-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">New candidates</p>
          </div>
          <p className="text-3xl font-bold text-[#0B1A33] leading-none">{data.candidates.recentlyAdded}</p>
          <p className="text-[11px] text-gray-400 mt-1.5">in the last 7 days</p>
        </div>
        <div className="glass rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Briefcase size={17} className="text-indigo-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">Active roles</p>
          </div>
          <p className="text-3xl font-bold text-[#0B1A33] leading-none">{data.roles.active}</p>
          <p className="text-[11px] text-gray-400 mt-1.5">{data.roles.onHold} on hold</p>
        </div>
        <div className="glass rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Activity size={17} className="text-purple-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">AI matches</p>
          </div>
          <p className="text-3xl font-bold text-[#0B1A33] leading-none">{activeSubmissions}</p>
          <p className="text-[11px] text-gray-400 mt-1.5">candidates in pipeline</p>
        </div>
        <div className="glass rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Send size={17} className="text-amber-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">To contact</p>
          </div>
          <p className="text-3xl font-bold text-[#0B1A33] leading-none">{deContactatCount}</p>
          <p className="text-[11px] text-gray-400 mt-1.5">candidates waiting</p>
        </div>
      </div>

      {/* Row 2: 3 boxuri interviuri */}
      {(() => {
        const futureInterviews = data.weeklyInterviews.filter(
          iv => iv.interviewStatus === 'waiting_customer' || iv.interviewStatus === 'set'
        )
        return (
          <div className="grid grid-cols-3 gap-4">
            {/* Interviuri viitoare */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#0B1A33]">Upcoming interviews</h3>
                {futureInterviews.length > 0 && (
                  <span className="text-[10px] bg-[#2AA3FF]/10 text-[#2AA3FF] font-medium px-2 py-0.5 rounded-full">
                    {futureInterviews.length}
                  </span>
                )}
              </div>
              {futureInterviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 text-gray-400 text-sm gap-1">
                  <Calendar size={22} className="text-gray-300" />
                  <span className="text-center">No interviews planned</span>
                </div>
              ) : (
                <div className="space-y-1.5 overflow-y-auto max-h-[300px] pr-1">
                  {futureInterviews.map((iv, idx) => (
                    <InterviewCard key={idx} iv={iv} />
                  ))}
                </div>
              )}
            </div>

            {/* Așteptare feedback */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#0B1A33]">Pending feedback</h3>
                {data.pendingFeedbackInterviews.length > 0 && (
                  <span className="text-[10px] bg-yellow-50 text-yellow-700 font-medium px-2 py-0.5 rounded-full border border-yellow-200">
                    {data.pendingFeedbackInterviews.length}
                  </span>
                )}
              </div>
              {data.pendingFeedbackInterviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 text-gray-400 text-sm gap-1">
                  <Calendar size={22} className="text-gray-300" />
                  <span className="text-center">No interviews pending feedback</span>
                </div>
              ) : (
                <div className="space-y-1.5 overflow-y-auto max-h-[300px] pr-1">
                  {data.pendingFeedbackInterviews.map((iv, idx) => (
                    <InterviewCard key={idx} iv={iv} />
                  ))}
                </div>
              )}
            </div>

            {/* Istoric interviuri */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#0B1A33]">Interview history</h3>
                {data.interviewHistory.length > 0 && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">
                    {data.interviewHistory.length}
                  </span>
                )}
              </div>
              {data.interviewHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 text-gray-400 text-sm gap-1">
                  <Calendar size={22} className="text-gray-300" />
                  <span className="text-center">No interviews completed in 30 days</span>
                </div>
              ) : (
                <div className="space-y-1.5 overflow-y-auto max-h-[300px] pr-1">
                  {data.interviewHistory.map((iv, idx) => (
                    <InterviewCard key={idx} iv={iv} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Roluri deschise */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#0B1A33]">Open roles</h3>
          <span className="text-[10px] text-gray-400">{data.openRoles.length} roles</span>
        </div>
        {data.openRoles.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-gray-400 text-sm gap-2">
            <Briefcase size={18} className="text-gray-300" />
            <span>No open roles at the moment</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {data.openRoles.map(role => (
              <div key={role.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50/60 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={12} className="text-indigo-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-800 truncate">{role.title}</p>
                  <p className="text-[10px] text-gray-400 truncate">{role.clientName ?? '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] text-gray-400 tabular-nums">{role.candidatesCount} cand.</span>
                  <div className="flex items-center gap-1">
                    {(role.positionsCount ?? 1) > 1 && (
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                        ×{role.positionsCount}
                      </span>
                    )}
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', role.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                      {role.status === 'active' ? 'Active' : 'Hold'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Activitate recentă + Joburi cu candidați */}
      <div className="grid grid-cols-12 gap-4">
        {/* Activitate recentă */}
        <div className="col-span-5 glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0B1A33]">Recent activity</h3>
          </div>
          {data.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-gray-400 text-sm gap-2">
              <Activity size={24} className="text-gray-300" />
              <span>No recent activity</span>
            </div>
          ) : (
            <div className="space-y-3.5 overflow-y-auto max-h-[280px] pr-1">
              {data.recentActivity.slice(0, 8).map(item => {
                const name = item.candidate
                  ? `${item.candidate.first_name} ${item.candidate.last_name}`
                  : '—'
                const init = item.candidate
                  ? `${item.candidate.first_name[0]}${item.candidate.last_name[0]}`.toUpperCase()
                  : '?'
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {init}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 leading-snug">
                        <span className="font-semibold">{name}</span>
                        {' → '}
                        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium', STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-600')}>
                          {PIPELINE_STAGE_LABELS[item.status] ?? item.status}
                        </span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {item.role?.title ?? '—'}{item.client ? ` · ${item.client.name}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-300 flex-shrink-0 mt-0.5">{timeAgo(item.updated_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Joburi cu cei mai mulți candidați */}
        <div className="col-span-7 glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0B1A33]">Jobs with best matches</h3>
          </div>
          {topRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-gray-400 text-sm gap-2">
              <Briefcase size={24} className="text-gray-300" />
              <span>No active role with candidates</span>
            </div>
          ) : (
            <div className="space-y-3.5 overflow-y-auto max-h-[280px] pr-1">
              {topRoles.map(role => {
                const pct = Math.round((role.candidates.length / maxCandidates) * 100)
                const avatars = role.candidates.slice(0, 4)
                const extra = role.candidates.length - 4
                return (
                  <div key={role.roleId} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{role.roleTitle}</p>
                        <span className="text-[10px] font-semibold text-[#2AA3FF] ml-2 flex-shrink-0">
                          {role.candidates.length} candidates
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-2 truncate">{role.clientName}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2AA3FF] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex -space-x-2 flex-shrink-0">
                      {avatars.map((c, idx) => (
                        <div
                          key={idx}
                          className={cn('w-7 h-7 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white', AVATAR_COLORS[idx % AVATAR_COLORS.length])}
                          title={c.candidateName}
                        >
                          {initials(c.candidateName)}
                        </div>
                      ))}
                      {extra > 0 && (
                        <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center border-2 border-white">
                          +{extra}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Pipeline donut + Candidați de top */}
      <div className="grid grid-cols-12 gap-4">
        {/* Pipeline recrutare */}
        <div className="col-span-5 glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Recruitment pipeline</h3>
          {pipelineChartData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              <div className="text-center">
                <Activity size={20} className="mx-auto mb-2 text-gray-300" />
                No pipeline data
              </div>
            </div>
          ) : mounted ? (
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={pipelineChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={64}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pipelineChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PipelineTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#0B1A33] leading-none">{totalSubmissions}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">total</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[140px]">
                {pipelineChartData.map(entry => (
                  <div key={entry.key} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <span className="text-[10px] text-gray-600 truncate flex-1">{entry.label}</span>
                    <span className="text-[10px] font-semibold text-gray-700 flex-shrink-0">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ChartPlaceholder height={140} />
          )}
        </div>

        {/* Candidați de top (AI score ≥ 90%) */}
        <div className="col-span-7 glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0B1A33]">Top candidates</h3>
            <span className="text-[10px] text-gray-400">AI score ≥ 90%</span>
          </div>
          {data.topAiMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
              <TrendingUp size={20} className="text-gray-300" />
              <span>No candidate with score ≥ 90%</span>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[180px] pr-1">
              {data.topAiMatches.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {initials(c.candidateName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{c.candidateName}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {c.roleTitle ?? '—'}{c.clientName ? ` · ${c.clientName}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                      c.aiScore >= 95 ? 'bg-green-100 text-green-700' : 'bg-emerald-50 text-emerald-600'
                    )}>
                      {c.aiScore}%
                    </span>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500'
                    )}>
                      {PIPELINE_STAGE_LABELS[c.status] ?? c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Acțiuni */}
      <div className="grid grid-cols-2 gap-4">
        {/* Active actions */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Ongoing actions</h3>
          <div className="flex gap-2 mb-4">
            <input
              value={newAction}
              onChange={e => setNewAction(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAction()}
              placeholder="Add a new action..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2AA3FF] placeholder:text-gray-300"
            />
            <button
              onClick={addAction}
              className="px-4 py-2 bg-[#0B1A33] text-white text-sm font-medium rounded-xl hover:bg-[#162540] transition-colors flex-shrink-0"
            >
              Add
            </button>
          </div>
          {actions.filter(a => !a.completed).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No active actions.</p>
          ) : (
            <div className="space-y-1 overflow-y-auto max-h-[200px]">
              {actions.filter(a => !a.completed).map(action => (
                <label key={action.id} className="flex items-center gap-3 cursor-pointer group py-2 border-b border-gray-50 last:border-0">
                  <input
                    type="checkbox"
                    onChange={() => completeAction(action.id)}
                    className="w-4 h-4 rounded cursor-pointer accent-[#2AA3FF] flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{action.text}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Completed history */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#0B1A33]">Completed actions</h3>
            {actions.filter(a => a.completed).length > 0 && (
              <span className="text-[10px] bg-green-50 text-green-600 font-medium px-2 py-0.5 rounded-full">
                {actions.filter(a => a.completed).length}
              </span>
            )}
          </div>
          {actions.filter(a => a.completed).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No completed actions yet.</p>
          ) : (
            <div className="space-y-1 overflow-y-auto max-h-[200px]">
              {[...actions.filter(a => a.completed)].reverse().map(action => (
                <div key={action.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <CheckCircle size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-400 line-through">{action.text}</p>
                    {action.completedAt && (
                      <p className="text-[10px] text-gray-300 mt-0.5">
                        {new Date(action.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {new Date(action.completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab 2: Contracte ─────────────────────────────────────────────────────────

function TabContracte({ data, mounted }: { data: DashboardData; mounted: boolean }) {
  const [actions, setActions] = useState<{ id: string; text: string; completed?: boolean; completedAt?: string }[]>([])
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
    const updated = [...actions, { id: crypto.randomUUID(), text: trimmed, completed: false }]
    setActions(updated)
    setNewAction('')
    localStorage.setItem('nexdev_dashboard_actions_contracte', JSON.stringify(updated))
  }

  function completeAction(id: string) {
    const updated = actions.map(a =>
      a.id === id ? { ...a, completed: true, completedAt: new Date().toISOString() } : a
    )
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
    { name: 'Terminated', value: data.contracts.terminated, color: '#94a3b8' },
  ]

  return (
    <div className="space-y-5">
      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Active contracts" value={data.contracts.active} icon={Users} iconColor="text-green-600" iconBg="bg-green-50" />
        <div className={cn('glass rounded-2xl px-4 py-3 flex items-center gap-3', expiring30 > 0 ? 'border border-red-200 bg-red-50/30' : '')}>
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', expiring30 > 0 ? 'bg-red-50' : 'bg-amber-50')}>
            <Calendar size={16} className={expiring30 > 0 ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-gray-400 leading-none mb-1">Expiring in 30 days</p>
            <p className={cn('text-xl font-bold leading-none', expiring30 > 0 ? 'text-red-600' : 'text-[#0B1A33]')}>{expiring30}</p>
          </div>
        </div>
        <StatCard label="Expiring 31-60 days" value={expiring31to60} icon={Calendar} iconColor="text-amber-500" iconBg="bg-amber-50" />
        <StatCard label="Total terminated" value={data.contracts.terminated} icon={XCircle} iconColor="text-gray-400" iconBg="bg-gray-100" />
      </div>

      {/* Row 2: Contracte recente + Expiring list */}
      <div className="grid grid-cols-2 gap-4">
        {/* Contracte emise în ultima lună */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#0B1A33]">New contracts — last month</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full">
              {data.contracts.recentContracts.length}
            </span>
          </div>
          {data.contracts.recentContracts.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
              <div className="text-center">
                <FileText size={24} className="mx-auto mb-2 text-gray-300" />
                No new contracts in the last month
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
                      {c.contract_status === 'activ' ? 'Active' : c.contract_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                    <span>Start: {new Date(c.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {c.end_date && <span>· End: {new Date(c.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    <span className="ml-auto font-medium text-gray-600">
                      {c.bill_rate} {c.currency}/{c.rate_type === 'daily' ? 'day' : 'h'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring contracts list */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Contracts expiring in 60 days</h3>
          {data.contracts.expiringContracts.length === 0 ? (
            <div className="flex items-center justify-center h-52 gap-2 text-green-600 text-sm">
              <CheckCircle size={18} />
              <span>No expiry in 60 days</span>
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
                      Expires: {new Date(c.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0',
                    c.daysLeft <= 14 ? 'bg-red-50 text-red-700 border-red-200'
                    : c.daysLeft <= 30 ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  )}>
                    {c.daysLeft}d
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
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Contract status</h3>
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
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Monthly per currency — active contracts</h3>
          {data.contracts.byCurrency.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-gray-400 text-sm">
              <div className="text-center">
                <TrendingUp size={20} className="mx-auto mb-2 text-gray-300" />
                No active contract
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
                      <span className="text-[10px] text-gray-400">{cur.count} contracts</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-indigo-500 font-medium">Monthly revenue</span>
                        <span className="font-semibold text-gray-800 tabular-nums">{fmt(cur.revenue)} {cur.currency}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-rose-400 font-medium">Monthly cost</span>
                        <span className="font-semibold text-gray-800 tabular-nums">{fmt(cur.cost)} {cur.currency}</span>
                      </div>
                      {/* Visual bar: cost as % of revenue */}
                      <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.min(costPct, 100)}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-green-600 font-medium">Margin: {fmt(cur.margin)} {cur.currency}</span>
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
      <div className="grid grid-cols-2 gap-4">
        {/* Active actions */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Ongoing actions</h3>
          <div className="flex gap-2 mb-4">
            <input
              value={newAction}
              onChange={e => setNewAction(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAction()}
              placeholder="Add a new action..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2AA3FF] placeholder:text-gray-300"
            />
            <button
              onClick={addAction}
              className="px-4 py-2 bg-[#0B1A33] text-white text-sm font-medium rounded-xl hover:bg-[#162540] transition-colors flex-shrink-0"
            >
              Add
            </button>
          </div>
          {actions.filter(a => !a.completed).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No active actions. Check an action to complete it.
            </p>
          ) : (
            <div className="space-y-1 overflow-y-auto max-h-[220px]">
              {actions.filter(a => !a.completed).map(action => (
                <label key={action.id} className="flex items-center gap-3 cursor-pointer group py-2 border-b border-gray-50 last:border-0">
                  <input
                    type="checkbox"
                    onChange={() => completeAction(action.id)}
                    className="w-4 h-4 rounded cursor-pointer accent-[#2AA3FF] flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{action.text}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Completed history */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#0B1A33]">Completed history</h3>
            {actions.filter(a => a.completed).length > 0 && (
              <span className="text-[10px] bg-green-50 text-green-600 font-medium px-2 py-0.5 rounded-full">
                {actions.filter(a => a.completed).length}
              </span>
            )}
          </div>
          {actions.filter(a => a.completed).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No completed actions yet.
            </p>
          ) : (
            <div className="space-y-1 overflow-y-auto max-h-[220px]">
              {[...actions.filter(a => a.completed)].reverse().map(action => (
                <div key={action.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <CheckCircle size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-400 line-through">{action.text}</p>
                    {action.completedAt && (
                      <p className="text-[10px] text-gray-300 mt-0.5">
                        {new Date(action.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {new Date(action.completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab 3: Financiar ─────────────────────────────────────────────────────────

// ── Period picker helpers ─────────────────────────────────────────────────────

function MonthYearPicker({
  label, value, onChange, options,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  options: { value: number; label: string }[]
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-gray-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-[#2AA3FF] cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function TabFinanciar({ data, mounted }: { data: DashboardData; mounted: boolean }) {
  const { monthly, ytd, ytdByCurrency } = data.financials
  const profitPct = ytd.revenue > 0 ? ((ytd.profit / ytd.revenue) * 100).toFixed(1) : '0.0'
  const profitPositive = ytd.profit >= 0
  const isMultiCurrency = (ytdByCurrency ?? []).length > 1

  // ── Period selectors for evolution chart ──
  const [chartFromIdx, setChartFromIdx] = useState(0)
  const [chartToIdx,   setChartToIdx]   = useState(Math.max(0, monthly.length - 1))

  // Keep indices in range when monthly changes
  const safeFrom = Math.min(chartFromIdx, Math.max(0, monthly.length - 1))
  const safeTo   = Math.max(safeFrom, Math.min(chartToIdx, monthly.length - 1))
  const filteredMonthly = monthly.slice(safeFrom, safeTo + 1)

  const monthOptions = monthly.map((m, i) => ({ value: i, label: m.label }))

  // ── Year selector for detaliu lunar table ──
  const availableYears = [...new Set(monthly.map(m => m.year))].sort((a, b) => a - b)
  const [detaliuYear, setDetaliuYear] = useState(new Date().getFullYear())
  const detaliuRows = monthly.filter(m => m.year === detaliuYear)

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

  function exportCsv() {
    const rows = [
      ['Month', 'Revenue', 'Cost', 'Commissions', 'Profit'],
      ...monthly.map(m => [m.label, m.revenue.toFixed(2), m.cost.toFixed(2), m.comms.toFixed(2), m.profit.toFixed(2)]),
      ['TOTAL YTD', ytd.revenue.toFixed(2), ytd.cost.toFixed(2), ytd.comms.toFixed(2), ytd.profit.toFixed(2)],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexdev-financiar-${new Date().getFullYear()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Row 1: YTD Cards — per valuta cand sunt mai multe, 4 carduri clasice cand e una singura */}
      {isMultiCurrency ? (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#0B1A33]">
              YTD — per currency <span className="text-xs font-normal text-gray-400">(from 1 Jan.)</span>
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              {(ytdByCurrency ?? []).length} active currencies
            </span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min((ytdByCurrency ?? []).length, 4)}, 1fr)` }}>
            {(ytdByCurrency ?? []).map(cur => {
              const pct = cur.revenue > 0 ? ((cur.profit / cur.revenue) * 100).toFixed(1) : '0.0'
              const pos = cur.profit >= 0
              return (
                <div key={cur.currency} className={cn('rounded-xl border p-3', pos ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/20')}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[#0B1A33]">{cur.currency}</span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', pos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{pct}% margin</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-indigo-500 font-medium flex items-center gap-1"><ArrowUpRight size={11} />Revenue</span>
                      <span className="font-semibold text-gray-800 tabular-nums">{fmtK(cur.revenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-400 font-medium flex items-center gap-1"><ArrowDownLeft size={11} />Cost</span>
                      <span className="font-semibold text-gray-800 tabular-nums">{fmtK(cur.cost)}</span>
                    </div>
                    {cur.comms > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-500 font-medium flex items-center gap-1"><Receipt size={11} />Comm.</span>
                        <span className="font-semibold text-amber-700 tabular-nums">{fmtK(cur.comms)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                      <span className={cn('font-semibold flex items-center gap-1', pos ? 'text-green-600' : 'text-red-600')}><TrendingUp size={11} />Profit</span>
                      <span className={cn('font-bold tabular-nums', pos ? 'text-green-700' : 'text-red-600')}>{fmtK(cur.profit)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <ArrowUpRight size={16} className="text-indigo-500" />
              </div>
              <p className="text-xs font-medium text-gray-500">Revenue YTD</p>
            </div>
            <p className="text-xl font-bold text-[#0B1A33]">{fmtK(ytd.revenue)}</p>
            <p className="text-[10px] text-gray-400 mt-1">
              cumulated from 1 Jan.{(ytdByCurrency ?? [])[0] ? ` · ${(ytdByCurrency ?? [])[0].currency}` : ''}
            </p>
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                <ArrowDownLeft size={16} className="text-rose-500" />
              </div>
              <p className="text-xs font-medium text-gray-500">Cost YTD</p>
            </div>
            <p className="text-xl font-bold text-[#0B1A33]">{fmtK(ytd.cost)}</p>
            <p className="text-[10px] text-gray-400 mt-1">cumulated from 1 Jan.</p>
          </div>

          <div className="glass rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <Receipt size={16} className="text-amber-500" />
              </div>
              <p className="text-xs font-medium text-gray-500">Commissions YTD</p>
            </div>
            <p className="text-xl font-bold text-amber-700">{fmtK(ytd.comms)}</p>
            <p className="text-[10px] text-gray-400 mt-1">paid to partners</p>
          </div>

          <div className={cn('glass rounded-2xl p-4', profitPositive ? 'border border-green-100' : 'border border-red-100')}>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', profitPositive ? 'bg-green-50' : 'bg-red-50')}>
                <TrendingUp size={16} className={profitPositive ? 'text-green-500' : 'text-red-500'} />
              </div>
              <p className="text-xs font-medium text-gray-500">Net profit YTD</p>
            </div>
            <p className={cn('text-xl font-bold', profitPositive ? 'text-green-700' : 'text-red-600')}>{fmtK(ytd.profit)}</p>
            <p className="text-[10px] text-gray-400 mt-1">
              <span className={cn('font-medium', profitPositive ? 'text-green-600' : 'text-red-500')}>{profitPct}%</span> of revenue
            </p>
          </div>
        </div>
      )}

      {/* Row 2: Composed Chart */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-[#0B1A33]">Financial evolution</h3>
          {monthOptions.length > 0 && (
            <div className="flex items-center gap-3">
              <MonthYearPicker
                label="From"
                value={safeFrom}
                onChange={v => setChartFromIdx(v)}
                options={monthOptions}
              />
              <MonthYearPicker
                label="To"
                value={safeTo}
                onChange={v => setChartToIdx(v)}
                options={monthOptions}
              />
              {(safeFrom !== 0 || safeTo !== monthly.length - 1) && (
                <button
                  onClick={() => { setChartFromIdx(0); setChartToIdx(monthly.length - 1) }}
                  className="text-[11px] text-[#2AA3FF] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
        {mounted ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={filteredMonthly} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
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
                name="Commissions"
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
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Monthly trend (last 3 months)</h3>
          <div className="space-y-3">
            {[0, 1, 2].map(idx => {
              const trend = monthTrend(idx)
              if (!trend) return (
                <div key={idx} className="text-xs text-gray-400 py-2">Insufficient data</div>
              )
              const { revChange, costChange, commsChange, profitChange, current } = trend
              return (
                <div key={idx} className="border border-gray-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">{current.label}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Revenue',    value: current.revenue, change: revChange,    good: revChange    >= 0 },
                      { label: 'Cost',       value: current.cost,    change: costChange,   good: costChange   <= 0 },
                      { label: 'Commissions', value: current.comms,   change: commsChange,  good: commsChange  <= 0 },
                      { label: 'Profit',     value: current.profit,  change: profitChange, good: profitChange >= 0 },
                    ].map(item => (
                      <div key={item.label} className="text-center">
                        <p className="text-[10px] text-gray-400 mb-0.5 capitalize">{item.label}</p>
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
          <h3 className="text-sm font-semibold text-[#0B1A33] mb-3">Key metrics</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <p className="text-[10px] text-emerald-600 font-medium mb-1">Best month</p>
              <p className="text-sm font-bold text-emerald-700">{bestMonth?.label ?? '—'}</p>
              <p className="text-xs text-emerald-600">{bestMonth ? fmtK(bestMonth.profit) : '—'} profit</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-[10px] text-blue-600 font-medium mb-1">Average monthly profit</p>
              <p className="text-sm font-bold text-blue-700">{fmtK(avgProfit)}</p>
              <p className="text-[10px] text-blue-500">over the last 12 months</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
              <p className="text-[10px] text-rose-600 font-medium mb-1">Highest cost month</p>
              <p className="text-sm font-bold text-rose-700">{maxCostMonth?.label ?? '—'}</p>
              <p className="text-xs text-rose-600">{maxCostMonth ? fmtK(maxCostMonth.cost) : '—'} cost</p>
            </div>
            <div className={cn('border rounded-xl p-3', overallTrendUp ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100')}>
              <p className={cn('text-[10px] font-medium mb-1', overallTrendUp ? 'text-green-600' : 'text-amber-600')}>Overall trend</p>
              <div className={cn('flex items-center gap-1', overallTrendUp ? 'text-green-700' : 'text-amber-700')}>
                {overallTrendUp ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                <span className="text-sm font-bold">{overallTrendUp ? 'Upward' : 'Downward'}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Last 3 vs previous 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Data table */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-[#0B1A33]">Monthly detail</h3>
            {availableYears.length > 0 && (
              <select
                value={detaliuYear}
                onChange={e => setDetaliuYear(Number(e.target.value))}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-[#2AA3FF] cursor-pointer"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors">
            <Download size={13} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Month</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Revenue</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Cost</th>
                <th className="text-right py-2 px-3 text-amber-500 font-medium">Commissions</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Profit</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Margin%</th>
              </tr>
            </thead>
            <tbody>
              {detaliuRows.map((m, i) => {
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
              {(() => {
                const totRev  = detaliuRows.reduce((s, m) => s + m.revenue, 0)
                const totCost = detaliuRows.reduce((s, m) => s + m.cost,    0)
                const totComm = detaliuRows.reduce((s, m) => s + m.comms,   0)
                const totProf = detaliuRows.reduce((s, m) => s + m.profit,  0)
                const totMarja = totRev > 0 ? (totProf / totRev) * 100 : 0
                return (
                  <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                    <td className="py-2 px-3 font-semibold text-gray-700">Total {detaliuYear}</td>
                    <td className="py-2 px-3 text-right font-semibold text-gray-700">{fmt(totRev)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-gray-700">{fmt(totCost)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-amber-600">{totComm > 0 ? fmt(totComm) : '—'}</td>
                    <td className={cn('py-2 px-3 text-right font-semibold', totProf >= 0 ? 'text-green-700' : 'text-red-600')}>
                      {fmt(totProf)}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-gray-600">
                      {totMarja.toFixed(1)}%
                    </td>
                  </tr>
                )
              })()}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 4: Facturi ───────────────────────────────────────────────────────────

interface MonthSummary { month: number; emise_total: number; emise_incasate: number; primite_total: number; primite_platite: number }
interface FacturiSummary { months: MonthSummary[]; ytd: { emise_total: number; emise_incasate: number; primite_total: number; primite_platite: number } }
interface TvaMonth { month: number; tva_incasat: number; tva_platit: number; diferenta: number }
interface TvaSummary { months: TvaMonth[]; totals: { tva_incasat: number; tva_platit: number; diferenta: number } }

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: 'indigo' | 'green' | 'amber' | 'red' }) {
  const colors = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    green:  'bg-green-50  border-green-200  text-green-700',
    amber:  'bg-amber-50  border-amber-200  text-amber-700',
    red:    'bg-red-50    border-red-200    text-red-700',
  }
  const valColors = {
    indigo: 'text-indigo-800',
    green:  'text-green-800',
    amber:  'text-amber-800',
    red:    'text-red-800',
  }
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-1 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className={`text-2xl font-bold leading-none ${valColors[color]}`}>{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

function TabFacturi() {
  const [year, setYear]       = useState(new Date().getFullYear())
  const [summary, setSummary] = useState<FacturiSummary | null>(null)
  const [tva,     setTva]     = useState<TvaSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartFromMonth, setChartFromMonth] = useState(1)
  const [chartToMonth,   setChartToMonth]   = useState(12)
  const [emiseMonth,     setEmiseMonth]     = useState<number | null>(null)
  const [primiteMonth,   setPrimiteMonth]   = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/facturi-summary?year=${year}`).then(r => r.json()),
      fetch(`/api/facturi-tva?year=${year}`).then(r => r.json()),
    ]).then(([sumData, tvaData]) => {
      setSummary(sumData)
      setTva(tvaData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [year])

  const chartData = (summary?.months ?? []).map((m, i) => ({
    label:       MONTH_LABELS[i],
    e_inc:  Math.round(m.emise_incasate  * 100) / 100,
    e_nei:  Math.round((m.emise_total  - m.emise_incasate)  * 100) / 100,
    p_pla:  Math.round(m.primite_platite * 100) / 100,
    p_nep:  Math.round((m.primite_total - m.primite_platite) * 100) / 100,
    emise_total:   m.emise_total,
    primite_total: m.primite_total,
  }))

  const safeChartFrom = Math.min(chartFromMonth, chartToMonth)
  const safeChartTo   = Math.max(chartFromMonth, chartToMonth)
  const filteredChartData = chartData.slice(safeChartFrom - 1, safeChartTo)
  const periodEmise   = filteredChartData.reduce((s, d) => s + d.emise_total, 0)
  const periodPrimite = filteredChartData.reduce((s, d) => s + d.primite_total, 0)
  const monthOpts = MONTH_LABELS.map((l, i) => ({ value: i + 1, label: l }))

  const tvaChartData = (tva?.months ?? []).map((m, i) => ({
    label:       MONTH_LABELS[i],
    tva_incasat: m.tva_incasat,
    tva_platit:  m.tva_platit,
    diferenta:   m.diferenta,
  }))

  const ytd = summary?.ytd ?? { emise_total: 0, emise_incasate: 0, primite_total: 0, primite_platite: 0 }
  const neincasat = ytd.emise_total   - ytd.emise_incasate
  const neplatit  = ytd.primite_total - ytd.primite_platite

  const emiseBase   = (emiseMonth   !== null && summary?.months?.[emiseMonth   - 1]) ? summary.months[emiseMonth   - 1] : ytd
  const primiteBase = (primiteMonth !== null && summary?.months?.[primiteMonth - 1]) ? summary.months[primiteMonth - 1] : ytd
  const emisePie   = [
    { name: 'Collected',   value: emiseBase.emise_incasate },
    { name: 'Uncollected', value: emiseBase.emise_total - emiseBase.emise_incasate },
  ]
  const primitePie = [
    { name: 'Paid',   value: primiteBase.primite_platite },
    { name: 'Unpaid', value: primiteBase.primite_total - primiteBase.primite_platite },
  ]
  const PIE_E = ['#4F46E5', '#C7D2FE']
  const PIE_P = ['#16A34A', '#BBF7D0']

  const hasEmise   = ytd.emise_total   > 0
  const hasPrimite = ytd.primite_total > 0

  return (
    <div className="space-y-6">
      {/* Year nav */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0B1A33]">Annual invoice summary</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-[#0B1A33] w-12 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total issued" value={fmt(ytd.emise_total)} sub={`of which collected: ${fmt(ytd.emise_incasate)}`} color="indigo" />
            <KpiCard label="Uncollected" value={fmt(neincasat)} sub={neincasat === 0 ? 'Fully collected' : `${ytd.emise_total > 0 ? ((neincasat / ytd.emise_total) * 100).toFixed(0) : 0}% of total issued`} color={neincasat > 0 ? 'amber' : 'green'} />
            <KpiCard label="Total received" value={fmt(ytd.primite_total)} sub={`of which paid: ${fmt(ytd.primite_platite)}`} color="green" />
            <KpiCard label="Unpaid" value={fmt(neplatit)} sub={neplatit === 0 ? 'Fully paid' : `${ytd.primite_total > 0 ? ((neplatit / ytd.primite_total) * 100).toFixed(0) : 0}% of total received`} color={neplatit > 0 ? 'red' : 'green'} />
          </div>

          {/* Main chart */}
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-sm font-semibold text-gray-700">Issued vs. received per month</p>
              <div className="flex flex-wrap items-center gap-3">
                <MonthYearPicker label="From" value={chartFromMonth} onChange={v => setChartFromMonth(Math.min(v, chartToMonth))} options={monthOpts} />
                <MonthYearPicker label="To" value={chartToMonth} onChange={v => setChartToMonth(Math.max(v, chartFromMonth))} options={monthOpts} />
                {(chartFromMonth !== 1 || chartToMonth !== 12) && (
                  <button onClick={() => { setChartFromMonth(1); setChartToMonth(12) }}
                    className="text-[11px] text-[#2AA3FF] hover:underline">Reset</button>
                )}
              </div>
            </div>
            {(chartFromMonth !== 1 || chartToMonth !== 12) && (periodEmise > 0 || periodPrimite > 0) && (
              <div className="flex gap-4 mb-3">
                <span className="text-xs bg-indigo-50 text-indigo-700 rounded-lg px-2.5 py-1 font-medium">
                  Issued: <strong>{fmt(periodEmise)}</strong>
                </span>
                <span className="text-xs bg-green-50 text-green-700 rounded-lg px-2.5 py-1 font-medium">
                  Received: <strong>{fmt(periodPrimite)}</strong>
                </span>
              </div>
            )}
            {!hasEmise && !hasPrimite ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No invoices for {year}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredChartData} barCategoryGap="30%" barGap={6} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => {
                      const labels: Record<string, string> = { emise_total: 'Total issued', primite_total: 'Total received' }
                      return [fmt(Number(value ?? 0)), labels[name] ?? name]
                    }}
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
                  />
                  <Legend formatter={(value) => {
                    const labels: Record<string, string> = { emise_total: 'Total issued', primite_total: 'Total received' }
                    return <span style={{ fontSize: 11, color: '#6B7280' }}>{labels[value] ?? value}</span>
                  }} />
                  <Bar dataKey="emise_total" name="emise_total" fill="#4F46E5" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="emise_total" position="top" style={{ fontSize: 10, fill: '#4F46E5', fontWeight: 600 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => v > 0 ? fmtK(Number(v)) : ''} />
                  </Bar>
                  <Bar dataKey="primite_total" name="primite_total" fill="#16A34A" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="primite_total" position="top" style={{ fontSize: 10, fill: '#16A34A', fontWeight: 600 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => v > 0 ? fmtK(Number(v)) : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* TVA lunar — bar chart */}
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Monthly VAT evolution</p>
                <p className="text-xs text-gray-400 mt-0.5">Reference: actual collection / payment date</p>
              </div>
              {tva?.totals && (tva.totals.tva_incasat > 0 || tva.totals.tva_platit > 0) && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-indigo-50 text-indigo-700 rounded-lg px-2.5 py-1 font-medium">
                    VAT collected: <strong>{fmt(tva.totals.tva_incasat)}</strong>
                  </span>
                  <span className="text-xs bg-green-50 text-green-700 rounded-lg px-2.5 py-1 font-medium">
                    VAT paid: <strong>{fmt(tva.totals.tva_platit)}</strong>
                  </span>
                  <span className={cn('text-xs rounded-lg px-2.5 py-1 font-medium',
                    tva.totals.diferenta >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                  )}>
                    Due to state: <strong>{fmt(tva.totals.diferenta)}</strong>
                  </span>
                </div>
              )}
            </div>
            {!tva || (tva.totals.tva_incasat === 0 && tva.totals.tva_platit === 0) ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No VAT data for {year}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tvaChartData} barCategoryGap="30%" barGap={6} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => {
                      const labels: Record<string, string> = {
                        tva_incasat: 'VAT collected', tva_platit: 'VAT paid', diferenta: 'VAT due to state',
                      }
                      return [fmt(Number(value ?? 0)), labels[name] ?? name]
                    }}
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
                  />
                  <Legend formatter={(value) => {
                    const labels: Record<string, string> = {
                      tva_incasat: 'VAT collected', tva_platit: 'VAT paid', diferenta: 'VAT due to state',
                    }
                    return <span style={{ fontSize: 11, color: '#6B7280' }}>{labels[value] ?? value}</span>
                  }} />
                  <Bar dataKey="tva_incasat" name="tva_incasat" fill="#4F46E5" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="tva_incasat" position="top" style={{ fontSize: 10, fill: '#4F46E5', fontWeight: 600 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => v > 0 ? fmtK(Number(v)) : ''} />
                  </Bar>
                  <Bar dataKey="tva_platit" name="tva_platit" fill="#16A34A" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="tva_platit" position="top" style={{ fontSize: 10, fill: '#16A34A', fontWeight: 600 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => v > 0 ? fmtK(Number(v)) : ''} />
                  </Bar>
                  <Bar dataKey="diferenta" name="diferenta" fill="#D97706" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="diferenta" position="top" style={{ fontSize: 10, fill: '#D97706', fontWeight: 600 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => v !== 0 ? fmtK(Number(v)) : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status pie charts + monthly table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Emise donut */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Issued invoice status</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400">Month</span>
                  <select
                    value={emiseMonth ?? ''}
                    onChange={e => setEmiseMonth(e.target.value === '' ? null : Number(e.target.value))}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-[#2AA3FF] cursor-pointer"
                  >
                    <option value="">Full year</option>
                    {MONTH_LABELS.map((l, i) => <option key={i} value={i + 1}>{l}</option>)}
                  </select>
                </div>
              </div>
              {!hasEmise ? (
                <div className="h-36 flex items-center justify-center text-gray-400 text-xs">No data</div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={emisePie} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" paddingAngle={3}>
                        {emisePie.map((_, i) => <Cell key={i} fill={PIE_E[i]} />)}
                      </Pie>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Tooltip formatter={(v: any) => fmt(Number(v ?? 0))} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 text-xs">
                    {emisePie.map((e, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PIE_E[i] }} />
                        <span className="text-gray-600">{e.name}</span>
                        <span className="font-semibold text-gray-800">{fmt(e.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Primite donut */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Received invoice status</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400">Month</span>
                  <select
                    value={primiteMonth ?? ''}
                    onChange={e => setPrimiteMonth(e.target.value === '' ? null : Number(e.target.value))}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-[#2AA3FF] cursor-pointer"
                  >
                    <option value="">Full year</option>
                    {MONTH_LABELS.map((l, i) => <option key={i} value={i + 1}>{l}</option>)}
                  </select>
                </div>
              </div>
              {!hasPrimite ? (
                <div className="h-36 flex items-center justify-center text-gray-400 text-xs">No data</div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={primitePie} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" paddingAngle={3}>
                        {primitePie.map((_, i) => <Cell key={i} fill={PIE_P[i]} />)}
                      </Pie>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Tooltip formatter={(v: any) => fmt(Number(v ?? 0))} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 text-xs">
                    {primitePie.map((e, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PIE_P[i] }} />
                        <span className="text-gray-600">{e.name}</span>
                        <span className="font-semibold text-gray-800">{fmt(e.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Monthly table */}
            <div className="glass rounded-2xl p-5 overflow-auto">
              <p className="text-sm font-semibold text-gray-700 mb-3">Monthly detail</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="pb-2 text-left font-medium">Month</th>
                    <th className="pb-2 text-right font-medium text-indigo-500">Issued</th>
                    <th className="pb-2 text-right font-medium text-green-600">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.months ?? []).map((m, i) => {
                    const hasAny = m.emise_total > 0 || m.primite_total > 0
                    return (
                      <tr key={i} className={cn('border-b border-gray-50', hasAny ? '' : 'opacity-30')}>
                        <td className="py-1.5 text-gray-700 font-medium">{MONTH_LABELS[i]}</td>
                        <td className="py-1.5 text-right text-indigo-700">
                          {m.emise_total > 0 ? (
                            <span title={`Collected: ${fmt(m.emise_incasate)}`}>{fmt(m.emise_total)}</span>
                          ) : '—'}
                        </td>
                        <td className="py-1.5 text-right text-green-700">
                          {m.primite_total > 0 ? (
                            <span title={`Paid: ${fmt(m.primite_platite)}`}>{fmt(m.primite_total)}</span>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                    <td className="pt-2 font-semibold text-gray-700">Total</td>
                    <td className="pt-2 text-right font-semibold text-indigo-700">{fmt(ytd.emise_total)}</td>
                    <td className="pt-2 text-right font-semibold text-green-700">{fmt(ytd.primite_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'recruitare' | 'contracte' | 'financiar' | 'facturi'>('recruitare')
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
    { key: 'recruitare' as const, label: 'Recruitment', icon: Users },
    { key: 'contracte' as const, label: 'Contracts', icon: FileText },
    { key: 'financiar' as const, label: 'Financial', icon: TrendingUp },
    { key: 'facturi' as const, label: 'Invoices', icon: Receipt },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1A33]">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Welcome to the NexDev Talent platform</p>
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
      {activeTab === 'facturi' ? (
        <TabFacturi />
      ) : loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-red-500 font-medium">Error loading data</p>
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
