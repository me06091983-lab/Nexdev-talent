'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SkillSelector } from '@/components/ui/SkillSelector'
import { Upload, Loader2, CheckCircle, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Skill { id: string; name: string; category: string }
interface Profile { id: string; name: string }

interface Experience {
  id: string
  company: string
  role: string
  start_date: string
  end_date: string
  is_present: boolean
  location: string
  description: string
}

interface Certification {
  id: string
  name: string
  issuer: string
  date_obtained: string
}

interface Project {
  id: string
  name: string
  description: string
  technologies: string
  url: string
}

interface Achievement {
  id: string
  title: string
  description: string
}

interface CandidateFormProps {
  initial?: Record<string, unknown>
  candidateId?: string
}

const SENIORITY_OPTIONS = [
  { value: '', label: 'Selectează...' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
]

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'RON']

function newExp(): Experience {
  return { id: crypto.randomUUID(), company: '', role: '', start_date: '', end_date: '', is_present: false, location: '', description: '' }
}
function newCert(): Certification {
  return { id: crypto.randomUUID(), name: '', issuer: '', date_obtained: '' }
}
function newProject(): Project {
  return { id: crypto.randomUUID(), name: '', description: '', technologies: '', url: '' }
}
function newAchievement(): Achievement {
  return { id: crypto.randomUUID(), title: '', description: '' }
}

/* ── Reusable collapsible section header ── */
function SectionHeader({
  title, count, expanded, onToggle,
}: { title: string; count: number; expanded: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/20 transition-colors">
      <span className="text-sm font-semibold text-gray-700">
        {title}
        {count > 0 && (
          <span className="ml-2 text-xs text-gray-400 font-normal">
            {count} {count === 1 ? 'intrare' : 'intrări'}
          </span>
        )}
      </span>
      {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
    </button>
  )
}

/* ── Item card wrapper ── */
function ItemCard({ idx, onRemove, children }: { idx: number; onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="glass rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">#{idx + 1}</span>
        <button type="button" onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      {children}
    </div>
  )
}

/* ── Add button ── */
function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#2AA3FF] hover:text-[#2AA3FF] transition-colors">
      <Plus size={14} /> {label}
    </button>
  )
}

