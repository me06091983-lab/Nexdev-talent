'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SkillSelector } from '@/components/ui/SkillSelector'
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RubixMatrixPanel, RubixCriterion } from '@/components/roles/RubixMatrixPanel'

interface Skill { id: string; name: string; category: string }
interface Client { id: string; name: string; fieldglass_enabled: boolean }

interface RoleFormProps {
  initial?: Record<string, unknown>
  roleId?: string
  initialRubix?: RubixCriterion[]
}

const SENIORITY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
]

const COLLAB_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
]

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'RON']
const RATE_TYPE_OPTIONS = [
  { value: 'daily', label: 'Per day' },
  { value: 'hourly', label: 'Per hour' },
]
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed', label: 'Closed' },
  { value: 'filled', label: 'Filled' },
]

export function RoleForm({ initial, roleId, initialRubix }: RoleFormProps) {
  const router = useRouter()
  const isEdit = !!roleId

  const [clients, setClients] = useState<Client[]>([])
  const [requiredSkills, setRequiredSkills] = useState<Skill[]>((initial?.required_skills as Skill[]) ?? [])
  const [preferredSkills, setPreferredSkills] = useState<Skill[]>((initial?.preferred_skills as Skill[]) ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractMsg, setExtractMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [rubixCriteria, setRubixCriteria] = useState<RubixCriterion[]>(initialRubix ?? [])
  const [generatingRubix, setGeneratingRubix] = useState(false)
  const [rubixSaveStatus, setRubixSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [rubixSaveError, setRubixSaveError] = useState('')

  // Track whether rubixCriteria were changed after mount (to avoid saving initialRubix on load)
  const rubixChanged = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState({
    title: (initial?.title as string) ?? '',
    client_id: (initial?.client_id as string) ?? '',
    hiring_manager: (initial?.hiring_manager as string) ?? '',
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
    positions_count: (initial?.positions_count as string) ?? '1',
  })

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(setClients).catch(() => {})
  }, [])

  // Central rubix save function — used by both generate and debounce
  const saveRubix = useCallback(async (criteria: RubixCriterion[], rid: string) => {
    setRubixSaveStatus('saving')
    setRubixSaveError('')
    try {
      const res = await fetch(`/api/roles/${rid}/rubix-matrix`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setRubixSaveStatus('saved')
      setTimeout(() => setRubixSaveStatus('idle'), 2500)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setRubixSaveError(msg)
      setRubixSaveStatus('error')
      setTimeout(() => { setRubixSaveStatus('idle'); setRubixSaveError('') }, 5000)
    }
  }, [])

  // Debounced auto-save when user edits criteria manually (only after first change)
  function handleRubixChange(criteria: RubixCriterion[]) {
    setRubixCriteria(criteria)
    rubixChanged.current = true
    if (!roleId) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => saveRubix(criteria, roleId), 900)
  }

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleExtractSkills() {
    if (!form.description.trim()) {
      setExtractMsg({ type: 'error', text: 'Fill in the Job Description first.' })
      setTimeout(() => setExtractMsg(null), 4000)
      return
    }
    setExtracting(true)
    setExtractMsg(null)
    try {
      const res = await fetch('/api/roles/extract-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: form.description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const mergeSkills = (existing: Skill[], incoming: Skill[]) => {
        const existingIds = new Set(existing.map(s => s.id))
        return [...existing, ...incoming.filter(s => !existingIds.has(s.id))]
      }
      setRequiredSkills(mergeSkills(requiredSkills, data.required ?? []))
      setPreferredSkills(mergeSkills(preferredSkills, data.preferred ?? []))
      setExtractMsg({
        type: 'success',
        text: `AI identified ${data.required?.length ?? 0} required skills and ${data.preferred?.length ?? 0} preferred from JD.`,
      })
      setTimeout(() => setExtractMsg(null), 6000)
    } catch (err) {
      setExtractMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error extracting skills.' })
      setTimeout(() => setExtractMsg(null), 5000)
    } finally {
      setExtracting(false)
    }
  }

  async function handleGenerateRubix() {
    if (!form.description.trim()) {
      setExtractMsg({ type: 'error', text: 'Fill in the Job Description first to generate the Rubix Matrix.' })
      setTimeout(() => setExtractMsg(null), 4000)
      return
    }
    setGeneratingRubix(true)
    try {
      const res = await fetch('/api/roles/rubix/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: form.description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const newCriteria: RubixCriterion[] = data.criteria ?? []
      setRubixCriteria(newCriteria)
      rubixChanged.current = true

      // Save immediately after generation if role already exists
      if (roleId && newCriteria.length > 0) {
        await saveRubix(newCriteria, roleId)
      }
    } catch (err) {
      setExtractMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error generating Rubix Matrix.' })
      setTimeout(() => setExtractMsg(null), 5000)
    } finally {
      setGeneratingRubix(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Role title is required'); return }
    if (!form.client_id) { setError('Client is required'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        hiring_manager: form.hiring_manager || null,
        seniority: form.seniority || null,
        collaboration_type: form.collaboration_type || null,
        deadline: form.deadline || null,
        fieldglass_id: form.fieldglass_id || null,
        rate: form.rate ? parseFloat(form.rate) : null,
        rate_currency: form.rate_currency,
        rate_type: form.rate_type,
        positions_count: form.positions_count ? parseInt(form.positions_count) : 1,
        required_skill_ids: requiredSkills.map(s => s.id),
        preferred_skill_ids: preferredSkills.map(s => s.id),
      }

      const url = isEdit ? `/api/roles/${roleId}` : '/api/roles'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const savedRoleId = isEdit ? roleId : data.id

      // Save rubix — always for new roles, only if changed for edits
      if (rubixCriteria.length > 0 && (!isEdit || rubixChanged.current)) {
        await saveRubix(rubixCriteria, savedRoleId)
      }

      if (!isEdit && form.status === 'active') {
        fetch(`/api/roles/${savedRoleId}/match`, { method: 'POST' }).catch(() => {})
      }

      router.push('/roles')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save error')
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── LEFT ── */}
        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role title <span className="text-red-500">*</span></label>
                <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                  className={inputCls} placeholder="ex: Senior Java Developer" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client <span className="text-red-500">*</span></label>
                <select value={form.client_id} onChange={e => set('client_id', e.target.value)} className={inputCls} required>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hiring Manager</label>
                <input type="text" value={form.hiring_manager} onChange={e => set('hiring_manager', e.target.value)}
                  className={inputCls} placeholder="ex: John Smith" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seniority</label>
                  <select value={form.seniority} onChange={e => set('seniority', e.target.value)} className={inputCls}>
                    {SENIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Collaboration type</label>
                  <select value={form.collaboration_type} onChange={e => set('collaboration_type', e.target.value)} className={inputCls}>
                    {COLLAB_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                    placeholder="ex: London, Remote" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fieldglass ID</label>
                  <input type="text" value={form.fieldglass_id} onChange={e => set('fieldglass_id', e.target.value)}
                    placeholder="ex: RFTJP0001234" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submission deadline</label>
                  <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of positions</label>
                  <input type="number" min="1" step="1" value={form.positions_count}
                    onChange={e => set('positions_count', e.target.value)} placeholder="1" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role rate</label>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" min="0" step="0.01" value={form.rate}
                    onChange={e => set('rate', e.target.value)} placeholder="0.00"
                    className="glass-input col-span-1 px-3 py-2.5 rounded-lg text-sm w-full" />
                  <select value={form.rate_currency} onChange={e => set('rate_currency', e.target.value)} className={inputCls}>
                    {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={form.rate_type} onChange={e => set('rate_type', e.target.value)} className={inputCls}>
                    {RATE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Skills</h3>
              <button type="button" onClick={handleExtractSkills} disabled={extracting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#2AA3FF]/10 hover:bg-[#2AA3FF]/20 text-[#2AA3FF] border border-[#2AA3FF]/30 rounded-lg transition-colors disabled:opacity-60">
                {extracting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {extracting ? 'Analysing JD...' : 'Populate from JD (AI)'}
              </button>
            </div>
            {extractMsg && (
              <div className={cn('flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs mb-3',
                extractMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700')}>
                {extractMsg.text}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Required</label>
                <SkillSelector selected={requiredSkills} onChange={setRequiredSkills} placeholder="Search required skills..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Preferred (nice-to-have)</label>
                <SkillSelector selected={preferredSkills} onChange={setPreferredSkills} placeholder="Search preferred skills..." />
              </div>
            </div>
          </section>

          <div className="pt-4 border-t border-gray-200/60">
            <p className="text-xs text-gray-400 mb-3"><span className="text-red-500">*</span> Required fields</p>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 bg-[#2AA3FF] hover:bg-[#1a8fe0] disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {isEdit ? 'Save changes' : 'Create role'}
              </button>
              <button type="button" onClick={() => router.back()}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-white/40 rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: JD ── */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Full Job Description
            <span className="ml-2 text-gray-300 normal-case font-normal">(paste the text from Fieldglass)</span>
          </h3>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            className={cn(inputCls, 'min-h-[560px] resize-y font-mono text-xs leading-relaxed whitespace-pre-wrap')}
            placeholder="Paste the full JD text here: requirements, responsibilities, role context, Required Knowledge..."
          />
          <p className="text-xs text-gray-400 mt-2">The JD text will be used by AI for automatic scoring.</p>
        </div>
      </div>

      {/* Rubix Matrix */}
      <RubixMatrixPanel
        criteria={rubixCriteria}
        onChange={handleRubixChange}
        onRegenerate={handleGenerateRubix}
        generating={generatingRubix}
        saveStatus={rubixSaveStatus}
        saveError={rubixSaveError}
        roleId={roleId}
      />
    </form>
  )
}
