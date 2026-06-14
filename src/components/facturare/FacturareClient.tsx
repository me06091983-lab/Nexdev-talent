'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Check,
  Loader2, ArrowUpRight, ArrowDownLeft, FileText, AlertCircle, X, Pencil, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Factura {
  id: string
  type: 'emisa' | 'primita'
  valoare: number
  valuta: string
  data_emitere: string
  data_scadenta: string | null
  incasata_platita: boolean
  data_incasare_plata: string | null
  tva_valoare: number
  numar_factura: string | null
  client_id: string | null
  contract_id: string | null
  client_name: string | null
  candidate_name: string | null
  luna_efectiva: number | null
  notes: string | null
}

interface ActiveContract {
  id: string
  currency: string
  candidate_name: string
}

interface Client {
  id: string
  name: string
}

interface PageData {
  facturi: Factura[]
  activeContracts: ActiveContract[]
  clients: Client[]
}

interface FormState {
  type: 'emisa' | 'primita'
  client_id: string
  contract_id: string
  numar_factura: string
  valoare: string
  valuta: string
  data_emitere: string
  data_scadenta: string
  incasata_platita: boolean
  data_incasare_plata: string
  tva_valoare: string
  luna_efectiva: string
  notes: string
}

interface ExpectedAmt {
  netValue: number
  currency: string
  hasTva: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']
const MONTHS_FULL  = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
const CURRENCIES   = ['EUR', 'USD', 'GBP', 'RON']
const TVA          = 0.21

function fmt(n: number, currency: string) {
  return `${n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isOverdue(d: string | null, settled: boolean): boolean {
  if (!d || settled) return false
  return new Date(d + 'T23:59:59') < new Date()
}

function emptyForm(type: 'emisa' | 'primita'): FormState {
  return {
    type,
    client_id: '',
    contract_id: '',
    numar_factura: '',
    valoare: '',
    valuta: 'EUR',
    data_emitere: new Date().toISOString().split('T')[0],
    data_scadenta: '',
    incasata_platita: false,
    data_incasare_plata: '',
    tva_valoare: '',
    luna_efectiva: '',
    notes: '',
  }
}

function facturaToForm(f: Factura): FormState {
  return {
    type:                f.type,
    client_id:           f.client_id   ?? '',
    contract_id:         f.contract_id ?? '',
    numar_factura:       f.numar_factura ?? '',
    valoare:             String(f.valoare),
    valuta:              f.valuta,
    data_emitere:        f.data_emitere,
    data_scadenta:       f.data_scadenta ?? '',
    incasata_platita:    f.incasata_platita,
    data_incasare_plata: f.data_incasare_plata ?? '',
    tva_valoare:         f.tva_valoare > 0 ? String(f.tva_valoare) : '',
    luna_efectiva:       f.luna_efectiva != null ? String(f.luna_efectiva) : '',
    notes:               f.notes ?? '',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FacturareClient() {
  const now = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [year,    setYear]    = useState(currentYear)
  const [month,   setMonth]   = useState(currentMonth)
  const [showAll, setShowAll] = useState(false)
  const [tab,     setTab]     = useState<'emisa' | 'primita'>('emisa')
  const [data,    setData]    = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  const [showForm,  setShowForm]  = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form,      setForm]      = useState<FormState>(emptyForm('emisa'))
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  // Amount validation states
  const [expectedAmt,    setExpectedAmt]    = useState<ExpectedAmt | null>(null)
  const [amountMismatch, setAmountMismatch] = useState(false)
  const [loadingExpected, setLoadingExpected] = useState(false)
  const [tvaMismatch,    setTvaMismatch]    = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchData = useCallback(async (y: number, m: number, all: boolean) => {
    setLoading(true)
    const params = all ? `?all=true` : `?year=${y}&month=${m}`
    const res = await fetch(`/api/facturi${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData(year, month, showAll) }, [year, month, showAll, fetchData])

