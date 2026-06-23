'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Phone, Mail, Building2, Globe } from 'lucide-react'

export interface Partner {
  id: string
  first_name: string | null
  last_name: string
  phone: string | null
  contact_email: string | null
  name: string | null
  company_cui: string | null
  bank_account: string | null
  company_country: string | null
  commission_terms: string | null
}

const EMPTY: Omit<Partner, 'id'> = {
  first_name: '', last_name: '', phone: '', contact_email: '',
  name: '', company_cui: '', bank_account: '', company_country: '', commission_terms: '',
}

function PartnerModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Partner
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!initial
  const [form, setForm] = useState<Omit<Partner, 'id'>>(
    initial ? {
      first_name: initial.first_name ?? '',
      last_name: initial.last_name ?? '',
      phone: initial.phone ?? '',
      contact_email: initial.contact_email ?? '',
      name: initial.name ?? '',
      company_cui: initial.company_cui ?? '',
      bank_account: initial.bank_account ?? '',
      company_country: initial.company_country ?? '',
      commission_terms: initial.commission_terms ?? '',
    } : { ...EMPTY }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.last_name.trim()) { setError('Last name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const url = isEdit ? `/api/partners/${initial!.id}` : '/api/partners'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save error') }
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50 rounded-t-2xl">
          <h2 className="font-semibold text-gray-900 text-sm">{isEdit ? 'Edit partner' : 'Add partner'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Personal */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Personal details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First name</label>
              <input value={form.first_name ?? ''} onChange={e => set('first_name', e.target.value)} placeholder="John" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last name <span className="text-red-400">*</span></label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                <input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+40..." className={inputCls + ' pl-8'} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                <input type="email" value={form.contact_email ?? ''} onChange={e => set('contact_email', e.target.value)} placeholder="email@firma.com" className={inputCls + ' pl-8'} />
              </div>
            </div>
          </div>

          {/* Company */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pt-1">Company details</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company name</label>
            <div className="relative">
              <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              <input value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="Company Ltd" className={inputCls + ' pl-8'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company tax ID</label>
              <input value={form.company_cui ?? ''} onChange={e => set('company_cui', e.target.value)} placeholder="RO12345678" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company country</label>
              <div className="relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                <input value={form.company_country ?? ''} onChange={e => set('company_country', e.target.value)} placeholder="Romania" className={inputCls + ' pl-8'} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bank account (IBAN)</label>
            <input value={form.bank_account ?? ''} onChange={e => set('bank_account', e.target.value)} placeholder="RO49AAAA1B31007593840000" className={inputCls + ' font-mono text-xs'} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Commission terms <span className="text-gray-300">(optional)</span></label>
            <textarea value={form.commission_terms ?? ''} onChange={e => set('commission_terms', e.target.value)}
              rows={2} placeholder="E.g. 10% of first monthly salary..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50" />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 pb-5 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 text-sm text-white bg-[#0B1A33] hover:bg-[#0B1A33]/90 rounded-xl font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : isEdit ? 'Save' : 'Add partner'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PartnersClient({ partners: initial }: { partners: Partner[] }) {
  const router = useRouter()
  const [partners, setPartners] = useState<Partner[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Partner | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleSaved() {
    setShowAdd(false)
    setEditing(null)
    router.refresh()
    fetch('/api/partners').then(r => r.json()).then(setPartners).catch(() => {})
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this partner? Contracts linked to them will lose the reference.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/partners/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d.error ?? 'Error deleting partner.')
        return
      }
      setPartners(p => p.filter(x => x.id !== id))
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{partners.length} {partners.length === 1 ? 'partner' : 'partners'}</p>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#0B1A33] text-white text-sm font-medium rounded-xl hover:bg-[#0B1A33]/90 transition-colors">
          <Plus size={14} /> Add partner
        </button>
      </div>

      {partners.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Building2 size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400">No registered partners.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/40 bg-white/30 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Partner</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tax ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Country</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {partners.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {((p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')).toUpperCase() || '?'}
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {[p.first_name, p.last_name].filter(Boolean).join(' ')}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.contact_email && <p className="text-xs text-gray-600">{p.contact_email}</p>}
                    {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.company_cui ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.company_country ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(p)}
                        className="p-1 text-gray-300 hover:text-[#2AA3FF] hover:bg-blue-50 rounded transition-colors" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <PartnerModal onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {editing && <PartnerModal initial={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </>
  )
}
