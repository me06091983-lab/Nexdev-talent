'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { X, TrendingUp, Search, Plus, Trash2 } from 'lucide-react'
import type { Submission } from './KanbanBoard'

export interface CandidateOption {
  id: string
  name: string
  profile?: string | null
}

export interface RoleOption {
  id: string
  title: string
  clientName: string
}

export interface PartnerOption {
  id: string
  label: string
}

interface Props {
  submission?: Submission | null
  contractId?: string | null
  onClose: () => void
  onSaved: () => void
  candidates?: CandidateOption[]
  roles?: RoleOption[]
  partners?: PartnerOption[]
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'RON'] as const
type CommType = 'hourly' | 'onetime'

interface Commission {
  key: string
  amount: string
  type: CommType
  partnerId: string
}

let commKey = 0
function newComm(): Commission {
  return { key: String(++commKey), amount: '', type: 'hourly', partnerId: '' }
}

function SearchableSelect({
  options, value, onSelect, placeholder, displayValue,
}: {
  options: { id: string; label: string; sub?: string }[]
  value: string
  onSelect: (id: string) => void
  placeholder: string
  displayValue: string
}) {
  const [query, setQuery] = useState(displayValue)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(displayValue) }, [displayValue])

  const filtered = useMemo(
    () => options.filter(o =>
      !query || o.label.toLowerCase().includes(query.toLowerCase()) ||
      (o.sub ?? '').toLowerCase().includes(query.toLowerCase())
    ).slice(0, 40),
    [options, query]
  )

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); onSelect(''); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50 bg-white"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(o => (
            <button key={o.id} type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(o.id); setQuery(o.label); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${value === o.id ? 'bg-blue-50 text-[#2AA3FF]' : 'text-gray-800'}`}>
              {o.label}
              {o.sub && <span className="ml-1.5 text-[11px] text-gray-400">{o.sub}</span>}
            </button>
          ))}
        </div>
      )}
      {open && query.length > 1 && filtered.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-sm text-gray-400">
          No results for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}

function CommTypeToggle({ value, onChange }: { value: CommType; onChange: (v: CommType) => void }) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
      {(['hourly', 'onetime'] as CommType[]).map(t => (
        <button key={t} type="button" onClick={() => onChange(t)}
          className={`px-2.5 py-2 text-[11px] font-medium whitespace-nowrap transition-colors ${value === t ? 'bg-[#0B1A33] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          {t === 'hourly' ? 'Per hour' : 'One-time'}
        </button>
      ))}
    </div>
  )
}

