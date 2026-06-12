'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, FileText, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']

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
  const [rows, setRows] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'emit' | 'primesc'>('emit')

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

  function getRate(row: ContractRow): number {
    return tab === 'emit' ? row.bill_rate : row.pay_rate
  }

  function calcAmount(row: ContractRow, month: number): number {
    const h = row.hours[month] ?? 0
    if (!h) return 0
    return h * getRate(row)
  }

  function calcRowTotal(row: ContractRow): number {
    let total = 0
    for (let m = 1; m <= 12; m++) {
      total += calcAmount(row, m)
    }
    return total
  }

  // Monthly totals grouped by currency
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

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
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
                      className={cn(
                        'border-b border-gray-100 text-center py-3 text-xs font-semibold uppercase tracking-wider min-w-[90px]',
                        mi === currentMonth && year === currentYear
                          ? 'text-[#2AA3FF] bg-blue-50'
                          : 'text-gray-400 bg-gray-50'
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
                  const rateLabel = `${isEmit ? 'Bill' : 'Pay'}: ${getRate(row)} ${row.currency}/${row.rate_type === 'daily' ? 'zi' : 'h'}`

                  return (
                    <tr key={row.contract_id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      {/* Candidate info */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 border-r border-gray-100 px-5 py-3 transition-colors">
                        <div className="font-semibold text-gray-900 leading-tight">{row.candidate_name}</div>
                        <div className="text-xs text-gray-400 mt-0.5 leading-tight">
                          {row.role_title ?? row.profile_name}
                          {row.client_name && <span> · <span className="text-gray-500">{row.client_name}</span></span>}
                        </div>
                        <div className="text-[11px] text-gray-300 mt-0.5">{rateLabel}</div>
                      </td>

                      {/* Month cells */}
                      {MONTHS.map((_, mi) => {
                        const month = mi + 1
                        const active = isMonthActive(row, year, mi)
                        const amount = active ? calcAmount(row, month) : 0
                        const isCurrentCol = mi === currentMonth && year === currentYear

                        return (
                          <td key={month} className={cn('px-1 py-2 text-center', isCurrentCol && 'bg-blue-50/30')}>
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
                                      {row.currency}
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

                      {/* Row annual total */}
                      <td className="border-l border-gray-100 px-3 py-2 text-center">
                        {rowTotal > 0 ? (
                          <>
                            <p className={cn('text-sm font-bold tabular-nums', isEmit ? 'text-indigo-700' : 'text-green-700')}>
                              {fmt(rowTotal)}
                            </p>
                            <p className="text-[10px] text-gray-400">{row.currency}</p>
                          </>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Footer — monthly totals */}
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50/80">
                  <td className="sticky left-0 z-10 bg-gray-50 border-r border-gray-100 px-5 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Total lunar
                  </td>
                  {MONTHS.map((_, mi) => {
                    const isCurrentCol = mi === currentMonth && year === currentYear
                    const totals = Object.entries(calcMonthTotals(mi))

                    return (
                      <td key={mi} className={cn('px-1 py-2.5 text-center', isCurrentCol && 'bg-blue-50/30')}>
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
