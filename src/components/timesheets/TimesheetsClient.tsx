'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Clock, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface ContractRow {
  contract_id: string
  candidate_id: string
  candidate_name: string
  profile_name: string
  role_title: string | null
  client_name: string | null
  bill_rate: number
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

export function TimesheetsClient() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [year, setYear] = useState(currentYear)
  const [rows, setRows] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [localHours, setLocalHours] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [saveErrors, setSaveErrors] = useState<Set<string>>(new Set())
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const savedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const fetchData = useCallback(async (y: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/timesheets?year=${y}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.rows)
        const init: Record<string, string> = {}
        for (const row of data.rows as ContractRow[]) {
          for (let m = 1; m <= 12; m++) {
            const h = row.hours[m]
            init[`${row.contract_id}-${m}`] = h != null && h > 0 ? String(h) : ''
          }
        }
        setLocalHours(init)
      }
    } catch { /* network error — rows stay empty */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(year) }, [year, fetchData])

  async function handleSave(contractId: string, candidateId: string, month: number, value: string) {
    const key = `${contractId}-${month}`
    const hours = parseInt(value, 10) || 0

    clearTimeout(savedTimers.current[key])
    setSaving(prev => new Set(prev).add(key))
    setSaveErrors(prev => { const s = new Set(prev); s.delete(key); return s })

    try {
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId, candidate_id: candidateId, year, month, hours }),
      })
      if (!res.ok) {
        setSaveErrors(prev => new Set(prev).add(key))
        savedTimers.current[key] = setTimeout(() => {
          setSaveErrors(prev => { const s = new Set(prev); s.delete(key); return s })
        }, 3000)
      } else {
        setSavedKeys(prev => new Set(prev).add(key))
        savedTimers.current[key] = setTimeout(() => {
          setSavedKeys(prev => { const s = new Set(prev); s.delete(key); return s })
        }, 1500)
      }
    } catch {
      setSaveErrors(prev => new Set(prev).add(key))
      savedTimers.current[key] = setTimeout(() => {
        setSaveErrors(prev => { const s = new Set(prev); s.delete(key); return s })
      }, 3000)
    } finally {
      setSaving(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timesheeturi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ore lucrate per candidat · contracte active</p>
        </div>

        {/* Year navigation */}
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setYear(y => y - 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-gray-900 px-3 min-w-[52px] text-center tabular-nums">
            {year}
          </span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* States */}
      {loading ? (
        <div className="flex items-center justify-center h-72 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 gap-4 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Clock size={26} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-700">No active contracts in {year}</p>
            <p className="text-sm text-gray-400 mt-1">Navigate to another year or create active contracts.</p>
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
                        'border-b border-gray-100 text-center px-0 py-3 text-xs font-semibold uppercase tracking-wider min-w-[72px]',
                        mi === currentMonth && year === currentYear
                          ? 'text-[#2AA3FF] bg-blue-50'
                          : 'text-gray-400 bg-gray-50'
                      )}
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.contract_id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    {/* Candidate info */}
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 border-r border-gray-100 px-5 py-3 transition-colors">
                      <div className="font-semibold text-gray-900 leading-tight">{row.candidate_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 leading-tight">
                        {row.role_title ?? row.profile_name}
                        {row.client_name && (
                          <span> · <span className="text-gray-500">{row.client_name}</span></span>
                        )}
                      </div>
                      <div className="text-xs text-gray-300 mt-0.5">
                        {row.bill_rate} {row.currency}/{row.rate_type === 'daily' ? 'zi' : 'h'}
                      </div>
                    </td>

                    {/* Month cells */}
                    {MONTHS.map((_, mi) => {
                      const month = mi + 1
                      const key = `${row.contract_id}-${month}`
                      const active = isMonthActive(row, year, mi)
                      const isSaving = saving.has(key)
                      const isError = saveErrors.has(key)
                      const isSaved = savedKeys.has(key)
                      const val = localHours[key] ?? ''
                      const hasValue = val !== '' && parseInt(val, 10) > 0
                      const isCurrentCol = mi === currentMonth && year === currentYear

                      return (
                        <td
                          key={month}
                          className={cn('px-1.5 py-2 text-center', isCurrentCol && 'bg-blue-50/30')}
                        >
                          {active ? (
                            <div className="relative inline-block">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={val}
                                onChange={e => {
                                  const v = e.target.value.replace(/[^0-9]/g, '')
                                  setLocalHours(prev => ({ ...prev, [key]: v }))
                                }}
                                onBlur={e => handleSave(row.contract_id, row.candidate_id, month, e.target.value)}
                                placeholder="—"
                                title={isError ? 'Eroare la salvare' : undefined}
                                className={cn(
                                  'w-14 text-center text-sm rounded-lg border py-1.5 transition-all',
                                  'focus:outline-none focus:ring-2 focus:ring-green-300/40 focus:border-green-400',
                                  isError
                                    ? 'border-red-300 bg-red-50 text-red-600'
                                    : isSaving
                                    ? 'border-amber-200 bg-amber-50 text-amber-600'
                                    : isSaved
                                    ? 'border-green-400 bg-green-100 font-medium text-green-800'
                                    : hasValue
                                    ? 'border-green-200 bg-green-50 font-medium text-gray-800'
                                    : 'border-green-100 bg-green-50/60 text-green-200 placeholder:text-green-200 hover:bg-green-50 hover:border-green-200'
                                )}
                              />
                              {isSaved && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center pointer-events-none">
                                  <Check size={9} className="text-white" strokeWidth={3} />
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="w-14 mx-auto h-[34px] rounded-lg bg-gray-200/70 flex items-center justify-center">
                              <span className="text-gray-400 text-xs select-none">—</span>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
