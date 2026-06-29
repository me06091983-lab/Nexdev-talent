'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, FileText, Loader2, ArrowUpRight, ArrowDownLeft, TrendingUp, Handshake } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TVA_RATE = 0.21

interface ContractRow {
  contract_id: string
  candidate_name: string
  profile_name: string
  role_title: string | null
  client_name: string | null
  bill_rate: number
  pay_rate: number
  rate_type: string
  currency: string
  start_date: string
  end_date: string | null
  candidate_tva: boolean
  partner_commission: number
  partner_commission_type: string
  partner_commission_2: number
  partner_commission_2_type: string
  partner_id: string | null
  partner_name: string | null
  partner_id_2: string | null
  partner_name_2: string | null
  hours: Record<number, number>
}

function isMonthActive(row: ContractRow, year: number, mi: number): boolean {
  const monthStart = new Date(year, mi, 1)
  const monthEnd = new Date(year, mi + 1, 0)
  const contractStart = new Date(row.start_date)
  const contractEnd = row.end_date ? new Date(row.end_date) : null
  return contractStart <= monthEnd && (!contractEnd || contractEnd >= monthStart)
}

function fmt(n: number): string {
  return n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// Returns the commission amount for a single contract slot in a given month/year.
// hourly  → rate × hours worked that month
// onetime → full amount shown once, in the month the contract ended
function slotComm(row: ContractRow, slot: 1 | 2, month: number, year: number): number {
  const rate = slot === 1 ? row.partner_commission   : row.partner_commission_2
  const type = slot === 1 ? row.partner_commission_type : row.partner_commission_2_type
  if (!rate) return 0
  if (type === 'hourly') {
    if (!isMonthActive(row, year, month - 1)) return 0
    return rate * (row.hours[month] ?? 0)
  }
  if (type === 'onetime') {
    const start = new Date(row.start_date)
    if (start.getFullYear() === year && start.getMonth() + 1 === month) return rate
  }
  return 0
}

export function FacturiClient() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [year, setYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [rows, setRows] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'emit' | 'primesc' | 'commissions'>('emit')
  const [tva, setTva] = useState(false)

  const fetchData = useCallback(async (y: number) => {
    setLoading(true)
    const res = await fetch(`/api/timesheets?year=${y}`)
    if (res.ok) {
      const data = await res.json()
      setRows(data.rows)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData(year) }, [year, fetchData])

  function tvaMultiplier(row: ContractRow): number {
    if (!tva) return 1
    if (tab === 'emit') return 1 + TVA_RATE
    return row.candidate_tva ? 1 + TVA_RATE : 1
  }

  const monthLabel = new Date(year, selectedMonth, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    .replace(/^./, c => c.toUpperCase())

  // ── Revenue / cost / profit summary ───────────────────────────────────────
  const monthSummary = useMemo(() => {
    const month = selectedMonth + 1
    const byCur: Record<string, { revenue: number; cost: number; comms: number; tvaCollected: number; tvaPaid: number }> = {}

    for (const row of rows) {
      if (!isMonthActive(row, year, selectedMonth)) continue
      const h = row.hours[month] ?? 0
      const cur = row.currency
      if (!byCur[cur]) byCur[cur] = { revenue: 0, cost: 0, comms: 0, tvaCollected: 0, tvaPaid: 0 }
      const tvaE = tva ? 1 + TVA_RATE : 1
      const tvaP = tva && row.candidate_tva ? 1 + TVA_RATE : 1
      const billH = row.rate_type === 'daily' ? row.bill_rate / 8 : row.bill_rate
      const payH  = row.rate_type === 'daily' ? row.pay_rate  / 8 : row.pay_rate
      byCur[cur].revenue += h * billH * tvaE
      byCur[cur].cost    += h * payH  * tvaP
      byCur[cur].comms += slotComm(row, 1, month, year) + slotComm(row, 2, month, year)
      if (tva) {
        byCur[cur].tvaCollected += h * billH * TVA_RATE
        if (row.candidate_tva) byCur[cur].tvaPaid += h * payH * TVA_RATE
      }
    }

    return Object.entries(byCur)
      .map(([currency, g]) => ({
        currency,
        revenue: g.revenue,
        cost:    g.cost,
        comms:   g.comms,
        profit:  g.revenue - g.cost - g.comms,
        profitPct: g.revenue > 0 ? Math.round(((g.revenue - g.cost - g.comms) / g.revenue) * 100) : 0,
        tvaCollected: g.tvaCollected,
        tvaPaid:      g.tvaPaid,
        tvaNet:       g.tvaCollected - g.tvaPaid,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [rows, year, selectedMonth, tva])

  // ── Commission summary grouped by recipient partner ────────────────────────
  const commSummary = useMemo(() => {
    const month = selectedMonth + 1
    const byPartner: Record<string, { name: string; amounts: Record<string, number>; count: number }> = {}

    const add = (name: string | null, amount: number, currency: string) => {
      if (!name || !amount) return
      if (!byPartner[name]) byPartner[name] = { name, amounts: {}, count: 0 }
      byPartner[name].amounts[currency] = (byPartner[name].amounts[currency] ?? 0) + amount
      byPartner[name].count++
    }

    for (const row of rows) {
      add(row.partner_name,   slotComm(row, 1, month, year), row.currency)
      add(row.partner_name_2, slotComm(row, 2, month, year), row.currency)
    }

    return Object.values(byPartner)
  }, [rows, year, selectedMonth])

  // ── Invoice table helpers ──────────────────────────────────────────────────
  function getBaseRate(row: ContractRow): number {
    return tab === 'emit' ? row.bill_rate : row.pay_rate
  }

  function getHourlyRate(row: ContractRow): number {
    const base = getBaseRate(row)
    return row.rate_type === 'daily' ? base / 8 : base
  }

  function calcAmount(row: ContractRow, month: number): number {
    const h = row.hours[month] ?? 0
    if (!h) return 0
    return h * getHourlyRate(row) * tvaMultiplier(row)
  }

  function calcRowTotal(row: ContractRow): number {
    let total = 0
    for (let m = 1; m <= 12; m++) total += calcAmount(row, m)
    return total
  }

  function calcMonthTotals(mi: number): Record<string, number> {
    const totals: Record<string, number> = {}
    for (const row of rows) {
      if (!isMonthActive(row, year, mi)) continue
      const amt = calcAmount(row, mi + 1)
      if (!amt) continue
      totals[row.currency] = (totals[row.currency] ?? 0) + amt
    }
    return totals
  }

  // ── Commission table helpers (slot-based: each contract has up to 2 recipients) ──
  type CommSlot = { row: ContractRow; slot: 1 | 2 }

  // Group by the actual commission recipient (partner_id / partner_id_2 on the contract)
  const commByPartner = useMemo(() => {
    const groups: Record<string, { name: string; slots: CommSlot[] }> = {}
    for (const row of rows) {
      if (row.partner_commission > 0 && row.partner_name) {
        if (!groups[row.partner_name]) groups[row.partner_name] = { name: row.partner_name, slots: [] }
        groups[row.partner_name].slots.push({ row, slot: 1 })
      }
      if (row.partner_commission_2 > 0 && row.partner_name_2) {
        if (!groups[row.partner_name_2]) groups[row.partner_name_2] = { name: row.partner_name_2, slots: [] }
        groups[row.partner_name_2].slots.push({ row, slot: 2 })
      }
    }
    return Object.values(groups)
  }, [rows])

  function calcSlotAmount(row: ContractRow, slot: 1 | 2, month: number): number {
    return slotComm(row, slot, month, year)
  }

  function calcPartnerMonth(slots: CommSlot[], month: number): Record<string, number> {
    const byCur: Record<string, number> = {}
    for (const { row, slot } of slots) {
      const amt = calcSlotAmount(row, slot, month)
      if (!amt) continue
      byCur[row.currency] = (byCur[row.currency] ?? 0) + amt
    }
    return byCur
  }

  function calcPartnerYear(slots: CommSlot[]): Record<string, number> {
    const byCur: Record<string, number> = {}
    for (let m = 1; m <= 12; m++) {
      for (const [cur, amt] of Object.entries(calcPartnerMonth(slots, m))) {
        byCur[cur] = (byCur[cur] ?? 0) + amt
      }
    }
    return byCur
  }

  function calcCommMonthTotals(mi: number): Record<string, number> {
    const totals: Record<string, number> = {}
    for (const { slots } of commByPartner) {
      for (const [cur, amt] of Object.entries(calcPartnerMonth(slots, mi + 1))) {
        totals[cur] = (totals[cur] ?? 0) + amt
      }
    }
    return totals
  }

  const isEmit = tab === 'emit'
  const isComm = tab === 'commissions'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isComm
              ? 'Partner commissions · monthly breakdown'
              : `${isEmit ? 'Issued invoices NexDev → Client' : 'Received invoices Candidate → NexDev'} · estimated monthly values`}
          </p>
        </div>
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-gray-900 px-3 min-w-[52px] text-center tabular-nums">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Tabs + TVA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setTab('emit')}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium rounded-lg px-4 py-1.5 transition-all',
              isEmit ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <ArrowUpRight size={14} />
            Issue to client
          </button>
          <button
            onClick={() => setTab('primesc')}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium rounded-lg px-4 py-1.5 transition-all',
              tab === 'primesc' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <ArrowDownLeft size={14} />
            Receive from candidate
          </button>
          <button
            onClick={() => setTab('commissions')}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium rounded-lg px-4 py-1.5 transition-all',
              isComm ? 'bg-white shadow text-amber-700' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Handshake size={14} />
            Commissions
          </button>
        </div>

        {!isComm && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className={cn('w-8 h-4 rounded-full relative transition-colors', tva ? 'bg-indigo-500' : 'bg-gray-200')}>
              <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform', tva ? 'translate-x-4' : 'translate-x-0.5')} />
              <input type="checkbox" className="sr-only" checked={tva} onChange={e => setTva(e.target.checked)} />
            </div>
            <span className={cn('text-sm font-medium transition-colors', tva ? 'text-indigo-700' : 'text-gray-400')}>
              TVA 21%
            </span>
          </label>
        )}
      </div>

      {/* Month selector */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {MONTHS.map((m, mi) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(mi)}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                selectedMonth === mi
                  ? 'bg-[#0B1A33] text-white shadow-sm'
                  : mi === currentMonth && year === currentYear
                  ? 'bg-blue-50 text-[#2AA3FF] border border-blue-100'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Dashboard */}
      {!loading && (
        <div className="space-y-2">
          {isComm ? (
            commSummary.length === 0 ? (
              <div className="glass rounded-xl px-4 py-2.5 text-sm text-gray-400">
                No commissions recorded in {monthLabel}.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {commSummary.map(p => (
                  <div key={p.name} className="glass rounded-xl px-3 py-2 flex items-center gap-3 border border-amber-100 bg-amber-50/40 min-w-[200px]">
                    <Handshake size={13} className="text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 leading-none mb-1">
                        {p.name} · {monthLabel}
                        <span className="ml-1.5 text-gray-300 text-[9px]">{p.count} contract{p.count !== 1 ? 's' : ''}</span>
                      </p>
                      {Object.entries(p.amounts).map(([cur, amt]) => (
                        <p key={cur} className="text-lg font-bold text-amber-700 leading-none">
                          {fmt(amt)}<span className="text-xs font-normal text-amber-400 ml-1">{cur}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : monthSummary.length === 0 ? (
            <div className="glass rounded-xl px-4 py-2.5 text-sm text-gray-400">
              No hours recorded in {monthLabel}.
            </div>
          ) : (
            monthSummary.map(s => (
              <div key={s.currency} className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  <div className="glass rounded-xl px-3 py-2 flex items-center gap-3">
                    <ArrowUpRight size={13} className="text-indigo-400 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">
                        Revenue · {monthLabel}{tva && <span className="ml-1 text-indigo-400">+VAT</span>}
                      </p>
                      <p className="text-lg font-bold text-[#0B1A33] leading-none">
                        {fmt(s.revenue)}<span className="text-xs font-normal text-gray-400 ml-1">{s.currency}</span>
                      </p>
                    </div>
                  </div>
                  <div className="glass rounded-xl px-3 py-2 flex items-center gap-3">
                    <ArrowDownLeft size={13} className="text-rose-400 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">
                        Costs · {monthLabel}
                      </p>
                      <p className="text-lg font-bold text-[#0B1A33] leading-none">
                        {fmt(s.cost)}<span className="text-xs font-normal text-gray-400 ml-1">{s.currency}</span>
                      </p>
                    </div>
                  </div>
                  <div className="glass rounded-xl px-3 py-2 flex items-center gap-3">
                    <Handshake size={13} className="text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">
                        Partner commission · {monthLabel}
                      </p>
                      <p className="text-lg font-bold text-[#0B1A33] leading-none">
                        {fmt(s.comms)}
                        <span className="text-xs font-normal text-gray-400 ml-1">{s.currency}</span>
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    'glass rounded-xl px-3 py-2 flex items-center gap-3',
                    s.profit >= 0 ? 'border border-green-100 bg-green-50/40' : 'border border-red-100 bg-red-50/30'
                  )}>
                    <TrendingUp size={13} className={cn('flex-shrink-0', s.profit >= 0 ? 'text-green-500' : 'text-red-400')} />
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">
                        Net profit · {monthLabel}
                        <span className={cn('ml-1.5 font-semibold', s.profit >= 0 ? 'text-green-600' : 'text-red-500')}>
                          {s.profitPct}%
                        </span>
                      </p>
                      <p className={cn('text-lg font-bold leading-none', s.profit >= 0 ? 'text-green-700' : 'text-red-600')}>
                        {s.profit >= 0 ? '+' : ''}{fmt(s.profit)}<span className="text-xs font-normal ml-1">{s.currency}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {tva && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="glass rounded-xl px-3 py-2 flex items-center gap-3 border border-indigo-100 bg-indigo-50/30">
                      <ArrowUpRight size={13} className="text-indigo-400 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">VAT collected from client · {monthLabel}</p>
                        <p className="text-lg font-bold text-indigo-700 leading-none">
                          {fmt(s.tvaCollected)}<span className="text-xs font-normal text-indigo-400 ml-1">{s.currency}</span>
                        </p>
                      </div>
                    </div>
                    <div className="glass rounded-xl px-3 py-2 flex items-center gap-3 border border-green-100 bg-green-50/30">
                      <ArrowDownLeft size={13} className="text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">Deductible VAT candidates · {monthLabel}</p>
                        <p className="text-lg font-bold text-green-700 leading-none">
                          {fmt(s.tvaPaid)}<span className="text-xs font-normal text-green-400 ml-1">{s.currency}</span>
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      'glass rounded-xl px-3 py-2 flex items-center gap-3',
                      s.tvaNet > 0 ? 'border border-amber-100 bg-amber-50/40' : 'border border-gray-100'
                    )}>
                      <TrendingUp size={13} className={cn('flex-shrink-0', s.tvaNet > 0 ? 'text-amber-500' : 'text-gray-400')} />
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">VAT payable to state · {monthLabel}</p>
                        <p className={cn('text-lg font-bold leading-none', s.tvaNet > 0 ? 'text-amber-700' : 'text-gray-500')}>
                          {fmt(s.tvaNet)}<span className="text-xs font-normal ml-1">{s.currency}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-72 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : (isComm ? commByPartner : rows).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 gap-4 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <FileText size={26} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-700">
              {isComm ? 'No commission contracts in ' : 'No active contracts in '}{year}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {isComm ? 'Add partner commissions to active contracts.' : 'Navigate to another year or create active contracts.'}
            </p>
          </div>
        </div>
      ) : isComm ? (

        /* ── Commissions table — grouped by partner ────────────────────────── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-100 text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[220px]">
                    Partner
                  </th>
                  {MONTHS.map((m, mi) => (
                    <th
                      key={m}
                      onClick={() => setSelectedMonth(mi)}
                      className={cn(
                        'border-b border-gray-100 text-center py-3 text-xs font-semibold uppercase tracking-wider min-w-[90px] cursor-pointer transition-colors',
                        selectedMonth === mi
                          ? 'bg-[#0B1A33]/5 text-[#0B1A33]'
                          : mi === currentMonth && year === currentYear
                          ? 'text-[#2AA3FF] bg-blue-50 hover:bg-blue-100/50'
                          : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                      )}
                    >
                      {m}
                    </th>
                  ))}
                  <th className="border-b border-l border-gray-100 text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[110px] bg-gray-50">
                    Year total
                  </th>
                </tr>
              </thead>
              <tbody>
                {commByPartner.map(({ name, slots }) => {
                  const yearTotals = calcPartnerYear(slots)
                  const candidates = [...new Set(slots.map(s => s.row.candidate_name))].join(', ')

                  return (
                    <tr key={name} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 border-r border-gray-100 px-5 py-3 transition-colors">
                        <div className="font-semibold text-amber-700 leading-tight">{name}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">{candidates}</div>
                      </td>
                      {MONTHS.map((_, mi) => {
                        const month = mi + 1
                        const amounts = calcPartnerMonth(slots, month)
                        const entries = Object.entries(amounts)
                        const isSelectedCol = mi === selectedMonth
                        const isCurrentCol = mi === currentMonth && year === currentYear

                        return (
                          <td
                            key={month}
                            className={cn(
                              'px-1 py-2 text-center',
                              isSelectedCol && 'bg-[#0B1A33]/[0.03]',
                              !isSelectedCol && isCurrentCol && 'bg-blue-50/30'
                            )}
                          >
                            {entries.length > 0 ? (
                              <div className="mx-auto min-h-[38px] rounded-lg flex flex-col items-center justify-center px-1.5 bg-amber-50 border border-amber-100 gap-0.5">
                                {entries.map(([cur, amt]) => (
                                  <div key={cur} className="flex items-baseline gap-0.5">
                                    <span className="text-xs font-bold tabular-nums text-amber-700">{fmt(amt)}</span>
                                    <span className="text-[9px] text-amber-400">{cur}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mx-auto h-[38px] rounded-lg bg-gray-100/50 flex items-center justify-center">
                                <span className="text-gray-300 text-xs">—</span>
                              </div>
                            )}
                          </td>
                        )
                      })}
                      <td className="border-l border-gray-100 px-3 py-2 text-center">
                        {Object.keys(yearTotals).length > 0 ? (
                          <div className="space-y-0.5">
                            {Object.entries(yearTotals).map(([cur, amt]) => (
                              <div key={cur}>
                                <p className="text-sm font-bold tabular-nums text-amber-700">{fmt(amt)}</p>
                                <p className="text-[10px] text-gray-400">{cur}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50/80">
                  <td className="sticky left-0 z-10 bg-gray-50 border-r border-gray-100 px-5 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Monthly total
                  </td>
                  {MONTHS.map((_, mi) => {
                    const isSelectedCol = mi === selectedMonth
                    const isCurrentCol = mi === currentMonth && year === currentYear
                    const totals = Object.entries(calcCommMonthTotals(mi))

                    return (
                      <td
                        key={mi}
                        className={cn(
                          'px-1 py-2.5 text-center',
                          isSelectedCol && 'bg-[#0B1A33]/[0.03]',
                          !isSelectedCol && isCurrentCol && 'bg-blue-50/30'
                        )}
                      >
                        {totals.length > 0 ? (
                          <div className="space-y-0.5">
                            {totals.map(([cur, amt]) => (
                              <div key={cur}>
                                <span className="text-xs font-bold tabular-nums text-amber-700">{fmt(amt)}</span>
                                <span className="text-[9px] text-gray-400 ml-0.5">{cur}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="border-l border-gray-100 px-3 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      ) : (

        /* ── Invoice table (emit / primesc) ────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-100 text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[220px]">
                    Candidate
                  </th>
                  {MONTHS.map((m, mi) => (
                    <th
                      key={m}
                      onClick={() => setSelectedMonth(mi)}
                      className={cn(
                        'border-b border-gray-100 text-center py-3 text-xs font-semibold uppercase tracking-wider min-w-[90px] cursor-pointer transition-colors',
                        selectedMonth === mi
                          ? 'bg-[#0B1A33]/5 text-[#0B1A33]'
                          : mi === currentMonth && year === currentYear
                          ? 'text-[#2AA3FF] bg-blue-50 hover:bg-blue-100/50'
                          : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                      )}
                    >
                      {m}
                    </th>
                  ))}
                  <th className="border-b border-l border-gray-100 text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[110px] bg-gray-50">
                    Year total
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(row => {
                  const rowTotal = calcRowTotal(row)
                  const mult = tvaMultiplier(row)
                  const hasTva = mult > 1
                  const baseRate = getBaseRate(row)
                  const rateLabel = `${isEmit ? 'Bill' : 'Pay'}: ${baseRate} ${row.currency}/${row.rate_type === 'daily' ? 'day' : 'h'}`

                  return (
                    <tr key={row.contract_id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 border-r border-gray-100 px-5 py-3 transition-colors">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 leading-tight">{row.candidate_name}</span>
                          {!isEmit && row.candidate_tva && (
                            <span className="text-[9px] font-bold bg-green-50 text-green-600 border border-green-100 rounded-full px-1.5 py-0.5 leading-none">
                              TVA
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 leading-tight">
                          {row.role_title ?? row.profile_name}
                          {row.client_name && <span> · <span className="text-gray-500">{row.client_name}</span></span>}
                        </div>
                        <div className="text-[11px] text-gray-300 mt-0.5">
                          {rateLabel}
                          {hasTva && <span className="ml-1 text-indigo-400 font-medium">+TVA 21%</span>}
                        </div>
                      </td>

                      {MONTHS.map((_, mi) => {
                        const month = mi + 1
                        const active = isMonthActive(row, year, mi)
                        const amount = active ? calcAmount(row, month) : 0
                        const isSelectedCol = mi === selectedMonth
                        const isCurrentCol = mi === currentMonth && year === currentYear

                        return (
                          <td
                            key={month}
                            className={cn(
                              'px-1 py-2 text-center',
                              isSelectedCol && 'bg-[#0B1A33]/[0.03]',
                              !isSelectedCol && isCurrentCol && 'bg-blue-50/30'
                            )}
                          >
                            {active ? (
                              <div className={cn(
                                'mx-auto h-[38px] rounded-lg flex flex-col items-center justify-center px-1.5',
                                amount > 0
                                  ? isEmit
                                    ? 'bg-indigo-50 border border-indigo-100'
                                    : 'bg-green-50 border border-green-100'
                                  : 'bg-gray-50 border border-dashed border-gray-200'
                              )}>
                                {amount > 0 ? (
                                  <>
                                    <span className={cn('text-xs font-bold leading-tight tabular-nums', isEmit ? 'text-indigo-700' : 'text-green-700')}>
                                      {fmt(amount)}
                                    </span>
                                    <span className={cn('text-[9px] leading-tight', isEmit ? 'text-indigo-400' : 'text-green-400')}>
                                      {row.currency}{hasTva ? '+T' : ''}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </div>
                            ) : (
                              <div className="mx-auto h-[38px] rounded-lg bg-gray-200/70 flex items-center justify-center">
                                <span className="text-gray-400 text-xs select-none">—</span>
                              </div>
                            )}
                          </td>
                        )
                      })}

                      <td className="border-l border-gray-100 px-3 py-2 text-center">
                        {rowTotal > 0 ? (
                          <>
                            <p className={cn('text-sm font-bold tabular-nums', isEmit ? 'text-indigo-700' : 'text-green-700')}>
                              {fmt(rowTotal)}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {row.currency}{hasTva ? ' +TVA' : ''}
                            </p>
                          </>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50/80">
                  <td className="sticky left-0 z-10 bg-gray-50 border-r border-gray-100 px-5 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Monthly total
                  </td>
                  {MONTHS.map((_, mi) => {
                    const isSelectedCol = mi === selectedMonth
                    const isCurrentCol = mi === currentMonth && year === currentYear
                    const totals = Object.entries(calcMonthTotals(mi))

                    return (
                      <td
                        key={mi}
                        className={cn(
                          'px-1 py-2.5 text-center',
                          isSelectedCol && 'bg-[#0B1A33]/[0.03]',
                          !isSelectedCol && isCurrentCol && 'bg-blue-50/30'
                        )}
                      >
                        {totals.length > 0 ? (
                          <div className="space-y-0.5">
                            {totals.map(([cur, amt]) => (
                              <div key={cur}>
                                <span className={cn('text-xs font-bold tabular-nums', isEmit ? 'text-indigo-700' : 'text-green-700')}>
                                  {fmt(amt)}
                                </span>
                                <span className="text-[9px] text-gray-400 ml-0.5">{cur}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="border-l border-gray-100 px-3 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
