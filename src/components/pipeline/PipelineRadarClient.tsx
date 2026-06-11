'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ExternalLink, Calendar, ChevronRight } from 'lucide-react'

export interface RadarSubmission {
  id: string
  status: string
  interviews: InterviewSlot[]
  updated_at: string
  role_id: string
  candidate: {
    id: string
    first_name: string
    last_name: string
    profile: { name: string } | null
  } | null
  role: {
    id: string
    title: string
    client: { name: string } | null
  } | null
}

interface InterviewSlot {
  label: string
  enabled: boolean
  datetime: string
  status: string
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  pipeline:    { label: 'Pipeline',   bg: 'bg-slate-100',   text: 'text-slate-700',  border: 'border-slate-200',  dot: 'bg-slate-400' },
  submitted:   { label: 'Trimis',     bg: 'bg-indigo-50',   text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-400' },
  shortlisted: { label: 'Shortlist',  bg: 'bg-purple-50',   text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  interview:   { label: 'Interviu',   bg: 'bg-amber-50',    text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400' },
  offer:       { label: 'Ofertă',     bg: 'bg-green-50',    text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500' },
  rejected:    { label: 'Respins',    bg: 'bg-red-50',      text: 'text-red-600',    border: 'border-red-200',    dot: 'bg-red-400' },
}

const FUNNEL_ORDER = ['pipeline', 'submitted', 'shortlisted', 'interview', 'offer']

const FUNNEL_COLORS: Record<string, string> = {
  pipeline:    'bg-slate-50 border-slate-200 text-slate-800',
  submitted:   'bg-indigo-50 border-indigo-200 text-indigo-800',
  shortlisted: 'bg-purple-50 border-purple-200 text-purple-800',
  interview:   'bg-amber-50 border-amber-200 text-amber-800',
  offer:       'bg-green-50 border-green-200 text-green-800',
}

const FUNNEL_COUNT_COLORS: Record<string, string> = {
  pipeline:    'text-slate-500',
  submitted:   'text-indigo-500',
  shortlisted: 'text-purple-500',
  interview:   'text-amber-500',
  offer:       'text-green-600',
}

function getNextInterview(interviews: InterviewSlot[]): { label: string; datetime: string } | null {
  const now = new Date()
  const future = (interviews ?? [])
    .filter(s => s.enabled && s.datetime && new Date(s.datetime) > now)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
  return future[0] ? { label: future[0].label, datetime: future[0].datetime } : null
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function formatInterviewDatetime(dateStr: string): { date: string; time: string; relative: string } {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86_400_000)

  const date = d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })

  let relative = ''
  if (diffDays === 0) relative = 'azi'
  else if (diffDays === 1) relative = 'mâine'
  else if (diffDays === -1) relative = 'ieri'
  else if (diffDays > 1 && diffDays <= 7) relative = `în ${diffDays} zile`
  else if (diffDays < -1) relative = `acum ${Math.abs(diffDays)} zile`

  return { date, time, relative }
}

type FilterTab = 'all' | 'interviews' | 'blocked'

export function PipelineRadarClient({ submissions }: { submissions: RadarSubmission[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const activeSubmissions = useMemo(
    () => submissions.filter(s => s.status !== 'rejected'),
    [submissions]
  )

  const funnelCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of submissions) counts[s.status] = (counts[s.status] ?? 0) + 1
    return counts
  }, [submissions])

  const withNextInterview = useMemo(
    () => activeSubmissions.filter(s => getNextInterview(s.interviews) !== null),
    [activeSubmissions]
  )

  const blocked = useMemo(
    () => activeSubmissions.filter(s =>
      daysSince(s.updated_at) >= 7 && s.status !== 'offer'
    ),
    [activeSubmissions]
  )

  const displayed = useMemo(() => {
    if (activeFilter === 'interviews') return withNextInterview
    if (activeFilter === 'blocked') return blocked
    return submissions
  }, [activeFilter, submissions, withNextInterview, blocked])

  // Sort: interviews first by date, then by days stagnant desc
  const sorted = useMemo(() => {
    if (activeFilter === 'interviews') {
      return [...displayed].sort((a, b) => {
        const na = getNextInterview(a.interviews)
        const nb = getNextInterview(b.interviews)
        if (!na || !nb) return 0
        return new Date(na.datetime).getTime() - new Date(nb.datetime).getTime()
      })
    }
    if (activeFilter === 'blocked') {
      return [...displayed].sort((a, b) => daysSince(b.updated_at) - daysSince(a.updated_at))
    }
    return [...displayed].sort((a, b) => {
      const order = FUNNEL_ORDER.indexOf(a.status) - FUNNEL_ORDER.indexOf(b.status)
      if (order !== 0) return order
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [displayed, activeFilter])

  return (
    <div className="space-y-5">
      {/* Funnel stats */}
      <div className="grid grid-cols-5 gap-2.5">
        {FUNNEL_ORDER.map((status, i) => {
          const count = funnelCounts[status] ?? 0
          const meta = STATUS_META[status]
          const isLast = i === FUNNEL_ORDER.length - 1
          return (
            <div key={status} className="flex items-center">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`flex-1 rounded-2xl border px-4 py-3.5 text-left transition-all hover:shadow-sm ${FUNNEL_COLORS[status]}`}
              >
                <div className={`text-2xl font-bold ${FUNNEL_COUNT_COLORS[status]}`}>{count}</div>
                <div className="text-xs font-medium mt-0.5 opacity-70">{meta.label}</div>
              </button>
              {!isLast && (
                <ChevronRight size={14} className="flex-shrink-0 mx-0.5 text-gray-300" />
              )}
            </div>
          )
        })}
      </div>

      {/* Rejected aside */}
      {(funnelCounts['rejected'] ?? 0) > 0 && (
        <p className="text-xs text-gray-400">
          + {funnelCounts['rejected']} respinși (excluși din funnel)
        </p>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100/70 rounded-xl p-1 w-fit">
        {([
          { key: 'all',        label: `Toate (${submissions.length})` },
          { key: 'interviews', label: `Interviuri programate (${withNextInterview.length})` },
          { key: 'blocked',    label: `Blocați >7 zile (${blocked.length})` },
        ] as { key: FilterTab; label: string }[]).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeFilter === tab.key
                ? 'bg-white shadow-sm text-[#0B1A33]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">Niciun candidat în această categorie.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/40 bg-white/30 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Candidat</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Interviu următor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(s => {
                const c = s.candidate
                const nextInt = getNextInterview(s.interviews)
                const meta = STATUS_META[s.status] ?? STATUS_META.pipeline

                return (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Candidat */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                          {c ? `${c.first_name[0]}${c.last_name[0]}`.toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {c ? `${c.first_name} ${c.last_name}` : '—'}
                          </p>
                          {c?.profile && (
                            <p className="text-[11px] text-gray-400">{c.profile.name}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-800 font-medium truncate max-w-[180px]">
                        {s.role?.title ?? '—'}
                      </p>
                      {s.role?.client && (
                        <p className="text-[11px] text-gray-400">{s.role.client.name}</p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </td>

                    {/* Interviu următor */}
                    <td className="px-4 py-3">
                      {nextInt ? (
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-[#2AA3FF] flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-gray-800">
                              {nextInt.label}
                            </p>
                            {(() => {
                              const { date, time, relative } = formatInterviewDatetime(nextInt.datetime)
                              return (
                                <>
                                  <p className="text-[11px] text-gray-600">{date}, {time}</p>
                                  {relative && (
                                    <p className="text-[10px] text-[#2AA3FF] font-medium">{relative}</p>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Link */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/roles/${s.role_id}/pipeline`}
                        className="p-1.5 text-gray-300 hover:text-[#2AA3FF] hover:bg-blue-50 rounded transition-colors inline-flex"
                        title="Deschide pipeline-ul rolului"
                      >
                        <ExternalLink size={14} />
                      </Link>
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
