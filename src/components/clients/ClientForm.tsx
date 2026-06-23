'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Building2, User, History, ExternalLink } from 'lucide-react'

interface ClientFormProps {
  initial?: Record<string, unknown>
  clientId?: string
  roles?: ClientRole[]
}

interface ClientRole {
  id: string
  title: string
  status: string | null
  fieldglass_id: string | null
  created_at: string
  submissions_count?: number
}

const ROLE_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  on_hold: 'On hold',
  filled: 'Filled',
}

const ROLE_STATUS_CLS: Record<string, string> = {
  open: 'bg-green-50 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200',
  filled: 'bg-blue-50 text-blue-700 border-blue-200',
}

type TabId = 'general' | 'companie' | 'istoric'

interface TabDef { id: TabId; label: string; icon: React.ReactNode }

export function ClientForm({ initial, clientId, roles = [] }: ClientFormProps) {
  const router = useRouter()
  const isEdit = !!clientId

  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: (initial?.name as string) ?? '',
    collaboration_start: (initial?.collaboration_start as string) ?? '',
    location: (initial?.location as string) ?? '',
    contact_name: (initial?.contact_name as string) ?? '',
    contact_email: (initial?.contact_email as string) ?? '',
    contact_phone: (initial?.contact_phone as string) ?? '',
    fieldglass_enabled: (initial?.fieldglass_enabled as boolean) ?? false,
    cui: (initial?.cui as string) ?? '',
    vat_registered: (initial?.vat_registered as boolean) ?? false,
    bank_account: (initial?.bank_account as string) ?? '',
    website: (initial?.website as string) ?? '',
    notes: (initial?.notes as string) ?? '',
  })

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Client name is required'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        collaboration_start: form.collaboration_start || null,
        location: form.location || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        cui: form.cui || null,
        bank_account: form.bank_account || null,
        website: form.website || null,
        notes: form.notes || null,
      }

      const url = isEdit ? `/api/clients/${clientId}` : '/api/clients'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/clients')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save error')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'glass-input w-full px-3 py-2.5 rounded-lg text-sm'

  const tabs: TabDef[] = [
    { id: 'general', label: 'General', icon: <User size={14} /> },
    { id: 'companie', label: 'Company', icon: <Building2 size={14} /> },
    ...(isEdit ? [{ id: 'istoric' as TabId, label: 'Role history', icon: <History size={14} /> }] : []),
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200/60 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-[#2AA3FF] text-[#2AA3FF]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ─── Tab: General ─────────────────────────────────────── */}
        {activeTab === 'general' && (
          <div className="max-w-xl space-y-6">
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                    className={inputCls} placeholder="ex: London Stock Exchange Group" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Collaboration start date</label>
                    <input type="date" value={form.collaboration_start} onChange={e => set('collaboration_start', e.target.value)}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                      placeholder="ex: London, UK" className={inputCls} />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <input type="checkbox" id="fieldglass_enabled" checked={form.fieldglass_enabled}
                    onChange={e => set('fieldglass_enabled', e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
                  <label htmlFor="fieldglass_enabled" className="text-sm text-gray-700">
                    Client with Fieldglass (LSEG)
                  </label>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact person</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact person name</label>
                  <input type="text" value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                    placeholder="ex: John Smith" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                      placeholder="john.smith@lseg.com" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                      placeholder="+44 7..." className={inputCls} />
                  </div>
                </div>
              </div>
            </section>

            <SaveRow saving={saving} isEdit={isEdit} onCancel={() => router.back()} />
          </div>
        )}

        {/* ─── Tab: Companie ────────────────────────────────────── */}
        {activeTab === 'companie' && (
          <div className="max-w-xl space-y-6">
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tax and banking details</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID / Fiscal code</label>
                    <input type="text" value={form.cui} onChange={e => set('cui', e.target.value)}
                      placeholder="ex: GB123456789" className={inputCls} />
                  </div>
                  <div className="flex items-end pb-2.5">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="vat_registered" checked={form.vat_registered}
                        onChange={e => set('vat_registered', e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
                      <label htmlFor="vat_registered" className="text-sm text-gray-700">VAT registered</label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank account / IBAN</label>
                  <input type="text" value={form.bank_account} onChange={e => set('bank_account', e.target.value)}
                    placeholder="ex: GB82 WEST 1234 5698 7654 32" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input type="url" value={form.website} onChange={e => set('website', e.target.value)}
                    placeholder="https://www.lseg.com" className={inputCls} />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Internal notes</h3>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                rows={4} placeholder="Relevant client information, special conditions, observations..."
                className={inputCls + ' resize-none'} />
            </section>

            <SaveRow saving={saving} isEdit={isEdit} onCancel={() => router.back()} />
          </div>
        )}

        {/* ─── Tab: Istoric roluri (read-only) ─────────────────── */}
        {activeTab === 'istoric' && (
          <div className="max-w-2xl">
            {roles.length === 0 ? (
              <div className="text-center py-16">
                <Building2 size={36} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">No roles created for this client yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-4">{roles.length} {roles.length === 1 ? 'role' : 'roles'} total</p>
                {roles.map(r => {
                  const statusLabel = ROLE_STATUS_LABELS[r.status ?? ''] ?? r.status ?? '—'
                  const statusCls = ROLE_STATUS_CLS[r.status ?? ''] ?? 'bg-gray-100 text-gray-500 border-gray-200'
                  return (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3 bg-white/60 border border-gray-100 rounded-xl hover:bg-white/80 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${statusCls}`}>
                          {statusLabel}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {r.fieldglass_id && (
                              <span className="text-[11px] text-gray-400 font-mono">{r.fieldglass_id}</span>
                            )}
                            <span className="text-[11px] text-gray-400">
                              {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {r.submissions_count !== undefined && r.submissions_count > 0 && (
                              <span className="text-[11px] text-gray-400">{r.submissions_count} candidates</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`/roles/${r.id}/pipeline`}
                        className="flex-shrink-0 ml-3 p-1.5 text-gray-300 hover:text-[#2AA3FF] hover:bg-blue-50 rounded transition-colors"
                        title="Open pipeline"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </form>
    </div>
  )
}

function SaveRow({ saving, isEdit, onCancel }: { saving: boolean; isEdit: boolean; onCancel: () => void }) {
  return (
    <div className="pt-4 border-t border-gray-200/60">
      <p className="text-xs text-gray-400 mb-3"><span className="text-red-500">*</span> Required field</p>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 bg-[#2AA3FF] hover:bg-[#1a8fe0] disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {isEdit ? 'Save changes' : 'Add client'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-white/40 rounded-xl transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