  // ── Expected amount from timesheets (only for primite + luna_efectiva set) ──
  useEffect(() => {
    setExpectedAmt(null)
    setAmountMismatch(false)
    setTvaMismatch(false)

    if (form.type !== 'primita' || !form.contract_id || !form.luna_efectiva || !form.data_emitere) return

    const yr = parseInt(form.data_emitere.split('-')[0])
    if (isNaN(yr)) return

    setLoadingExpected(true)
    fetch(`/api/timesheets?year=${yr}`)
      .then(r => r.json())
      .then(d => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = (d.rows ?? []).find((r: any) => r.contract_id === form.contract_id)
        if (!row) { setExpectedAmt(null); return }

        const mn          = parseInt(form.luna_efectiva)
        const hours       = (row.hours ?? {})[mn] ?? 0
        const hourlyRate  = row.rate_type === 'daily' ? row.pay_rate / 8 : row.pay_rate
        const netValue    = Math.round(hours * hourlyRate * 100) / 100

        setExpectedAmt({ netValue, currency: row.currency, hasTva: row.candidate_tva })
      })
      .catch(() => setExpectedAmt(null))
      .finally(() => setLoadingExpected(false))
  }, [form.contract_id, form.luna_efectiva, form.data_emitere, form.type])

  function selectMonth(m: number) {
    setMonth(m)
    setShowAll(false)
  }

  function openAddForm() {
    setEditingId(null)
    setForm(emptyForm(tab))
    setFormError('')
    setExpectedAmt(null)
    setAmountMismatch(false)
    setTvaMismatch(false)
    setShowForm(true)
  }

  function openEditForm(f: Factura) {
    setEditingId(f.id)
    setForm(facturaToForm(f))
    setFormError('')
    setExpectedAmt(null)
    setAmountMismatch(false)
    setTvaMismatch(false)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setFormError('')
    setExpectedAmt(null)
    setAmountMismatch(false)
    setTvaMismatch(false)
  }

  function handleTabChange(t: 'emisa' | 'primita') {
    setTab(t)
    setSearch('')
    if (showForm && !editingId) {
      setForm(emptyForm(t))
      setFormError('')
      setExpectedAmt(null)
      setAmountMismatch(false)
    setTvaMismatch(false)
    }
  }

  function handleContractChange(contractId: string) {
    const contract = data?.activeContracts.find(c => c.id === contractId)
    setForm(prev => ({ ...prev, contract_id: contractId, valuta: contract?.currency ?? prev.valuta }))
    setAmountMismatch(false)
    setTvaMismatch(false)
  }

  function handleValoarChange(val: string) {
    setForm(p => ({ ...p, valoare: val }))
    setAmountMismatch(false)
    setTvaMismatch(false)
  }

  function handleTvaChange(val: string) {
    setForm(p => ({ ...p, tva_valoare: val }))
    setTvaMismatch(false)
  }

  async function handleSubmit() {
    if (!form.valoare || !form.data_emitere) {
      setFormError('Valoare și data emitere sunt obligatorii.')
      return
    }
    if (form.type === 'emisa' && !form.client_id) {
      setFormError('Selectează un client.')
      return
    }
    if (form.type === 'primita' && !form.contract_id) {
      setFormError('Selectează un candidat.')
      return
    }

    // Soft block on first save if net amount or currency doesn't match timesheet
    if (form.type === 'primita' && expectedAmt !== null && !amountMismatch) {
      const entered      = parseFloat(form.valoare || '0')
      const amtDiffers   = expectedAmt.netValue > 0 && Math.abs(entered - expectedAmt.netValue) > 0.01
      const curDiffers   = form.valuta !== expectedAmt.currency
      if (amtDiffers || curDiffers) {
        setAmountMismatch(true)
        return
      }
    }

    // Soft block if TVA differs from 21% of net value — only for RON invoices
    if (!tvaMismatch && form.valuta === 'RON' && form.tva_valoare) {
      const net         = parseFloat(form.valoare    || '0')
      const tvaEntered  = parseFloat(form.tva_valoare || '0')
      const tvaExpected = Math.round(net * 0.21 * 100) / 100
      if (net > 0 && Math.abs(tvaEntered - tvaExpected) > 0.01) {
        setTvaMismatch(true)
        return
      }
    }

    setSaving(true)
    setFormError('')

    const body = {
      type:             form.type,
      client_id:        form.type === 'emisa'  ? (form.client_id   || null) : null,
      contract_id:      form.type === 'primita' ? (form.contract_id || null) : null,
      numar_factura:    form.numar_factura.trim() || null,
      valoare:          parseFloat(form.valoare),
      valuta:           form.valuta,
      data_emitere:     form.data_emitere,
      data_scadenta:    form.data_scadenta || null,
      incasata_platita:    form.incasata_platita,
      data_incasare_plata: form.incasata_platita && form.data_incasare_plata ? form.data_incasare_plata : null,
      tva_valoare:         parseFloat(form.tva_valoare || '0'),
      luna_efectiva:       form.luna_efectiva ? parseInt(form.luna_efectiva) : null,
      notes:            form.notes.trim() || null,
    }

    const url    = editingId ? `/api/facturi/${editingId}` : '/api/facturi'
    const method = editingId ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        closeForm()
        fetchData(year, month, showAll)
      } else {
        const d = await res.json()
        setFormError(d.error ?? 'Eroare la salvare')
      }
    } catch {
      setFormError('Eroare de rețea. Verifică conexiunea și încearcă din nou.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(f: Factura) {
    setTogglingId(f.id)
    const nowPaid = !f.incasata_platita
    try {
      await fetch(`/api/facturi/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incasata_platita: nowPaid,
          data_incasare_plata: nowPaid ? new Date().toISOString().split('T')[0] : null,
        }),
      })
    } finally {
      setTogglingId(null)
      fetchData(year, month, showAll)
    }
  }

  async function deleteFactura(id: string) {
    if (!confirm('Ștergi această factură?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/facturi/${id}`, { method: 'DELETE' })
      if (!res.ok) { alert('Eroare la ștergerea facturii.'); return }
    } catch {
      alert('Eroare de rețea la ștergerea facturii.')
      return
    } finally {
      setDeletingId(null)
    }
    fetchData(year, month, showAll)
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const isEmit    = tab === 'emisa'
  const isEditing = editingId !== null

  const filtered = useMemo(() => {
    const byTab = (data?.facturi ?? []).filter(f => f.type === tab)
    if (!search.trim()) return byTab
    const term = search.trim().toLowerCase()
    return byTab.filter(f => {
      const name = isEmit ? (f.client_name ?? '') : (f.candidate_name ?? '')
      return (
        name.toLowerCase().includes(term) ||
        (f.numar_factura ?? '').toLowerCase().includes(term) ||
        String(f.valoare).includes(term)
      )
    })
  }, [data, tab, search, isEmit])

  const summary = useMemo(() =>
    filtered.reduce<Record<string, { total: number; settled: number; pending: number }>>(
      (acc, f) => {
        const cur = f.valuta
        if (!acc[cur]) acc[cur] = { total: 0, settled: 0, pending: 0 }
        acc[cur].total += f.valoare
        if (f.incasata_platita) acc[cur].settled += f.valoare
        else acc[cur].pending += f.valoare
        return acc
      },
      {}
    ),
    [filtered]
  )

  const periodLabel = showAll
    ? 'toate facturile'
    : new Date(year, month - 1, 1)
        .toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
        .replace(/^./, c => c.toUpperCase())

  // ── Form JSX ─────────────────────────────────────────────────────────────────

  const formJSX = (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 text-sm">
          {isEditing
            ? `Editează factură ${isEmit ? 'emisă' : 'primită'}`
            : isEmit ? 'Factură nouă emisă' : 'Factură nouă primită'}
        </h3>
        <button onClick={closeForm} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Client / Candidat */}
        {form.type === 'emisa' ? (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Client *</label>
            <select
              value={form.client_id}
              onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30 bg-white"
            >
              <option value="">Selectează client...</option>
              {data?.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Candidat (contract activ) *</label>
            <select
              value={form.contract_id}
              onChange={e => handleContractChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30 bg-white"
            >
              <option value="">Selectează candidat...</option>
              {data?.activeContracts.length === 0 && <option disabled>Niciun contract activ</option>}
              {data?.activeContracts.map(c => (
                <option key={c.id} value={c.id}>{c.candidate_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Nr factură */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nr. factură</label>
          <input
            type="text"
            placeholder="ex: NX-2025-001"
            value={form.numar_factura}
            onChange={e => setForm(p => ({ ...p, numar_factura: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30"
          />
        </div>

        {/* Luna efectivă */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Luna efectivă</label>
          <select
            value={form.luna_efectiva}
            onChange={e => setForm(p => ({ ...p, luna_efectiva: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30 bg-white"
          >
            <option value="">— Neselectat —</option>
            {MONTHS_FULL.map((m, i) => (
              <option key={i + 1} value={String(i + 1)}>{m}</option>
            ))}
          </select>
        </div>

        {/* Data emitere */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data emitere *</label>
          <input
            type="date"
            value={form.data_emitere}
            onChange={e => setForm(p => ({ ...p, data_emitere: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30"
          />
        </div>

        {/* Due date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Due date</label>
          <input
            type="date"
            value={form.data_scadenta}
            onChange={e => setForm(p => ({ ...p, data_scadenta: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30"
          />
        </div>

        {/* Valoare NETĂ */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Valoare NETĂ *
            {loadingExpected && (
              <Loader2 size={10} className="inline ml-1 animate-spin text-gray-400" />
            )}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.valoare}
            onChange={e => handleValoarChange(e.target.value)}
            className={cn(
              'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2',
              amountMismatch
                ? 'border-red-400 text-red-600 bg-red-50 focus:ring-red-300/30'
                : 'border-gray-200 focus:ring-[#2AA3FF]/30'
            )}
          />
          {expectedAmt !== null && !loadingExpected && (
            <p className={cn(
              'text-[11px] mt-1 flex items-center gap-1',
              amountMismatch ? 'text-red-500 font-medium' : 'text-gray-400'
            )}>
              {amountMismatch
                ? <AlertCircle size={11} className="flex-shrink-0" />
                : <Check size={11} className="flex-shrink-0 text-green-500" />}
              {amountMismatch
                ? <>Valoare netă așteptată: <strong>{fmt(expectedAmt.netValue, expectedAmt.currency)}</strong></>
                : <>Valoare netă din timesheet: {fmt(expectedAmt.netValue, expectedAmt.currency)}{expectedAmt.hasTva ? ' (TVA separat)' : ''}</>
              }
            </p>
          )}
          {expectedAmt !== null && expectedAmt.netValue === 0 && !loadingExpected && (
            <p className="text-[11px] mt-1 text-amber-500 flex items-center gap-1">
              <AlertCircle size={11} />
              Nicio oră înregistrată în timesheet pentru luna selectată.
            </p>
          )}
        </div>

        {/* TVA */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">TVA</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.tva_valoare}
            onChange={e => handleTvaChange(e.target.value)}
            className={cn(
              'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2',
              tvaMismatch
                ? 'border-red-400 text-red-600 bg-red-50 focus:ring-red-300/30'
                : 'border-gray-200 focus:ring-[#2AA3FF]/30'
            )}
          />
          {tvaMismatch && form.valuta === 'RON' && (
            <p className="text-[11px] mt-1 flex items-center gap-1 text-red-500 font-medium">
              <AlertCircle size={11} className="flex-shrink-0" />
              TVA așteptat (21%): <strong>{(Math.round(parseFloat(form.valoare || '0') * 0.21 * 100) / 100).toFixed(2)}</strong>
            </p>
          )}
        </div>

        {/* Valoare totală (auto-calculată) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Valoare totală</label>
          <div className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 font-semibold tabular-nums">
            {((parseFloat(form.valoare || '0') + parseFloat(form.tva_valoare || '0')) || 0).toFixed(2)}
            <span className="ml-1.5 text-xs font-normal text-gray-400">{form.valuta}</span>
          </div>
        </div>

        {/* Valută */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Valută</label>
          <select
            value={form.valuta}
            onChange={e => setForm(p => ({ ...p, valuta: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30 bg-white"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Checkbox + data efectivă */}
        <div className="col-span-2 flex flex-wrap items-center gap-4 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="incasata_platita"
              checked={form.incasata_platita}
              onChange={e => setForm(p => ({
                ...p,
                incasata_platita: e.target.checked,
                data_incasare_plata: e.target.checked && !p.data_incasare_plata
                  ? new Date().toISOString().split('T')[0]
                  : e.target.checked ? p.data_incasare_plata : '',
              }))}
              className="w-4 h-4 rounded accent-green-500"
            />
            <label htmlFor="incasata_platita" className="text-sm text-gray-600 cursor-pointer">
              {form.type === 'emisa' ? 'Factură deja încasată' : 'Factură deja plătită'}
            </label>
          </div>
          {form.incasata_platita && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">
                {form.type === 'emisa' ? 'Data încasării' : 'Data plății'}
              </label>
              <input
                type="date"
                value={form.data_incasare_plata}
                onChange={e => setForm(p => ({ ...p, data_incasare_plata: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30 bg-white"
              />
            </div>
          )}
        </div>

        {/* Notițe */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notițe</label>
          <textarea
            rows={2}
            placeholder="Observații, detalii suplimentare..."
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30"
          />
        </div>
      </div>

      {/* Mismatch warning banners */}
      {amountMismatch && expectedAmt !== null && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 leading-relaxed space-y-0.5">
            <p className="font-semibold">Valoare NETĂ sau valută diferită față de timesheet.</p>
            {(() => {
              const entered    = parseFloat(form.valoare || '0')
              const amtDiffers = Math.abs(entered - expectedAmt.netValue) > 0.01
              const curDiffers = form.valuta !== expectedAmt.currency
              return (
                <>
                  {amtDiffers && (
                    <p>Suma introdusă: <strong>{fmt(entered, form.valuta)}</strong> · Așteptat: <strong>{fmt(expectedAmt.netValue, expectedAmt.currency)}</strong></p>
                  )}
                  {curDiffers && (
                    <p>Valuta introdusă: <strong>{form.valuta}</strong> · Valuta din contract: <strong>{expectedAmt.currency}</strong></p>
                  )}
                  <p className="opacity-70">Apasă din nou <strong>Salvează</strong> dacă valorile sunt intenționat diferite.</p>
                </>
              )
            })()}
          </div>
        </div>
      )}
      {tvaMismatch && form.valuta === 'RON' && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 leading-relaxed">
            <span className="font-semibold">TVA diferit de 21%.</span>{' '}
            Valoarea așteptată este{' '}
            <strong>{(Math.round(parseFloat(form.valoare || '0') * 0.21 * 100) / 100).toFixed(2)} RON</strong>.
            {' '}Apasă din nou <strong>Salvează</strong> dacă suma este corectă.
          </div>
        </div>
      )}

      {formError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} /> {formError}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={closeForm} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
          Anulează
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className={cn(
            'flex-1 py-2.5 text-sm rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
            (amountMismatch || tvaMismatch)
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-[#0B1A33] hover:bg-[#0B1A33]/90 text-white'
          )}
        >
          {saving
            ? <><Loader2 size={14} className="animate-spin" /> Salvez...</>
            : (amountMismatch || tvaMismatch)
            ? 'Confirmă și salvează'
            : isEditing ? 'Salvează modificările' : 'Adaugă factură'}
        </button>
      </div>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturare</h1>
          <p className="text-sm text-gray-500 mt-0.5">Înregistrare manuală facturi emise și primite</p>
        </div>
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-gray-900 px-3 min-w-[52px] text-center tabular-nums">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Month bar + Toate */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setShowAll(true)}
          className={cn(
            'text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
            showAll
              ? 'bg-[#2AA3FF] text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 border border-dashed border-gray-200'
          )}
        >
          Toate
        </button>
        <span className="w-px h-4 bg-gray-200 mx-0.5" />
        {MONTHS_SHORT.map((m, mi) => {
          const mi1 = mi + 1
          return (
            <button
              key={m}
              onClick={() => selectMonth(mi1)}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                !showAll && month === mi1
                  ? 'bg-[#0B1A33] text-white shadow-sm'
                  : mi1 === currentMonth && year === currentYear
                  ? 'bg-blue-50 text-[#2AA3FF] border border-blue-100'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              {m}
            </button>
          )
        })}
      </div>

      {/* Tabs + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => handleTabChange('emisa')}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium rounded-lg px-4 py-1.5 transition-all',
              isEmit ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <ArrowUpRight size={14} />
            Facturi emise
          </button>
          <button
            onClick={() => handleTabChange('primita')}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium rounded-lg px-4 py-1.5 transition-all',
              !isEmit ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <ArrowDownLeft size={14} />
            Facturi primite
          </button>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#0B1A33] text-white text-sm font-medium rounded-xl hover:bg-[#0B1A33]/90 transition-colors"
        >
          <Plus size={14} />
          Adaugă factură
        </button>
      </div>

      {/* Summary cards */}
      {Object.entries(summary).map(([cur, s]) => (
        <div key={cur} className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-3">
            {isEmit
              ? <ArrowUpRight size={13} className="text-indigo-400 flex-shrink-0" />
              : <ArrowDownLeft size={13} className="text-green-500 flex-shrink-0" />}
            <div>
              <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">
                {isEmit ? 'Total facturat' : 'Total primit'} · {periodLabel}
              </p>
              <p className="text-lg font-bold text-[#0B1A33] leading-none">{fmt(s.total, cur)}</p>
            </div>
          </div>
          <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-3 border border-green-100 bg-green-50/40">
            <Check size={13} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">
                {isEmit ? 'Încasat' : 'Plătit'} · {periodLabel}
              </p>
              <p className="text-lg font-bold text-green-700 leading-none">{fmt(s.settled, cur)}</p>
            </div>
          </div>
          <div className={cn('glass rounded-xl px-3 py-2.5 flex items-center gap-3', s.pending > 0 ? 'border border-amber-100 bg-amber-50/40' : '')}>
            <AlertCircle size={13} className={cn('flex-shrink-0', s.pending > 0 ? 'text-amber-500' : 'text-gray-300')} />
            <div>
              <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">
                {isEmit ? 'Neîncasat' : 'Neplătit'} · {periodLabel}
              </p>
              <p className={cn('text-lg font-bold leading-none', s.pending > 0 ? 'text-amber-700' : 'text-gray-400')}>
                {fmt(s.pending, cur)}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Form (add or edit) */}
      {showForm && formJSX}

      {/* Search bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={isEmit ? 'Caută după client, nr. factură sau valoare...' : 'Caută după candidat, nr. factură sau valoare...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30 focus:border-[#2AA3FF] bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Se încarcă...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
            <FileText size={22} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-600 text-sm">
              {search
                ? `Niciun rezultat pentru „${search}"`
                : `Nicio factură ${isEmit ? 'emisă' : 'primită'}${showAll ? '' : ` în ${periodLabel}`}`}
            </p>
            {!search && (
              <p className="text-xs text-gray-400 mt-0.5">Apasă &quot;Adaugă factură&quot; pentru a înregistra una.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {isEmit ? 'Client' : 'Candidat'}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nr.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Luna ef.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Emitere</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Scadență</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notițe</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Val. NETĂ</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">TVA</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {isEmit ? 'Încasată' : 'Plătită'}<br />
                  <span className="font-normal normal-case tracking-normal opacity-60">dată ef.</span>
                </th>
                <th className="px-3 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const overdue = isOverdue(f.data_scadenta, f.incasata_platita)
                return (
                  <tr
                    key={f.id}
                    className={cn(
                      'border-b border-gray-50 hover:bg-gray-50/40 transition-colors',
                      overdue && 'bg-red-50/20',
                      editingId === f.id && 'bg-blue-50/30'
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {isEmit ? (f.client_name ?? '—') : (f.candidate_name ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                      {f.numar_factura ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {f.luna_efectiva != null ? (
                        <span className="text-xs font-medium bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full">
                          {MONTHS_SHORT[f.luna_efectiva - 1]}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {fmtDate(f.data_emitere)}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {f.data_scadenta ? (
                        <span className={cn(overdue ? 'text-red-500 font-semibold' : 'text-gray-500')}>
                          {fmtDate(f.data_scadenta)}
                          {overdue && <span className="ml-1">⚠</span>}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      {f.notes
                        ? <span className="text-xs text-gray-500 line-clamp-2 leading-snug">{f.notes}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap text-gray-600">
                      {fmt(f.valoare, f.valuta)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap text-gray-500">
                      {f.tva_valoare > 0 ? fmt(f.tva_valoare, f.valuta) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap">
                      <span className={isEmit ? 'text-indigo-700' : 'text-green-700'}>
                        {fmt(f.valoare + (f.tva_valoare ?? 0), f.valuta)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => toggleStatus(f)}
                          disabled={togglingId === f.id}
                          title={f.incasata_platita
                            ? (isEmit ? 'Marchează ca neîncasată' : 'Marchează ca neplătită')
                            : (isEmit ? 'Marchează ca încasată' : 'Marchează ca plătită')}
                          className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto transition-all',
                            f.incasata_platita
                              ? 'bg-green-500 border-green-500 text-white hover:bg-green-600 hover:border-green-600'
                              : 'border-gray-300 hover:border-green-400 text-transparent hover:text-green-400'
                          )}
                        >
                          {togglingId === f.id
                            ? <Loader2 size={10} className="animate-spin text-current" />
                            : <Check size={11} />
                          }
                        </button>
                        {f.data_incasare_plata ? (
                          <span className="text-[10px] text-green-600 font-medium whitespace-nowrap">
                            {fmtDate(f.data_incasare_plata)}
                          </span>
                        ) : f.incasata_platita ? (
                          <span className="text-[10px] text-gray-300 whitespace-nowrap">dată lipsă</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-0.5 justify-end">
                        <button
                          onClick={() => openEditForm(f)}
                          className="p-1 text-gray-300 hover:text-[#2AA3FF] transition-colors rounded"
                          title="Editează factură"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteFactura(f.id)}
                          disabled={deletingId === f.id}
                          className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"
                          title="Șterge factură"
                        >
                          {deletingId === f.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} />
                          }
                        </button>
                      </div>
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
