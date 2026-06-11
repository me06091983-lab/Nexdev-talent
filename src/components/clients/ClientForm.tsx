'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface ClientFormProps {
  initial?: Record<string, unknown>
  clientId?: string
}

export function ClientForm({ initial, clientId }: ClientFormProps) {
  const router = useRouter()
  const isEdit = !!clientId

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
  })

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Numele clientului este obligatoriu'); return }

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
      }

      const url = isEdit ? `/api/clients/${clientId}` : '/api/clients'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/clients')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'glass-input w-full px-3 py-2.5 rounded-lg text-sm'

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      <div className="space-y-6">

        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Informații client</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nume client <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                className={inputCls} placeholder="ex: London Stock Exchange Group" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data început colaborare</label>
                <input type="date" value={form.collaboration_start} onChange={e => set('collaboration_start', e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Locație</label>
                <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                  placeholder="ex: Londra, UK" className={inputCls} />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input type="checkbox" id="fieldglass_enabled" checked={form.fieldglass_enabled}
                onChange={e => set('fieldglass_enabled', e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="fieldglass_enabled" className="text-sm text-gray-700">
                Client cu Fieldglass (LSEG)
              </label>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persoană de contact</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nume persoană de contact</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                  placeholder="+44 7..." className={inputCls} />
              </div>
            </div>
          </div>
        </section>

        <div className="pt-4 border-t border-gray-200/60">
          <p className="text-xs text-gray-400 mb-3"><span className="text-red-500">*</span> Câmp obligatoriu</p>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 bg-[#2AA3FF] hover:bg-[#1a8fe0] disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'Salvează modificările' : 'Adaugă client'}
            </button>
            <button type="button" onClick={() => router.back()}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-white/40 rounded-xl transition-colors">
              Anulează
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
