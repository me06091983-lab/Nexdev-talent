'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Briefcase, Send, CalendarClock, Users, TrendingUp, Award, PhoneCall, Target, ChartPie, History, Clock3, NotebookPen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { INTERVIEW_STATUS_OPTIONS, STATUS_COLORS } from '@/components/pipeline/InterviewPanel'
import { AgendaTab, type AgendaInterview } from './AgendaTab'

export interface DashRole { id: string; title: string; client: string | null }
export interface DashRecruiter { id: string; name: string }
export interface DashInterview { label: string; datetime: string | null; status: string; feedback: string }
export interface DashSubmission {
  id: string
  status: string
  createdAt: string
  submittedBy: string | null
  candidateId: string
  candidateName: string
  roleId: string
  roleTitle: string
  roleActive: boolean
  client: string | null
  interviews: DashInterview[]
}

const TZ = 'Europe/Bucharest'

// Stages are ordinal, so one blue ramp light->dark (validated: ordinal, light surface).
const STAGES = [
  { key: 'pipeline', label: 'In pipeline', color: '#86b6ef' },
  { key: 'submitted', label: 'Submitted', color: '#5598e7' },
  { key: 'shortlisted', label: 'Shortlisted', color: '#2a78d6' },
  { key: 'interview', label: 'Interview', color: '#1c5cab' },
  { key: 'offer', label: 'Offer', color: '#104281' },
] as const
const STAGE_LABEL: Record<string, string> = { ...Object.fromEntries(STAGES.map(s => [s.key, s.label])), rejected: 'Rejected' }
const INTERVIEW_LABEL: Record<string, string> = Object.fromEntries(INTERVIEW_STATUS_OPTIONS.map(o => [o.value, o.label]))

// Interview datetimes are stored as naive local "YYYY-MM-DDTHH:mm" (Romania). Compare as wall-clock strings.
function wall(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d).map(p => [p.type, p.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
function toWall(dt: string) {
  return /[zZ]|[+-]\d{2}:?\d{2}$/.test(dt) ? wall(new Date(dt)) : dt.slice(0, 16)
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtWall(w: string, withTime = true) {
  const [d, t] = w.split('T')
  const [y, m, day] = d.split('-')
  return `${day} ${MONTHS[Number(m) - 1]} ${y}${withTime && t ? `, ${t}` : ''}`
}

function pct(n: number, d: number) {
  return d === 0 ? '—' : `${Math.round((n / d) * 100)}%`
}

function Kpi({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string | number; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4" title={hint}>
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <Icon size={14} className="text-[#2AA3FF]" /> {label}
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-1 leading-snug">{hint}</p>}
    </div>
  )
}

function Card({ title, right, children, className }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('glass rounded-2xl p-5', className)}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function CandidateLink({ id, name }: { id: string; name: string }) {
  return (
    <Link href={`/candidates/${id}?return=${encodeURIComponent('/recruiter-dashboard')}`} className="font-medium text-gray-900 hover:text-[#2AA3FF]">
      {name}
    </Link>
  )
}

function StageBadge({ status }: { status: string }) {
  const stage = STAGES.find(s => s.key === status)
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
      <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: stage?.color ?? '#c3c2b7' }} />
      {STAGE_LABEL[status] ?? status}
    </span>
  )
}

function WeekTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">Week of {label}</p>
      <p className="text-gray-700">{payload[0].value} submission{payload[0].value === 1 ? '' : 's'}</p>
    </div>
  )
}

type Tab = 'overview' | 'agenda' | 'interviews' | 'recent'
const NOT_RECORDED = '__none__'

