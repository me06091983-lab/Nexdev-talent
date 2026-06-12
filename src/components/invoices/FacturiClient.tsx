'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, FileText, Loader2, ArrowUpRight, ArrowDownLeft, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']
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
  return n.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function FacturiClient() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [year, setYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [rows, setRows] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'emit' | 'primesc'>('emit')
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

  // ── TVA multiplier per row ─────────────────────────────────────────────────
  function tvaMultiplier(row: ContractRow): number {
    if (!tva) return 1
    if (tab === 'emit') return 1 + TVA_RATE
    return row.candidate_tva ? 1 + TVA_RATE : 1
  }

  // ── Dashboard: summary for selected month ──────────────────────────────────
  const monthLabel = new Date(year, selectedMonth, 1)
    .toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
    .replace(/^./, c => c.toUpperCase())

  const monthSummary = useMemo(() => {
    const month = selectedMonth + 1
    const byCur: Record<string, { revenue: number; cost: number; tvaCollected: number; tvaPaid: number }> = {}

    for (const row of rows) {
      if (!isMonthActive(row, year, selectedMonth)) continue
      const h = row.hours[month] ?? 0
      const cur = row.currency
      if (!byCur[cur]) byCur[cur] = { revenue: 0, cost: 0, tvaCollected: 0, tvaPaid: 0 }
      const tvaE = tva ? 1 + TVA_RATE : 1
      const tvaP = tva && row.candidate_tva ? 1 + TVA_RATE : 1
      byCur[cur].revenue += h * row.bill_rate * tvaE
      byCur[cur].cost    += h * row.pay_rate  * tvaP
      if (tva) {
        byCur[cur].tvaCollected += h * row.bill_rate * TVA_RATE
        if (row.candidate_tva) byCur[cur].tvaPaid += h * row.pay_rate * TVA_RATE
      }
    }

    return Object.entries(byCur)
      .map(([currency, g]) => ({
        currency,
        revenue: g.revenue,
        cost: g.cost,
        profit: g.revenue - g.cost,
        profitPct: g.revenue > 0 ? Math.round(((g.revenue - g.cost) / g.revenue) * 100) : 0,
        tvaCollected: g.tvaCollected,
        tvaPaid: g.tvaPaid,
        tvaNet: g.tvaCollected - g.tvaPaid,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [rows, year, selectedMonth, tva])

  // ── Table helpers ──────────────────────────────────────────────────────────
  function getBaseRate(row: ContractRow): number {
    return tab === 'emit' ? row.bill_rate : row.pay_rate
  }

  function calcAmount(row: ContractRow, month: number): number {
    const h = row.hours[month] ?? 0
    if (!h) return 0
    return h * getBaseRate(row) * tvaMultiplier(row)
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

  const isEmit = tab === 'emit'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturi</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEmit ? 'Facturi emise NexDev → Client' : 'Facturi primite Candidat → NexDev'} · valori lunare estimate
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

      {/* Tabs + TVA checkbox */}
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
            Emit către client
          </button>
          <button
            onClick={() => setTab('primesc')}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium rounded-lg px-4 py-1.5 transition-all',
              !isEmit ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <ArrowDownLeft size={14} />
            Primesc de la candidat
          </button>
        </div>

        {/* TVA toggle — global, se aplică pe ambele taburi */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className={cn('w-8 h-4 rounded-full relative transition-colors', tva ? 'bg-indigo-500' : 'bg-gray-200')}>
            <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform', tva ? 'translate-x-4' : 'translate-x-0.5')} />
            <input type="checkbox" className="sr-only" checked={tva} onChange={e => setTva(e.target.checked)} />
          </div>
          <span className={cn('text-sm font-medium transition-colors', tva ? 'text-indigo-700' : 'text-gray-400')}>
            TVA 21%
          </span>
        </label>
      </div>

      {/* Selector lună */}
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
          {monthSummary.length === 0 ? (
            <div className="glass rounded-xl px-4 py-2.5 text-sm text-gray-400">
              Nu există ore înregistrate în {monthLabel}.
            </div>
          ) : (
            monthSummary.map(s => (
              <div key={s.currency} className="space-y-2">
                {/* Rând 1: Incasări / Cheltuieli / Profit net */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="glass rounded-xl px-3 py-2 flex items-center gap-3">
                    <ArrowUpRight size={13} className="text-indigo-400 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">
                        Incasări · {monthLabel}{tva && <span className="ml-1 text-indigo-400">+TVA</span>}
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
                        Cheltuieli · {monthLabel}
                      </p>
                      <p className="text-lg font-bold text-[#0B1A33] leading-none">
                        {fmt(s.cost)}<span className="text-xs font-normal text-gray-400 ml-1">{s.currency}</span>
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
                        Profit net · {monthLabel}
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

                {/* Rând 2: TVA — vizibil doar când switch-ul TVA e activ */}
                {tva && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="glass rounded-xl px-3 py-2 flex items-center gap-3 border border-indigo-100 bg-indigo-50/30">
                      <ArrowUpRight size={13} className="text-indigo-400 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">TVA încasat de la client · {monthLabel}</p>
                        <p className="text-lg font-bold text-indigo-700 leading-none">
                          {fmt(s.tvaCollected)}<span className="text-xs font-normal text-indigo-400 ml-1">{s.currency}</span>
                        </p>
                      </div>
                    </div>
                    <div className="glass rounded-xl px-3 py-2 flex items-center gap-3 border border-green-100 bg-green-50/30">
                      <ArrowDownLeft size={13} className="text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">TVA deductibil candidați · {monthLabel}</p>
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
                        <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">TVA de plătit la stat · {monthLabel}</p>
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
          <span className="text-sm">Se încarcă...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 gap-4 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <FileText size={26} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-700">Niciun contract activ în {year}</p>
            <p className="text-sm text-gray-400 mt-1">Navighează la un alt an sau creează contracte active.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-100 text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[220px]">
                    Candidat
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
                    Total an
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(row => {
                  const rowTotal = calcRowTotal(row)
                  const mult = tvaMultiplier(row)
                  const hasTva = mult > 1
                  const baseRate = getBaseRate(row)
                  const rateLabel = `${isEmit ? 'Bill' : 'Pay'}: ${baseRate} ${row.currency}/${row.rate_type === 'daily' ? 'zi' : 'h'}`

                  return (
                    <tr key={row.contract_id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 border-r border-gray-100 px-5 py-3 transition-colors">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 leading-tight">{row.candidate_name}</span>
                          {/* Badge TVA per candidat (tab Primesc) */}
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
                    Total lunar
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
