'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, Trash2, XCircle, Loader2, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContractModal, type CandidateOption, type RoleOption, type PartnerOption } from '@/components/pipeline/ContractModal'

interface Contract {
  id: string
  start_date: string
  end_date: string | null
  pay_rate: number
  bill_rate: number
  rate_type: string
  currency: string
  partner_commission: number | null
  partner_commission_type: string | null
  partner_commission_2: number | null
  partner_commission_2_type: string | null
  notes: string | null
  role_id: string | null
  contract_status: 'activ' | 'terminat'
  termination_reason: string | null
  candidate: { first_name: string; last_name: string; profile: { name: string } | null } | null
  role: { id: string; title: string; client: { name: string } | null } | null
}

interface HistoryEntry {
  id: string
  changed_at: string
  end_date: string | null
  pay_rate: number
  bill_rate: number
  changes: {
    end_date?: { from: string | null; to: string | null }
    pay_rate?: { from: number; to: number; pct: number }
    bill_rate?: { from: number; to: number; pct: number }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRate(rate: number, currency: string, rateType: string) {
  return `${rate.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}/${rateType === 'daily' ? 'zi' : 'oră'}`
}

function calcMargin(c: Contract) {
  const units = c.rate_type === 'daily' ? 20 : 160
  const grossMonthly = (c.bill_rate - c.pay_rate) * units
  const monthlyComms =
    (c.partner_commission && c.partner_commission_type === 'monthly' ? c.partner_commission : 0) +
    (c.partner_commission_2 && c.partner_commission_2_type === 'monthly' ? c.partner_commission_2 : 0)
  const netMonthly = grossMonthly - monthlyComms
  const netUnit = units > 0 ? netMonthly / units : 0
  const netPct = c.bill_rate > 0 ? Math.round((netUnit / c.bill_rate) * 100) : 0
  return { netMonthly, netUnit, netPct, monthlyComms }
}

function daysLeftBadge(endDate: string | null) {
  if (!endDate) return { label: 'Activ', cls: 'bg-green-50 text-green-700 border-green-200' }
  const end = new Date(endDate)
  const now = new Date()
  if (end < now) return { label: 'Activ', cls: 'bg-green-50 text-green-700 border-green-200' }
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86_400_000)
  if (daysLeft <= 30) return { label: `${daysLeft} zile`, cls: 'bg-red-50 text-red-700 border-red-200' }
  if (daysLeft <= 60) return { label: `${daysLeft} zile`, cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'Activ', cls: 'bg-green-50 text-green-700 border-green-200' }
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── History cell components ───────────────────────────────────────────────────

function HistoryPerioadaCell({ startDate, endDate, change }: {
  startDate: string
  endDate: string | null
  change?: { from: string | null; to: string | null }
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] text-gray-400">
        <Calendar size={10} className="text-gray-300 flex-shrink-0" />
        <span>{formatDate(startDate)}</span>
      </div>
      {endDate ? (
        <div className={cn(
          'text-[11px] mt-0.5 pl-3.5',
          change ? 'text-green-700 font-semibold' : 'text-gray-400'
        )}>
          → {formatDate(endDate)}
          {change?.from && (
            <span className="ml-1.5 text-[10px] text-gray-300 line-through">{formatDate(change.from)}</span>
          )}
        </div>
      ) : (
        change && (
          <div className="text-[11px] text-green-700 font-semibold mt-0.5 pl-3.5">→ —</div>
        )
      )}
    </div>
  )
}

function HistoryRateCell({ value, change, currency, rateType }: {
  value: number
  change?: { from: number; to: number; pct: number }
  currency: string
  rateType: string
}) {
  if (!change) {
    return <span className="text-[11px] text-gray-400">{formatRate(value, currency, rateType)}</span>
  }
  const up = change.to >= change.from
  return (
    <div>
      <div className={cn('flex items-center gap-1 text-[11px] font-semibold', up ? 'text-green-700' : 'text-red-700')}>
        {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        <span>{formatRate(value, currency, rateType)}</span>
        <span className="text-[10px] font-bold">({up ? '+' : ''}{change.pct}%)</span>
      </div>
      <div className="text-[10px] text-gray-300 pl-3.5 mt-0.5">
        era: {change.from.toLocaleString('ro-RO', { maximumFractionDigits: 2 })}
      </div>
    </div>
  )
}

function HistoryMarginCell({ entry, c }: { entry: HistoryEntry; c: Contract }) {
  const units = c.rate_type === 'daily' ? 20 : 160
  const monthlyComms =
    (c.partner_commission && c.partner_commission_type === 'monthly' ? c.partner_commission : 0) +
    (c.partner_commission_2 && c.partner_commission_2_type === 'monthly' ? c.partner_commission_2 : 0)

  const newPay = entry.pay_rate
  const newBill = entry.bill_rate
  const newNet = (newBill - newPay) * units - monthlyComms
  const newNetUnit = units > 0 ? newNet / units : 0
  const newNetPct = newBill > 0 ? Math.round((newNetUnit / newBill) * 100) : 0

  const marginChanged = entry.changes.pay_rate !== undefined || entry.changes.bill_rate !== undefined

  if (!marginChanged) {
    return (
      <div>
        <p className={cn('text-[11px] font-bold', newNet >= 0 ? 'text-green-600/70' : 'text-red-600/70')}>
          {newNet >= 0 ? '+' : ''}{newNet.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} {c.currency}
        </p>
        <p className="text-[10px] text-gray-300">{newNetPct}%</p>
      </div>
    )
  }

  const oldPay = entry.changes.pay_rate?.from ?? entry.pay_rate
  const oldBill = entry.changes.bill_rate?.from ?? entry.bill_rate
  const oldNet = (oldBill - oldPay) * units - monthlyComms
  const oldNetUnit = units > 0 ? oldNet / units : 0
  const oldNetPct = oldBill > 0 ? Math.round((oldNetUnit / oldBill) * 100) : 0
  const pct = oldNet !== 0 ? Math.round(((newNet - oldNet) / Math.abs(oldNet)) * 1000) / 10 : 0
  const up = newNet >= oldNet

  return (
    <div>
      <div className={cn('flex items-center gap-1 text-[11px] font-bold', up ? 'text-green-700' : 'text-red-700')}>
        {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        <span>{newNet >= 0 ? '+' : ''}{newNet.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} {c.currency}</span>
        <span className="text-[10px]">({up ? '+' : ''}{pct}%)</span>
      </div>
      <div className="text-[10px] text-gray-300 mt-0.5 pl-3.5">
        era: {oldNet >= 0 ? '+' : ''}{oldNet.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} · {oldNetPct}%
      </div>
    </div>
  )
}

// ─── Terminate modal ──────────────────────────────────────────────────────────

function TerminateModal({ onConfirm, onClose, loading }: {
  onConfirm: (reason: string) => void; onClose: () => void; loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-bold text-gray-900 text-lg mb-1">Termină contractul</h3>
        <p className="text-sm text-gray-500 mb-5">
          Contractul va fi marcat ca terminat și data terminării va fi setată la ziua de azi.
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Motivul terminării <span className="text-gray-400 font-normal">(opțional)</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="ex: Proiect finalizat, contract neînnoit, candidat a plecat..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
          rows={3}
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40">
            Anulare
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Termină contractul
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Avatar candidat ──────────────────────────────────────────────────────────

function CandidateAvatar({ c }: { c: Contract }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
        {c.candidate ? `${c.candidate.first_name[0]}${c.candidate.last_name[0]}`.toUpperCase() : '?'}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">
          {c.candidate ? `${c.candidate.first_name} ${c.candidate.last_name}` : '—'}
        </p>
        {c.candidate?.profile && <p className="text-[11px] text-gray-400">{c.candidate.profile.name}</p>}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContractsClient({ contracts, candidates, roles, partners }: {
  contracts: Contract[]
  candidates: CandidateOption[]
  roles: RoleOption[]
  partners: PartnerOption[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'activ' | 'terminat'>('activ')
  const [showNew, setShowNew] = useState(false)
  const [editContractId, setEditContractId] = useState<string | null>(null)
  const [terminateId, setTerminateId] = useState<string | null>(null)
  const [terminating, setTerminating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  // undefined = not fetched yet, null = loading, [] = loaded (empty)
  const [historyMap, setHistoryMap] = useState<Record<string, HistoryEntry[] | null | undefined>>({})

  const activeContracts = contracts.filter(c => c.contract_status === 'activ')
  const terminatedContracts = contracts.filter(c => c.contract_status === 'terminat')
  const displayed = tab === 'activ' ? activeContracts : terminatedContracts

  // 9 columns: ⌄ | Candidat | Rol | Perioadă | Pay | Bill | Marjă | Status | Acțiuni
  const colSpanAll = 9

  async function fetchHistory(contractId: string) {
    setHistoryMap(prev => ({ ...prev, [contractId]: null }))
    try {
      const res = await fetch(`/api/contracts/${contractId}/history`)
      const data = await res.json()
      setHistoryMap(prev => ({ ...prev, [contractId]: Array.isArray(data) ? data : [] }))
    } catch {
      setHistoryMap(prev => ({ ...prev, [contractId]: [] }))
    }
  }

  function toggleExpand(id: string) {
    const isExpanded = expandedIds.has(id)
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // Re-fetch de fiecare dată când expandezi — datele pot fi modificate între timp
    if (!isExpanded) {
      fetchHistory(id)
    }
  }

  function handleSaved() {
    setShowNew(false)
    const editedId = editContractId
    setEditContractId(null)
    // Re-fetch history in real time if that contract is expanded
    if (editedId && expandedIds.has(editedId)) {
      fetchHistory(editedId)
    }
    router.refresh()
  }

  async function handleTerminate(reason: string) {
    if (!terminateId) return
    setTerminating(true)
    try {
      await fetch(`/api/contracts/${terminateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_status: 'terminat', termination_reason: reason }),
      })
      router.refresh()
      setTerminateId(null)
    } finally {
      setTerminating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Ștergi acest contract? Acțiunea nu poate fi anulată.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
      router.refresh()
    } catch {
      alert('Eroare la ștergerea contractului.')
    } finally {
      setDeletingId(null)
    }
  }

  const thCls = 'px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider'

  return (
    <>
      {/* Tabs + New button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setTab('activ')}
            className={cn('text-sm font-medium rounded-lg px-4 py-1.5 transition-all',
              tab === 'activ' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Contracte active
            <span className={cn('ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full',
              tab === 'activ' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
            )}>
              {activeContracts.length}
            </span>
          </button>
          <button
            onClick={() => setTab('terminat')}
            className={cn('text-sm font-medium rounded-lg px-4 py-1.5 transition-all',
              tab === 'terminat' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Contracte terminate
            <span className={cn('ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full',
              tab === 'terminat' ? 'bg-gray-200 text-gray-600' : 'bg-gray-200 text-gray-500'
            )}>
              {terminatedContracts.length}
            </span>
          </button>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#0B1A33] text-white text-sm font-medium rounded-xl hover:bg-[#0B1A33]/90 transition-colors"
        >
          <Plus size={14} /> Contract nou
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-gray-400">
            {tab === 'activ' ? 'Nu există contracte active.' : 'Nu există contracte terminate.'}
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/40 bg-white/30 text-left">
                {/* Chevron column — first */}
                <th className="w-10 px-3 py-3" />
                <th className={thCls}>Candidat</th>
                <th className={thCls}>Rol · Client</th>
                <th className={thCls}>Perioadă</th>
                <th className={thCls}>Pay rate</th>
                <th className={thCls}>Bill rate</th>
                <th className={thCls} title="Estimat: 20 zile/lună (rate zilnic) sau 160 ore/lună (rate orar)">Marjă/lună <span className="text-gray-300 font-normal text-[10px]">est.</span></th>
                {tab === 'activ'
                  ? <th className={thCls}>Status</th>
                  : <th className={thCls}>Motiv terminare</th>
                }
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(c => {
                const m = calcMargin(c)
                const unitLabel = c.rate_type === 'daily' ? 'zi' : 'oră'
                const expanded = expandedIds.has(c.id)
                const historyEntries = historyMap[c.id]
                return (
                  <Fragment key={c.id}>
                    {/* ── Contract row ── */}
                    <tr className={cn(
                      'hover:bg-gray-50/60 transition-colors border-t border-gray-50',
                      expanded && 'bg-gray-50/40'
                    )}>
                      {/* Chevron — first column */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleExpand(c.id)}
                          title="Istoric modificări"
                          className={cn(
                            'p-1.5 rounded-lg transition-all',
                            expanded
                              ? 'bg-blue-50 text-[#2AA3FF]'
                              : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          <ChevronDown
                            size={14}
                            className={cn('transition-transform duration-200', expanded && 'rotate-180')}
                          />
                        </button>
                      </td>

                      <td className="px-4 py-3"><CandidateAvatar c={c} /></td>

                      <td className="px-4 py-3">
                        {c.role_id ? (
                          <Link href={`/roles/${c.role_id}/pipeline`} className="text-sm font-medium text-gray-800 hover:text-[#2AA3FF] transition-colors">
                            {c.role?.title ?? '—'}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium text-gray-800">{c.role?.title ?? '—'}</span>
                        )}
                        {c.role?.client && <p className="text-[11px] text-gray-400">{c.role.client.name}</p>}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar size={11} className="text-gray-300 flex-shrink-0" />
                          <span>{new Date(c.start_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        {c.end_date && (
                          <p className="text-[11px] text-gray-400 mt-0.5 pl-4">
                            → {new Date(c.end_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">{formatRate(c.pay_rate, c.currency, c.rate_type)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">{formatRate(c.bill_rate, c.currency, c.rate_type)}</td>

                      <td className="px-4 py-3">
                        <p className={`text-sm font-bold ${m.netMonthly >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {m.netMonthly >= 0 ? '+' : ''}{m.netMonthly.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} {c.currency}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {m.netPct}% · {m.netUnit >= 0 ? '+' : ''}{m.netUnit.toFixed(2)}/{unitLabel}
                          {m.monthlyComms > 0 && <span className="ml-1 text-amber-500">−com.</span>}
                        </p>
                      </td>

                      {tab === 'activ' ? (
                        <td className="px-4 py-3">
                          {(() => { const st = daysLeftBadge(c.end_date); return (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                          )})()}
                        </td>
                      ) : (
                        <td className="px-4 py-3">
                          {c.termination_reason
                            ? <span className="text-xs text-gray-500">{c.termination_reason}</span>
                            : <span className="text-xs text-gray-300">—</span>
                          }
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {c.contract_status === 'activ' && (
                            <button
                              onClick={() => setEditContractId(c.id)}
                              className="text-xs text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            >
                              Editează
                            </button>
                          )}
                          {tab === 'activ' && (
                            <button
                              onClick={() => setTerminateId(c.id)}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                            >
                              <XCircle size={12} /> Termină
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id}
                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                            title="Șterge contract"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── History rows ── */}
                    {expanded && (
                      historyEntries === null
                        ? (
                          <tr key={`${c.id}-hist-loading`}>
                            <td colSpan={colSpanAll} className="px-6 py-3 text-center text-xs text-gray-400">
                              <Loader2 size={12} className="animate-spin inline mr-1.5" />
                              Se încarcă istoricul...
                            </td>
                          </tr>
                        )
                        : historyEntries !== undefined && historyEntries.length === 0
                        ? (
                          <tr key={`${c.id}-hist-empty`} className="bg-gray-50/30">
                            <td colSpan={colSpanAll} className="px-6 py-2.5 text-xs text-gray-400 italic border-t border-gray-100">
                              Fără modificări înregistrate.
                            </td>
                          </tr>
                        )
                        : historyEntries?.map((entry, idx) => (
                          <tr
                            key={entry.id}
                            className={cn(
                              'border-t border-blue-100/60 text-xs',
                              idx % 2 === 0 ? 'bg-blue-50/25' : 'bg-blue-50/15'
                            )}
                          >
                            {/* Chevron col — empty for history rows */}
                            <td className="px-3 py-2">
                              <div className="w-0.5 h-full bg-blue-200/60 mx-auto rounded-full" />
                            </td>

                            {/* Timestamp (replaces candidat) */}
                            <td className="px-4 py-2">
                              <span className="text-[11px] text-[#2AA3FF]/80 font-medium">
                                ↳ {new Date(entry.changed_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="ml-1.5 text-[11px] text-gray-300">
                                {new Date(entry.changed_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>

                            {/* Rol · Client (same as contract) */}
                            <td className="px-4 py-2 text-[11px] text-gray-400">
                              {c.role?.title ?? '—'}
                              {c.role?.client && <p className="text-[10px] text-gray-300">{c.role.client.name}</p>}
                            </td>

                            {/* Perioadă */}
                            <td className="px-4 py-2">
                              <HistoryPerioadaCell
                                startDate={c.start_date}
                                endDate={entry.end_date}
                                change={entry.changes.end_date}
                              />
                            </td>

                            {/* Pay rate */}
                            <td className="px-4 py-2">
                              <HistoryRateCell
                                value={entry.pay_rate}
                                change={entry.changes.pay_rate}
                                currency={c.currency}
                                rateType={c.rate_type}
                              />
                            </td>

                            {/* Bill rate */}
                            <td className="px-4 py-2">
                              <HistoryRateCell
                                value={entry.bill_rate}
                                change={entry.changes.bill_rate}
                                currency={c.currency}
                                rateType={c.rate_type}
                              />
                            </td>

                            {/* Marjă — calculată din snapshot + date fixe ale contractului */}
                            <td className="px-4 py-2">
                              <HistoryMarginCell entry={entry} c={c} />
                            </td>

                            {/* Status — omis în history */}
                            <td className="px-4 py-2 text-[11px] text-gray-300">—</td>

                            {/* Acțiuni — goală */}
                            <td />
                          </tr>
                        ))
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <ContractModal candidates={candidates} roles={roles} partners={partners} onClose={() => setShowNew(false)} onSaved={handleSaved} />
      )}
      {editContractId && (
        <ContractModal contractId={editContractId} onClose={() => setEditContractId(null)} onSaved={handleSaved} />
      )}
      {terminateId && (
        <TerminateModal onConfirm={handleTerminate} onClose={() => setTerminateId(null)} loading={terminating} />
      )}
    </>
  )
}