function RecruiterSummary({
  recruiters,
  submissions,
  openRoles,
  callsByUser,
  nowWall,
  in30,
  since30,
  onSelect,
}: {
  recruiters: DashRecruiter[]
  submissions: DashSubmission[]
  openRoles: DashRole[]
  callsByUser: Record<string, number>
  nowWall: string
  in30: string
  since30: string
  onSelect: (id: string) => void
}) {
  const openIds = new Set(openRoles.map(r => r.id))
  const people = [...recruiters]
  if (submissions.some(s => !s.submittedBy)) people.push({ id: NOT_RECORDED, name: 'Not recorded' })
  const rows = people.map(p => {
    const mine = submissions.filter(s => (s.submittedBy ?? NOT_RECORDED) === p.id)
    const reached = mine.filter(s => s.status === 'interview' || s.status === 'offer' || s.interviews.some(i => i.datetime)).length
    return {
      ...p,
      total: mine.length,
      last30: mine.filter(s => s.createdAt >= since30).length,
      inPlay: new Set(mine.filter(s => openIds.has(s.roleId) && s.status !== 'rejected').map(s => s.candidateId)).size,
      upcoming: mine.reduce((n, s) => n + s.interviews.filter(i => i.datetime && toWall(i.datetime) >= nowWall && toWall(i.datetime) <= in30).length, 0),
      interviewRate: pct(reached, mine.length),
      offers: mine.filter(s => s.status === 'offer').length,
      calls: callsByUser[p.id] ?? 0,
    }
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))

  const total = {
    total: submissions.length,
    last30: submissions.filter(s => s.createdAt >= since30).length,
    upcoming: submissions.reduce((n, s) => n + s.interviews.filter(i => i.datetime && toWall(i.datetime) >= nowWall && toWall(i.datetime) <= in30).length, 0),
    offers: submissions.filter(s => s.status === 'offer').length,
    calls: Object.values(callsByUser).reduce((a, b) => a + b, 0),
  }

  const th = 'py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500'
  return (
    <Card title="Recruiter summary" right={<span className="text-xs text-gray-400">Click a recruiter to see only their data</span>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className={cn(th, 'text-left pl-0')}>Recruiter</th>
              <th className={cn(th, 'text-right')}>Submissions</th>
              <th className={cn(th, 'text-right')}>Last 30 days</th>
              <th className={cn(th, 'text-right')}>In play</th>
              <th className={cn(th, 'text-right')}>Upcoming interviews</th>
              <th className={cn(th, 'text-right')}>Sub → interview</th>
              <th className={cn(th, 'text-right')}>Offers</th>
              <th className={cn(th, 'text-right pr-0')}>Calls (7 days)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 tabular-nums">
            {rows.map(r => (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                className="cursor-pointer hover:bg-blue-50/60 transition-colors"
              >
                <td className="py-2.5 pr-3 font-medium text-gray-900">
                  <button type="button" className="hover:text-[#2AA3FF] text-left">{r.name}</button>
                </td>
                <td className="py-2.5 px-3 text-right text-gray-900 font-semibold">{r.total}</td>
                <td className="py-2.5 px-3 text-right text-gray-700">{r.last30}</td>
                <td className="py-2.5 px-3 text-right text-gray-700">{r.inPlay}</td>
                <td className="py-2.5 px-3 text-right text-gray-700">{r.upcoming}</td>
                <td className="py-2.5 px-3 text-right text-gray-700">{r.interviewRate}</td>
                <td className="py-2.5 px-3 text-right text-gray-700">{r.offers}</td>
                <td className="py-2.5 pl-3 text-right text-gray-700">{r.calls}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 font-semibold text-gray-900 tabular-nums">
              <td className="py-2.5 pr-3">All recruiters</td>
              <td className="py-2.5 px-3 text-right">{total.total}</td>
              <td className="py-2.5 px-3 text-right">{total.last30}</td>
              <td className="py-2.5 px-3 text-right text-gray-400">—</td>
              <td className="py-2.5 px-3 text-right">{total.upcoming}</td>
              <td className="py-2.5 px-3 text-right text-gray-400">—</td>
              <td className="py-2.5 px-3 text-right">{total.offers}</td>
              <td className="py-2.5 pl-3 text-right">{total.calls}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

export function RecruiterDashboardClient({
  scope,
  nowIso,
  openRoles,
  submissions: allSubmissions,
  callsByUser,
  recruiters,
}: {
  scope: 'mine' | 'team'
  nowIso: string
  openRoles: DashRole[]
  submissions: DashSubmission[]
  callsByUser: Record<string, number>
  recruiters: DashRecruiter[]
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [roleFilter, setRoleFilter] = useState('all')
  const [view, setView] = useState<string>('all')
  const submissions = useMemo(
    () => (view === 'all' ? allSubmissions : allSubmissions.filter(s => (s.submittedBy ?? NOT_RECORDED) === view)),
    [allSubmissions, view],
  )
  const callsLast7 = view === 'all' ? Object.values(callsByUser).reduce((a, b) => a + b, 0) : (callsByUser[view] ?? 0)
  const viewName = view === NOT_RECORDED ? 'Not recorded' : recruiters.find(x => x.id === view)?.name
  const now = useMemo(() => new Date(nowIso), [nowIso])
  const nowWall = wall(now)
  const you = scope === 'mine'

  const active = useMemo(() => submissions.filter(s => s.roleActive), [submissions])

  const kpi = useMemo(() => {
    const openIds = new Set(openRoles.map(r => r.id))
    const onOpen = submissions.filter(s => openIds.has(s.roleId))
    const reachedInterview = submissions.filter(s => s.status === 'interview' || s.status === 'offer' || s.interviews.some(i => i.datetime)).length
    const since30 = new Date(now.getTime() - 30 * 86400000).toISOString()
    const in7 = wall(new Date(now.getTime() + 7 * 86400000))
    return {
      rolesSubmitted: new Set(onOpen.map(s => s.roleId)).size,
      rolesInterview: new Set(onOpen.filter(s => s.status === 'interview').map(s => s.roleId)).size,
      inPlay: new Set(onOpen.filter(s => s.status !== 'rejected').map(s => s.candidateId)).size,
      subs30: submissions.filter(s => s.createdAt >= since30).length,
      interviewRate: pct(reachedInterview, submissions.length),
      offerRate: pct(submissions.filter(s => s.status === 'offer').length, submissions.length),
      upcoming7: submissions.reduce((n, s) => n + s.interviews.filter(i => i.datetime && toWall(i.datetime) >= nowWall && toWall(i.datetime) <= in7).length, 0),
    }
  }, [submissions, openRoles, now, nowWall])

  const roleOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of active) map.set(s.roleId, `${s.roleTitle}${s.client ? ` · ${s.client}` : ''}`)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [active])

  const scoped = roleFilter === 'all' ? active : active.filter(s => s.roleId === roleFilter)
  const stageCounts = STAGES.map(s => ({ ...s, count: scoped.filter(x => x.status === s.key).length }))
  const rejectedCount = scoped.filter(x => x.status === 'rejected').length
  const maxStage = Math.max(1, ...stageCounts.map(s => s.count))

  const weekly = useMemo(() => {
    const monday = new Date(now)
    monday.setUTCHours(0, 0, 0, 0)
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
    return Array.from({ length: 8 }, (_, i) => {
      const start = new Date(monday.getTime() - (7 - i) * 7 * 86400000)
      const end = new Date(start.getTime() + 7 * 86400000)
      return {
        label: `${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]}`,
        count: submissions.filter(s => s.createdAt >= start.toISOString() && s.createdAt < end.toISOString()).length,
      }
    })
  }, [submissions, now])

  const interviews = useMemo(() => {
    const from = wall(new Date(now.getTime() - 14 * 86400000))
    const to = wall(new Date(now.getTime() + 30 * 86400000))
    const rows = submissions.flatMap(s =>
      s.interviews.filter(i => i.datetime).map(i => ({ ...i, when: toWall(i.datetime!), sub: s })),
    )
    return {
      upcoming: rows.filter(r => r.when >= nowWall && r.when <= to).sort((a, b) => a.when.localeCompare(b.when)),
      past: rows.filter(r => r.when < nowWall && r.when >= from).sort((a, b) => b.when.localeCompare(a.when)),
      awaitingFeedback: rows.filter(r => r.status === 'pending_feedback').length,
    }
  }, [submissions, now, nowWall])

  const agendaInterviews: AgendaInterview[] = useMemo(
    () => submissions.flatMap(s => s.interviews.filter(i => i.datetime).map(i => {
      const w = toWall(i.datetime!)
      return { date: w.slice(0, 10), time: w.slice(11, 16), label: i.label, status: i.status, candidateId: s.candidateId, candidateName: s.candidateName, roleTitle: s.roleTitle }
    })),
    [submissions],
  )

  const recent = useMemo(() => {
    const since = new Date(now.getTime() - 7 * 86400000).toISOString()
    return submissions.filter(s => s.createdAt >= since).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [submissions, now])

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: ChartPie },
    { key: 'agenda', label: 'Agenda', icon: NotebookPen },
    { key: 'interviews', label: 'Interview activity', icon: CalendarClock, count: interviews.upcoming.length },
    { key: 'recent', label: 'Submitted last 7 days', icon: Send, count: recent.length },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recruitment Dashboard</h1>
        <div className="flex items-center justify-between gap-4 mt-1 flex-wrap">
          <p className="text-gray-500">
            {you
              ? 'Your submissions, interviews and activity'
              : view === 'all'
                ? 'Team view — all recruiters’ submissions, interviews and activity'
                : `Showing ${viewName ?? 'recruiter'}’s submissions, interviews and activity`}
          </p>
          {!you && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              View
              <select
                value={view}
                onChange={e => { setView(e.target.value); setRoleFilter('all') }}
                aria-label="Select recruiter"
                className="glass-input px-3 py-2 rounded-lg text-sm min-w-[220px]"
              >
                <option value="all">All recruiters</option>
                {recruiters.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                {allSubmissions.some(x => !x.submittedBy) && <option value={NOT_RECORDED}>Not recorded</option>}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key ? 'bg-white text-[#0B1A33] shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <t.icon size={14} /> {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="text-xs bg-[#2AA3FF]/10 text-[#2AA3FF] px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={Briefcase} label="Open roles" value={openRoles.length} hint="Roles with status Active" />
            <Kpi icon={Send} label={you ? 'Roles you submitted to' : 'Roles with submissions'} value={kpi.rolesSubmitted} hint="Open roles with at least one candidate submitted" />
            <Kpi icon={CalendarClock} label="Roles with candidates in interview" value={kpi.rolesInterview} hint="Open roles with a candidate in Interview" />
            <Kpi icon={Users} label="Candidates in play" value={kpi.inPlay} hint="On open roles, not rejected" />
            <Kpi icon={TrendingUp} label="Submissions (30 days)" value={kpi.subs30} />
            <Kpi icon={Target} label="Submission → interview" value={kpi.interviewRate} hint="Share of submissions that got at least one interview" />
            <Kpi icon={Award} label="Submission → offer" value={kpi.offerRate} hint="Share of submissions that reached Offer" />
            <Kpi icon={PhoneCall} label="Calls logged (7 days)" value={callsLast7} hint={`${kpi.upcoming7} interview${kpi.upcoming7 === 1 ? '' : 's'} in the next 7 days`} />
          </div>

          {!you && view === 'all' && (
            <RecruiterSummary
              recruiters={recruiters}
              submissions={allSubmissions}
              openRoles={openRoles}
              callsByUser={callsByUser}
              nowWall={nowWall}
              in30={wall(new Date(now.getTime() + 30 * 86400000))}
              since30={new Date(now.getTime() - 30 * 86400000).toISOString()}
              onSelect={setView}
            />
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            <Card
              title="Candidates by stage"
              right={
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  aria-label="Filter by role"
                  className="glass-input px-3 py-1.5 rounded-lg text-sm max-w-[260px]"
                >
                  <option value="all">All open roles</option>
                  {roleOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              }
            >
              {scoped.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No candidates submitted{roleFilter === 'all' ? ' to open roles' : ' to this role'} yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {stageCounts.map(s => (
                    <div key={s.key} className="flex items-center gap-3" title={`${s.label}: ${s.count}`}>
                      <span className="w-24 flex-none text-sm text-gray-600">{s.label}</span>
                      <div className="flex-1 h-7 flex items-center">
                        <div
                          className="h-full rounded-r transition-all"
                          style={{ width: s.count ? `${(s.count / maxStage) * 100}%` : '2px', minWidth: 2, background: s.color }}
                        />
                        <span className="ml-2 text-sm font-semibold text-gray-900 tabular-nums">{s.count}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100 text-sm">
                    <span className="w-24 flex-none text-gray-500">Rejected</span>
                    <span className="font-semibold text-gray-700 tabular-nums">{rejectedCount}</span>
                  </div>
                </div>
              )}

              {roleFilter !== 'all' && scoped.length > 0 && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Candidates on this role</p>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {[...scoped]
                        .sort((a, b) => STAGES.findIndex(s => s.key === b.status) - STAGES.findIndex(s => s.key === a.status))
                        .map(s => (
                          <tr key={s.id}>
                            <td className="py-2"><CandidateLink id={s.candidateId} name={s.candidateName} /></td>
                            <td className="py-2 text-right"><StageBadge status={s.status} /></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Submissions per week" right={<span className="text-xs text-gray-400">last 8 weeks</span>}>
              <div className="h-64" role="img" aria-label={`Submissions per week: ${weekly.map(w => `${w.label} ${w.count}`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 256 }}>
                  <BarChart data={weekly} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<WeekTooltip />} cursor={{ fill: '#f0f6fd' }} />
                    <Bar dataKey="count" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'agenda' && <AgendaTab today={nowWall.slice(0, 10)} interviews={agendaInterviews} />}

      {tab === 'interviews' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <Kpi icon={CalendarClock} label="Upcoming (next 30 days)" value={interviews.upcoming.length} />
            <Kpi icon={History} label="Held (last 2 weeks)" value={interviews.past.length} />
            <Kpi icon={Clock3} label="Awaiting feedback" value={interviews.awaitingFeedback} hint="Interviews with status Pending Feedback" />
          </div>
          <InterviewTable title="Upcoming — next 30 days" rows={interviews.upcoming} empty="No interviews scheduled in the next 30 days." />
          <InterviewTable title="Past 2 weeks" rows={interviews.past} empty="No interviews in the last 2 weeks." showFeedback />
        </div>
      )}

      {tab === 'recent' && (
        <Card title={`Candidates submitted in the last 7 days (${recent.length})`}>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No candidates submitted in the last 7 days.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3">Submitted</th>
                  <th className="py-2 pr-3">Candidate</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2">Current stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map(s => (
                  <tr key={s.id}>
                    <td className="py-2.5 pr-3 text-gray-500 tabular-nums whitespace-nowrap">{fmtWall(wall(new Date(s.createdAt)), false)}</td>
                    <td className="py-2.5 pr-3"><CandidateLink id={s.candidateId} name={s.candidateName} /></td>
                    <td className="py-2.5 pr-3 text-gray-700">{s.roleTitle}</td>
                    <td className="py-2.5 pr-3 text-gray-500">{s.client ?? '—'}</td>
                    <td className="py-2.5"><StageBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  )
}

function InterviewTable({
  title,
  rows,
  empty,
  showFeedback,
}: {
  title: string
  rows: (DashInterview & { when: string; sub: DashSubmission })[]
  empty: string
  showFeedback?: boolean
}) {
  return (
    <Card title={`${title} (${rows.length})`}>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Candidate</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Interview</th>
              <th className="py-2 pr-3">Status</th>
              {showFeedback && <th className="py-2">Feedback</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <tr key={`${r.sub.id}-${i}`} className="align-top">
                <td className="py-2.5 pr-3 text-gray-700 tabular-nums whitespace-nowrap">{fmtWall(r.when)}</td>
                <td className="py-2.5 pr-3"><CandidateLink id={r.sub.candidateId} name={r.sub.candidateName} /></td>
                <td className="py-2.5 pr-3 text-gray-700">
                  {r.sub.roleTitle}
                  {r.sub.client && <span className="block text-xs text-gray-400">{r.sub.client}</span>}
                </td>
                <td className="py-2.5 pr-3 text-gray-600">{r.label}</td>
                <td className="py-2.5 pr-3">
                  <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded border', STATUS_COLORS[r.status] ?? 'text-gray-500 bg-gray-50 border-gray-200')}>
                    {INTERVIEW_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                {showFeedback && <td className="py-2.5 text-gray-500 whitespace-pre-wrap">{r.feedback || '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
