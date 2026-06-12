'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SkillSelector } from '@/components/ui/SkillSelector'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Skill { id: string; name: string; category: string }
interface Client { id: string; name: string; fieldglass_enabled: boolean }

interface RoleFormProps {
  initial?: Record<string, unknown>
  roleId?: string
}

const SENIORITY_OPTIONS = [
  { value: '', label: 'Selectează...' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
]

const COLLAB_OPTIONS = [
  { value: '', label: 'Selectează...' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
]

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'RON']

const RATE_TYPE_OPTIONS = [
  { value: 'daily', label: 'Per zi' },
  { value: 'hourly', label: 'Per oră' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Activ' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed', label: 'Închis' },
  { value: 'filled', label: 'Ocupat' },
]

export function RoleForm({ initial, roleId }: RoleFormProps) {
  const router = useRouter()
  const isEdit = !!roleId

  const [clients, setClients] = useState<Client[]>([])
  const [requiredSkills, setRequiredSkills] = useState<Skill[]>((initial?.required_skills as Skill[]) ?? [])
  const [preferredSkills, setPreferredSkills] = useState<Skill[]>((initial?.preferred_skills as Skill[]) ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: (initial?.title as string) ?? '',
    client_id: (initial?.client_id as string) ?? '',
    description: (initial?.description as string) ?? '',
    location: (initial?.location as string) ?? '',
    seniority: (initial?.seniority as string) ?? '',
    collaboration_type: (initial?.collaboration_type as string) ?? '',
    status: (initial?.status as string) ?? 'active',
    fieldglass_id: (initial?.fieldglass_id as string) ?? '',
    deadline: (initial?.deadline as string) ?? '',
    rate: (initial?.rate as string) ?? '',
    rate_currency: (initial?.rate_currency as string) ?? 'EUR',
    rate_type: (initial?.rate_type as string) ?? 'daily',
  })

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(setClients).catch(() => {})
  }, [])

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Titlul rolului este obligatoriu'); return }
    if (!form.client_id) { setError('Clientul este obligatoriu'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        seniority: form.seniority || null,
        collaboration_type: form.collaboration_type || null,
        deadline: form.deadline || null,
        fieldglass_id: form.fieldglass_id || null,
        rate: form.rate ? parseFloat(form.rate) : null,
        rate_currency: form.rate_currency,
        rate_type: form.rate_type,
        required_skill_ids: requiredSkills.map(s => s.id),
        preferred_skill_ids: preferredSkills.map(s => s.id),
      }

      const url = isEdit ? `/api/roles/${roleId}` : '/api/roles'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (!isEdit && form.status === 'active') {
        fetch(`/api/roles/${data.id}/match`, { method: 'POST' }).catch(() => {})
      }

      router.push('/roles')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'glass-input w-full px-3 py-2.5 rounded-lg text-sm'

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">

        {/* ── LEFT: informații structurate ── */}
        <div className="space-y-6">

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Informații de bază</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titlu rol <span className="text-red-500">*</span></label>
                <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                  className={inputCls} placeholder="ex: Senior Java Developer" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client <span className="text-red-500">*</span></label>
                <select value={form.client_id} onChange={e => set('client_id', e.target.value)} className={inputCls} required>
                  <option value="">Selectează clientul...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senioritate</label>
                  <select value={form.seniority} onChange={e => set('seniority', e.target.value)} className={inputCls}>
                    {SENIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip colaborare</label>
                  <select value={form.collaboration_type} onChange={e => set('collaboration_type', e.target.value)} className={inputCls}>
                    {COLLAB_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Locație</label>
                  <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                    placeholder="ex: Londra, Remote" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fieldglass ID</label>
                  <input type="text" value={form.fieldglass_id} onChange={e => set('fieldglass_id', e.target.value)}
                    placeholder="ex: RFTJP0001234" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline submisii</label>
                  <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate rol</label>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" min="0" step="0.01" value={form.rate}
                    onChange={e => set('rate', e.target.value)}
                    placeholder="0.00"
                    className="glass-input col-span-1 px-3 py-2.5 rounded-lg text-sm w-full" />
                  <select value={form.rate_currency} onChange={e => set('rate_currency', e.target.value)}
                    className={inputCls}>
                    {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={form.rate_type} onChange={e => set('rate_type', e.target.value)}
                    className={inputCls}>
                    {RATE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Skilluri obligatorii</h3>
            <SkillSelector selected={requiredSkills} onChange={setRequiredSkills}
              placeholder="Caută skilluri obligatorii..." />
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Skilluri preferate</h3>
            <SkillSelector selected={preferredSkills} onChange={setPreferredSkills}
              placeholder="Caută skilluri preferate (nice-to-have)..." />
          </section>

          <div className="pt-4 border-t border-gray-200/60">
            <p className="text-xs text-gray-400 mb-3"><span className="text-red-500">*</span> Câmpuri obligatorii</p>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 bg-[#2AA3FF] hover:bg-[#1a8fe0] disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {isEdit ? 'Salvează modificările' : 'Creează rol'}
              </button>
              <button type="button" onClick={() => router.back()}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-white/40 rounded-xl transition-colors">
                Anulează
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: JD text complet ── */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Job Description complet
            <span className="ml-2 text-gray-300 normal-case font-normal">(lipești textul din Fieldglass)</span>
          </h3>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            className={cn(inputCls, 'min-h-[560px] resize-y font-mono text-xs leading-relaxed whitespace-pre-wrap')}
            placeholder="Lipește aici textul complet al JD-ului: cerințe, responsabilități, context rol, Required Knowledge..."
          />
          <p className="text-xs text-gray-400 mt-2">
            Textul JD va fi folosit de AI pentru scoring automat în F3.
          </p>
        </div>
      </div>
    </form>
  )
}