export function CandidateForm({ initial, candidateId }: CandidateFormProps) {
  const router = useRouter()
  const isEdit = !!candidateId

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>((initial?.skills as Skill[]) ?? [])
  const [experiences, setExperiences] = useState<Experience[]>((initial?.experiences as Experience[]) ?? [])
  const [certifications, setCertifications] = useState<Certification[]>((initial?.certifications as Certification[]) ?? [])
  const [projects, setProjects] = useState<Project[]>((initial?.projects as Project[]) ?? [])
  const [achievements, setAchievements] = useState<Achievement[]>((initial?.achievements as Achievement[]) ?? [])

  const [expExpanded, setExpExpanded] = useState(true)
  const [certExpanded, setCertExpanded] = useState(true)
  const [projExpanded, setProjExpanded] = useState(true)
  const [achExpanded, setAchExpanded] = useState(true)

  const [saving, setSaving] = useState(false)
  const [cvParsing, setCvParsing] = useState(false)
  const [cvParsed, setCvParsed] = useState(false)
  const [error, setError] = useState('')

  const [profileName, setProfileName] = useState(
    (initial as { profile?: { name?: string } } | undefined)?.profile?.name ?? ''
  )

  const [form, setForm] = useState({
    first_name: (initial?.first_name as string) ?? '',
    last_name: (initial?.last_name as string) ?? '',
    email: (initial?.email as string) ?? '',
    phone: (initial?.phone as string) ?? '',
    linkedin_url: (initial?.linkedin_url as string) ?? '',
    location: (initial?.location as string) ?? '',
    seniority: (initial?.seniority as string) ?? '',
    rate_min: (initial?.rate_min as string) ?? '',
    rate_wish: (initial?.rate_wish as string) ?? '',
    currency: (initial?.currency as string) ?? 'EUR',
    source_type: (initial?.source_type as string) ?? '',
    successful: (initial?.successful as boolean) ?? false,
    successful_client: (initial?.successful_client as string) ?? '',
    notes: (initial?.notes as string) ?? '',
    gdpr_consent: (initial?.gdpr_consent as boolean) ?? false,
  })

  useEffect(() => {
    fetch('/api/profiles').then(r => r.json()).then(setProfiles).catch(() => {})
  }, [])

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Generic update/remove helpers
  function makeUpdater<T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>) {
    return {
      update: (id: string, field: string, value: unknown) =>
        setter(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item)),
      remove: (id: string) =>
        setter(prev => prev.filter(item => item.id !== id)),
    }
  }

  const expOps = makeUpdater<Experience>(setExperiences)
  const certOps = makeUpdater<Certification>(setCertifications)
  const projOps = makeUpdater<Project>(setProjects)
  const achOps = makeUpdater<Achievement>(setAchievements)

  async function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCvParsing(true)
    setCvParsed(false)
    setError('')
    try {
      const fd = new FormData()
      fd.append('cv', file)
      const res = await fetch('/api/cv-parse', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.first_name) set('first_name', data.first_name)
      if (data.last_name) set('last_name', data.last_name)
      if (data.email) set('email', data.email)
      if (data.phone) set('phone', data.phone)
      if (data.linkedin_url) set('linkedin_url', data.linkedin_url)
      if (data.location) set('location', data.location)
      if (data.seniority) set('seniority', data.seniority)

      if (data.matched_skills?.length) {
        setSelectedSkills(prev => {
          const existing = new Set(prev.map((s: Skill) => s.id))
          return [...prev, ...data.matched_skills.filter((s: Skill) => !existing.has(s.id))]
        })
      }
      if (data.experiences?.length) { setExperiences(data.experiences); setExpExpanded(true) }
      if (data.certifications?.length) { setCertifications(data.certifications); setCertExpanded(true) }
      if (data.projects?.length) { setProjects(data.projects); setProjExpanded(true) }
      if (data.achievements?.length) { setAchievements(data.achievements); setAchExpanded(true) }

      setCvParsed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la parsarea CV-ului')
    } finally {
      setCvParsing(false)
    }
  }

  async function resolveProfileId(): Promise<string | null> {
    if (!profileName.trim()) return null
    const existing = profiles.find(p => p.name.toLowerCase() === profileName.trim().toLowerCase())
    if (existing) return existing.id
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profileName.trim() }),
    })
    if (!res.ok) return null
    const created: Profile = await res.json()
    setProfiles(prev => [...prev, created])
    return created.id
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.last_name) {
      setError('Prenumele și numele sunt obligatorii')
      return
    }
    setSaving(true)
    setError('')
    try {
      const profile_id = await resolveProfileId()
      const payload = {
        ...form,
        profile_id,
        rate_min: form.rate_min ? parseFloat(form.rate_min) : null,
        rate_wish: form.rate_wish ? parseFloat(form.rate_wish) : null,
        source_type: form.source_type || null,
        experiences,
        certifications,
        projects,
        achievements,
        skill_ids: selectedSkills.map(s => s.id),
      }

      const url = isEdit ? `/api/candidates/${candidateId}` : '/api/candidates'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/candidates')
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

      {/* Upload CV */}
      <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/60 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">Încarcă CV pentru precompletare automată (AI)</p>
            <p className="text-xs text-blue-700 mt-0.5">PDF sau DOCX — extrage date, skilluri, experiență, proiecte, certificări și realizări</p>
          </div>
          <div className="flex items-center gap-3">
            {cvParsed && (
              <span className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
                <CheckCircle size={16} /> CV parsat
              </span>
            )}
            <label className={cn(
              'inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0',
              cvParsing ? 'bg-blue-200 text-blue-500 cursor-not-allowed' : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-100'
            )}>
              {cvParsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {cvParsing ? 'Se procesează...' : 'Alege fișier CV'}
              <input type="file" accept=".pdf,.docx,.doc" onChange={handleCvUpload} disabled={cvParsing} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-8">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-8">

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Date personale</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prenume *</label>
                <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nume *</label>
                <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Locație</label>
                <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="București, România" className={inputCls} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Profil profesional</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categorie / Profil <span className="text-xs text-gray-400 font-normal">(selectează sau scrie)</span>
                </label>
                <input type="text" list="profiles-list" value={profileName} onChange={e => setProfileName(e.target.value)}
                  placeholder="ex: DevOps Engineer" className={inputCls} />
                <datalist id="profiles-list">
                  {profiles.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senioritate</label>
                <select value={form.seniority} onChange={e => set('seniority', e.target.value)} className={inputCls}>
                  {SENIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skilluri</label>
              <SkillSelector selected={selectedSkills} onChange={setSelectedSkills} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rate & Sursă</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate minim</label>
                <div className="flex gap-1.5">
                  <input type="number" min="0" step="0.01" value={form.rate_min} onChange={e => set('rate_min', e.target.value)}
                    placeholder="0" className="glass-input flex-1 min-w-0 px-3 py-2.5 rounded-lg text-sm" />
                  <select value={form.currency} onChange={e => set('currency', e.target.value)}
                    className="glass-input w-[68px] px-2 py-2.5 rounded-lg text-sm">
                    {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate dorit</label>
                <input type="number" min="0" step="0.01" value={form.rate_wish} onChange={e => set('rate_wish', e.target.value)}
                  placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sursă <span className="text-xs text-gray-400 font-normal">(text liber)</span>
                </label>
                <input type="text" value={form.source_type} onChange={e => set('source_type', e.target.value)}
                  placeholder="ex: LinkedIn, Partener X..." className={inputCls} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status & Note</h3>
            <div className="flex items-center gap-3 mb-3">
              <input type="checkbox" id="successful" checked={form.successful} onChange={e => set('successful', e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="successful" className="text-sm text-gray-700">Candidat de succes (a fost plasat)</label>
            </div>
            {form.successful && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Client la care a lucrat</label>
                <input type="text" value={form.successful_client} onChange={e => set('successful_client', e.target.value)} className={cn(inputCls, 'max-w-sm')} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notițe interne</label>
              <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} className={cn(inputCls, 'resize-none')} />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <input type="checkbox" id="gdpr" checked={form.gdpr_consent} onChange={e => set('gdpr_consent', e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="gdpr" className="text-sm text-gray-700">Candidatul și-a dat consimțământul GDPR</label>
            </div>
          </section>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200/60">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 bg-[#2AA3FF] hover:bg-[#1a8fe0] disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'Salvează modificările' : 'Adaugă candidat'}
            </button>
            <button type="button" onClick={() => router.back()}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-white/40 rounded-xl transition-colors">
              Anulează
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-3">

          {/* Experiență profesională */}
          <div className="glass rounded-xl overflow-hidden">
            <SectionHeader title="Experiență profesională" count={experiences.length} expanded={expExpanded} onToggle={() => setExpExpanded(v => !v)} />
            {expExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {experiences.map((item, idx) => (
                  <ItemCard key={item.id} idx={idx} onRemove={() => expOps.remove(item.id)}>
                    <input type="text" value={item.company} onChange={e => expOps.update(item.id, 'company', e.target.value)}
                      placeholder="Companie *" className={inputCls} />
                    <input type="text" value={item.role} onChange={e => expOps.update(item.id, 'role', e.target.value)}
                      placeholder="Titlu poziție" className={inputCls} />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Start</label>
                        <input type="month" value={item.start_date} onChange={e => expOps.update(item.id, 'start_date', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">End</label>
                        <input type="month" value={item.end_date} onChange={e => expOps.update(item.id, 'end_date', e.target.value)}
                          disabled={item.is_present} className={cn(inputCls, item.is_present && 'opacity-40 cursor-not-allowed')} />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input type="checkbox" checked={item.is_present} onChange={e => expOps.update(item.id, 'is_present', e.target.checked)} className="w-3.5 h-3.5" />
                      Prezent
                    </label>
                    <input type="text" value={item.location} onChange={e => expOps.update(item.id, 'location', e.target.value)}
                      placeholder="Locație (opțional)" className={inputCls} />
                    <textarea rows={4} value={item.description} onChange={e => expOps.update(item.id, 'description', e.target.value)}
                      placeholder="Descriere completă rol, responsabilități, realizări..." className={cn(inputCls, 'resize-y whitespace-pre-wrap')} />
                  </ItemCard>
                ))}
                <AddButton label="Adaugă experiență" onClick={() => setExperiences(prev => [...prev, newExp()])} />
              </div>
            )}
          </div>

          {/* Proiecte */}
          <div className="glass rounded-xl overflow-hidden">
            <SectionHeader title="Proiecte" count={projects.length} expanded={projExpanded} onToggle={() => setProjExpanded(v => !v)} />
            {projExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {projects.map((item, idx) => (
                  <ItemCard key={item.id} idx={idx} onRemove={() => projOps.remove(item.id)}>
                    <input type="text" value={item.name} onChange={e => projOps.update(item.id, 'name', e.target.value)}
                      placeholder="Nume proiect *" className={inputCls} />
                    <textarea rows={3} value={item.description} onChange={e => projOps.update(item.id, 'description', e.target.value)}
                      placeholder="Descriere completă proiect..." className={cn(inputCls, 'resize-y whitespace-pre-wrap')} />
                    <input type="text" value={item.technologies} onChange={e => projOps.update(item.id, 'technologies', e.target.value)}
                      placeholder="Tehnologii folosite" className={inputCls} />
                    <input type="url" value={item.url} onChange={e => projOps.update(item.id, 'url', e.target.value)}
                      placeholder="URL proiect (opțional)" className={inputCls} />
                  </ItemCard>
                ))}
                <AddButton label="Adaugă proiect" onClick={() => setProjects(prev => [...prev, newProject()])} />
              </div>
            )}
          </div>

          {/* Certificări */}
          <div className="glass rounded-xl overflow-hidden">
            <SectionHeader title="Certificări / Traininguri" count={certifications.length} expanded={certExpanded} onToggle={() => setCertExpanded(v => !v)} />
            {certExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {certifications.map((item, idx) => (
                  <ItemCard key={item.id} idx={idx} onRemove={() => certOps.remove(item.id)}>
                    <input type="text" value={item.name} onChange={e => certOps.update(item.id, 'name', e.target.value)}
                      placeholder="Nume certificare *" className={inputCls} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={item.issuer} onChange={e => certOps.update(item.id, 'issuer', e.target.value)}
                        placeholder="Emitent" className={inputCls} />
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Data obținerii</label>
                        <input type="month" value={item.date_obtained} onChange={e => certOps.update(item.id, 'date_obtained', e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  </ItemCard>
                ))}
                <AddButton label="Adaugă certificare" onClick={() => setCertifications(prev => [...prev, newCert()])} />
              </div>
            )}
          </div>

          {/* Realizări */}
          <div className="glass rounded-xl overflow-hidden">
            <SectionHeader title="Realizări / Achievements" count={achievements.length} expanded={achExpanded} onToggle={() => setAchExpanded(v => !v)} />
            {achExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {achievements.map((item, idx) => (
                  <ItemCard key={item.id} idx={idx} onRemove={() => achOps.remove(item.id)}>
                    <input type="text" value={item.title} onChange={e => achOps.update(item.id, 'title', e.target.value)}
                      placeholder="Titlu realizare / premiu *" className={inputCls} />
                    <textarea rows={2} value={item.description} onChange={e => achOps.update(item.id, 'description', e.target.value)}
                      placeholder="Descriere..." className={cn(inputCls, 'resize-y whitespace-pre-wrap')} />
                  </ItemCard>
                ))}
                <AddButton label="Adaugă realizare" onClick={() => setAchievements(prev => [...prev, newAchievement()])} />
              </div>
            )}
          </div>

        </div>
      </div>
    </form>
  )
}