export function ContractModal({ submission, contractId, onClose, onSaved, candidates, roles, partners }: Props) {
  const isEdit = !!contractId
  const isManual = !submission && !isEdit

  const c = submission?.candidate
  const role = submission?.role as { title?: string; client?: { name: string } | null } | null

  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rateType, setRateType] = useState<'daily' | 'hourly'>('daily')
  const [payRate, setPayRate] = useState('')
  const [billRate, setBillRate] = useState('')
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'GBP' | 'RON'>('EUR')
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!contractId) return
    setLoading(true)
    fetch(`/api/contracts/${contractId}`)
      .then(r => r.json())
      .then(data => {
        setStartDate(data.start_date ?? '')
        setEndDate(data.end_date ?? '')
        setRateType(data.rate_type ?? 'daily')
        setPayRate(String(data.pay_rate ?? ''))
        setBillRate(String(data.bill_rate ?? ''))
        setCurrency(data.currency ?? 'EUR')
        const loaded: Commission[] = []
        if (data.partner_commission != null) {
          loaded.push({ key: String(++commKey), amount: String(data.partner_commission), type: data.partner_commission_type ?? 'hourly', partnerId: data.partner_id ?? '' })
        }
        if (data.partner_commission_2 != null) {
          loaded.push({ key: String(++commKey), amount: String(data.partner_commission_2), type: data.partner_commission_2_type ?? 'hourly', partnerId: data.partner_id_2 ?? '' })
        }
        setCommissions(loaded)
        setNotes(data.notes ?? '')
      })
      .catch(() => setError('Error loading contract.'))
      .finally(() => setLoading(false))
  }, [contractId])

  const pay = parseFloat(payRate) || 0
  const bill = parseFloat(billRate) || 0
  const units = rateType === 'daily' ? 20 : 160
  const grossUnit = bill - pay
  const grossMonthly = grossUnit * units
  const grossPct = bill > 0 ? Math.round((grossUnit / bill) * 100) : 0

  const monthlyComms = commissions.reduce((sum, c) => {
    if (!c.amount || c.type !== 'hourly') return sum
    return sum + (parseFloat(c.amount) || 0) * 160
  }, 0)

  const netMonthly = grossMonthly - monthlyComms
  const netUnit = units > 0 ? netMonthly / units : 0
  const netPct = bill > 0 ? Math.round((netUnit / bill) * 100) : 0
  const hasComm = commissions.some(c => c.amount && parseFloat(c.amount) > 0)

  const updateComm = useCallback((key: string, patch: Partial<Commission>) => {
    setCommissions(prev => prev.map(c => c.key === key ? { ...c, ...patch } : c))
  }, [])

  const removeComm = useCallback((key: string) => {
    setCommissions(prev => prev.filter(c => c.key !== key))
  }, [])

  const candidateOptions = useMemo(() => (candidates ?? []).map(c => ({ id: c.id, label: c.name, sub: c.profile ?? undefined })), [candidates])
  const roleOptions = useMemo(() => (roles ?? []).map(r => ({ id: r.id, label: r.title, sub: r.clientName || undefined })), [roles])

  const selectedCandidateName = candidates?.find(c => c.id === selectedCandidateId)?.name ?? ''
  const selectedRoleTitle = roles?.find(r => r.id === selectedRoleId)?.title ?? ''
  const unitLabel = rateType === 'daily' ? 'day' : 'hour'

  async function handleSave() {
    if (!startDate) { setError('Start date is required.'); return }
    if (!payRate || pay <= 0) { setError('Invalid pay rate.'); return }
    if (!billRate || bill <= 0) { setError('Invalid bill rate.'); return }
    if (bill < pay) { setError('Bill rate must be greater than or equal to pay rate.'); return }
    if (isManual && !selectedCandidateId) { setError('Select a candidate.'); return }

    setSaving(true)
    setError('')

    const body = {
      ...(isManual
        ? { candidate_id: selectedCandidateId, role_id: selectedRoleId || null }
        : isEdit ? {} : { submission_id: submission!.id }
      ),
      start_date: startDate,
      end_date: endDate || null,
      pay_rate: pay,
      bill_rate: bill,
      rate_type: rateType,
      currency,
      partner_commission: commissions[0]?.amount ? parseFloat(commissions[0].amount) : null,
      partner_commission_type: commissions[0]?.type ?? 'hourly',
      partner_id: commissions[0]?.partnerId || null,
      partner_commission_2: commissions[1]?.amount ? parseFloat(commissions[1].amount) : null,
      partner_commission_2_type: commissions[1]?.type ?? 'hourly',
      partner_id_2: commissions[1]?.partnerId || null,
      notes: notes.trim() || null,
    }

    try {
      const url = isEdit ? `/api/contracts/${contractId}` : '/api/contracts'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save error') }
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b rounded-t-2xl ${isEdit ? 'bg-blue-50' : 'bg-green-50'}`}>
          <div className="flex items-center gap-3">
            {!isManual && (
              <div className="w-9 h-9 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                {c ? `${c.first_name[0]}${c.last_name[0]}`.toUpperCase() : '?'}
              </div>
            )}
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">{isEdit ? 'Edit contract' : 'New contract'}</h2>
              {!isManual && (
                <p className="text-xs text-gray-500">
                  {c ? `${c.first_name} ${c.last_name}` : ''}
                  {role?.title ? ` · ${role.title}` : ''}
                  {role?.client?.name ? ` · ${role.client.name}` : ''}
                </p>
              )}
              {isManual && (selectedCandidateName || selectedRoleTitle) && (
                <p className="text-xs text-gray-500">
                  {selectedCandidateName}{selectedRoleTitle ? ` · ${selectedRoleTitle}` : ''}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading...</div>
        ) : (
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

            {/* Manual: candidate + role */}
            {isManual && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Candidate <span className="text-red-400">*</span>
                  </label>
                  <SearchableSelect options={candidateOptions} value={selectedCandidateId}
                    onSelect={setSelectedCandidateId} placeholder="Search by name..." displayValue={selectedCandidateName} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Role <span className="text-gray-300 font-normal">(optional)</span>
                  </label>
                  <SearchableSelect options={roleOptions} value={selectedRoleId}
                    onSelect={setSelectedRoleId} placeholder="Search by title or client..." displayValue={selectedRoleTitle} />
                </div>
              </div>
            )}

            {/* Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Start date <span className="text-red-400">*</span>
                </label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  End date <span className="text-gray-300 font-normal">(optional)</span>
                </label>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50" />
              </div>
            </div>

            {/* Rate type + Currency */}
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Rate type</label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  {(['daily', 'hourly'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setRateType(t)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${rateType === t ? 'bg-[#0B1A33] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                      {t === 'daily' ? 'Day' : 'Hour'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Currency</label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  {CURRENCIES.map(cur => (
                    <button key={cur} type="button" onClick={() => setCurrency(cur)}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${currency === cur ? 'bg-[#0B1A33] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                      {cur}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Pay rate <span className="text-gray-400 font-normal">(candidat)</span>
                </label>
                <div className="relative">
                  <input type="number" min="0" step="0.01" value={payRate} onChange={e => setPayRate(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50 pr-16" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currency}/{unitLabel}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Bill rate <span className="text-gray-400 font-normal">(client)</span>
                </label>
                <div className="relative">
                  <input type="number" min="0" step="0.01" value={billRate} onChange={e => setBillRate(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50 pr-16" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currency}/{unitLabel}</span>
                </div>
              </div>
            </div>

            {/* Commissions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Partner commissions <span className="text-gray-300 font-normal">(optional)</span>
                </label>
                {commissions.length < 2 && (
                  <button type="button" onClick={() => setCommissions(prev => [...prev, newComm()])}
                    className="flex items-center gap-1 text-[11px] font-medium text-[#2AA3FF] hover:text-[#2AA3FF]/80 transition-colors">
                    <Plus size={12} /> Add partner commission
                  </button>
                )}
              </div>
              {commissions.map((comm, idx) => (
                <div key={comm.key} className="space-y-1.5 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Commission {idx + 1}</p>
                    <button type="button" onClick={() => removeComm(comm.key)}
                      className="p-0.5 text-gray-300 hover:text-red-400 transition-colors rounded">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input type="number" min="0" step="0.01" value={comm.amount}
                        onChange={e => updateComm(comm.key, { amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50 pr-14 bg-white" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{currency}</span>
                    </div>
                    <CommTypeToggle value={comm.type} onChange={v => updateComm(comm.key, { type: v })} />
                  </div>
                  {partners && partners.length > 0 && (
                    <select value={comm.partnerId} onChange={e => updateComm(comm.key, { partnerId: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50 bg-white text-gray-700">
                      <option value="">— Partner (optional) —</option>
                      {partners.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>

            {/* Margin summary */}
            {pay > 0 && bill > 0 && (
              <div className={`rounded-xl px-4 py-3 space-y-1.5 ${netMonthly >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className={netMonthly >= 0 ? 'text-green-500' : 'text-red-400'} />
                  <p className="text-xs font-semibold text-gray-700">
                    Gross margin: {grossUnit >= 0 ? '+' : ''}{grossUnit.toFixed(2)} {currency}/{unitLabel}
                    <span className="ml-1.5 text-gray-400 font-normal">({grossPct}%)</span>
                  </p>
                </div>
                {hasComm && monthlyComms > 0 && (
                  <p className="text-[11px] text-gray-500 pl-5">
                    Partner commissions: <span className="text-red-500 font-medium">−{monthlyComms.toFixed(2)} {currency}/month (est.)</span>
                  </p>
                )}
                <div className="pl-5 pt-0.5 border-t border-gray-200/60">
                  <p className="text-xs font-bold">
                    <span className="text-gray-500 font-semibold">Net margin: </span>
                    <span className={netUnit >= 0 ? 'text-green-700' : 'text-red-600'}>
                      {netUnit >= 0 ? '+' : ''}{netUnit.toFixed(2)} {currency}/{unitLabel}
                    </span>
                    <span className={`ml-1.5 text-[11px] ${netPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>({netPct}%)</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Monthly ({rateType === 'daily' ? '20 days' : '160 hours'}):
                    <span className={`ml-1 font-semibold ${netMonthly >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {netMonthly >= 0 ? '+' : ''}{netMonthly.toFixed(0)} {currency}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Notes <span className="text-gray-300 font-normal">(optional)</span>
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Contract details, special conditions..." rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50" />
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          </div>
        )}

        <div className="flex gap-2 px-5 pb-5 pt-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || loading || (isManual && !selectedCandidateId)}
            className={`flex-1 py-2.5 text-sm text-white rounded-xl font-medium transition-colors disabled:opacity-50 ${isEdit ? 'bg-[#0B1A33] hover:bg-[#0B1A33]/90' : 'bg-green-600 hover:bg-green-700'}`}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create contract'}
          </button>
        </div>
      </div>
    </div>
  )
}
