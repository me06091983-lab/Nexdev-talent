'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SkillSelector } from '@/components/ui/SkillSelector'
import { Upload, Loader2, CheckCircle, ChevronDown, ChevronUp, Plus, Trash2, Sparkles, FileText, X, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CandidateCVModal } from '@/components/candidates/CandidateCVModal'

interface Skill { id: string; name: string; category: string }
interface Profile { id: string; name: string }
interface Partner { id: string; first_name?: string; last_name: string; name?: string }

const RON_RATES: Record<string, number> = { EUR: 5.0, USD: 4.55, GBP: 5.95 }

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

export interface ParsedCvData {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  linkedin_url?: string
  location?: string
  seniority?: string
  matched_skills?: Skill[]
  experiences?: Experience[]
  certifications?: Certification[]
  projects?: Project[]
  achievements?: Achievement[]
}

interface CandidateFormProps {
  initial?: Record<string, unknown>
  candidateId?: string
  onSavingChange?: (saving: boolean) => void
  /** When provided, CV is managed externally — hides internal CV upload section */
  cvFilePath?: string
  /** When provided (non-null), populates form fields with parsed CV data */
  parsedCvData?: ParsedCvData | null
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

/* ── Collapsible item card ── */
function ItemCard({
  onRemove,
  summary,
  defaultExpanded = false,
  children,
}: {
  onRemove: () => void
  summary: React.ReactNode
  defaultExpanded?: boolean
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div className="glass rounded-xl overflow-hidden border border-white/40">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {expanded
            ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />
            : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
          }
          <span className="flex-1 min-w-0">{summary}</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-0.5"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-white/30 space-y-2">
          {children}
        </div>
      )}
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

export function CandidateForm({ initial, candidateId, onSavingChange, cvFilePath: cvFilePathProp, parsedCvData }: CandidateFormProps) {
  const router = useRouter()
  const isEdit = !!candidateId
  const isCvManagedExternally = cvFilePathProp !== undefined

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
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
  const [duplicateWarning, setDuplicateWarning] = useState<{ name: string; id: string } | null>(null)
  const [error, setError] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  // Internal CV state — used only in new candidate flow (!isCvManagedExternally)
  const [showCvPreview, setShowCvPreview] = useState(false)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [localCvFilePath, setLocalCvFilePath] = useState<string>((initial?.cv_file_path as string) ?? '')
  const [cvFileName, setCvFileName] = useState<string>('')
  const [cvUploading, setCvUploading] = useState(false)
  const [cvParsing, setCvParsing] = useState(false)
  const [cvParsed, setCvParsed] = useState(false)

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
    rate_unit: (initial?.rate_unit as string) ?? 'zi',
    partner_id: (initial?.partner_id as string) ?? '',
    source_type: (initial?.source_type as string) ?? '',
    candidate_status: (initial?.candidate_status as string) ?? (initial ? 'pasiv' : 'activ'),
    successful: (initial?.successful as boolean) ?? false,
    successful_client: (initial?.successful_client as string) ?? '',
    gdpr_consent: (initial?.gdpr_consent as boolean) ?? false,
    company_name: (initial?.company_name as string) ?? '',
    company_cui: (initial?.company_cui as string) ?? '',
    company_tva: (initial?.company_tva as boolean) ?? false,
    company_bank_account: (initial?.company_bank_account as string) ?? '',
  })

  useEffect(() => {
    fetch('/api/profiles').then(r => r.json()).then(setProfiles).catch(() => {})
    fetch('/api/partners').then(r => r.json()).then(setPartners).catch(() => {})
  }, [])

  // Apply externally parsed CV data to form fields
  useEffect(() => {
    if (!parsedCvData) return
    if (parsedCvData.first_name) set('first_name', parsedCvData.first_name)
    if (parsedCvData.last_name) set('last_name', parsedCvData.last_name)
    if (parsedCvData.email) set('email', parsedCvData.email)
    if (parsedCvData.phone) set('phone', parsedCvData.phone)
    if (parsedCvData.linkedin_url) set('linkedin_url', parsedCvData.linkedin_url)
    if (parsedCvData.location) set('location', parsedCvData.location)
    if (parsedCvData.seniority) set('seniority', parsedCvData.seniority)
    if (parsedCvData.matched_skills?.length) {
      setSelectedSkills(prev => {
        const existing = new Set(prev.map((s: Skill) => s.id))
        return [...prev, ...parsedCvData.matched_skills!.filter((s: Skill) => !existing.has(s.id))]
      })
    }
    if (parsedCvData.experiences?.length) { setExperiences(parsedCvData.experiences!); setExpExpanded(true) }
    if (parsedCvData.certifications?.length) { setCertifications(parsedCvData.certifications!); setCertExpanded(true) }
    if (parsedCvData.projects?.length) { setProjects(parsedCvData.projects!); setProjExpanded(true) }
    if (parsedCvData.achievements?.length) { setAchievements(parsedCvData.achievements!); setAchExpanded(true) }
  }, [parsedCvData])

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  async function handleEmailBlur() {
    if (isEdit || !form.email) return
    try {
      const res = await fetch(`/api/candidates?q=${encodeURIComponent(form.email)}`)
      const data = await res.json()
      const match = (data as { id: string; first_name: string; last_name: string; email: string }[])
        .find(c => c.email?.toLowerCase() === form.email.toLowerCase())
      setDuplicateWarning(match ? { name: `${match.first_name} ${match.last_name}`, id: match.id } : null)
    } catch { /* ignore */ }
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

  // Internal CV handlers — used only in new candidate flow
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCvFile(file)
    setCvFileName(file.name)
    setCvParsed(false)
    setError('')
    setCvUploading(true)
    try {
      const fd = new FormData()
      fd.append('cv', file)
      const res = await fetch('/api/cv-upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocalCvFilePath(data.path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea fișierului')
      setCvFile(null)
      setCvFileName('')
    } finally {
      setCvUploading(false)
    }
  }

  function handleClearCv() {
    setCvFile(null)
    setCvFileName('')
    setLocalCvFilePath('')
    setCvParsed(false)
  }

  async function handleCvParse() {
    if (!cvFile && !localCvFilePath) return
    setCvParsing(true)
    setCvParsed(false)
    setError('')
    try {
      let res: Response
      if (cvFile) {
        const fd = new FormData()
        fd.append('cv', cvFile)
        res = await fetch('/api/cv-parse', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/cv-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: localCvFilePath }),
        })
      }
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
    onSavingChange?.(true)
    setError('')
    setDuplicateWarning(null)
    try {
      const profile_id = await resolveProfileId()
      const effectiveCvFilePath = isCvManagedExternally ? (cvFilePathProp ?? '') : localCvFilePath

      // Destructure fields that need special handling to avoid auto-spreading issues
      const { rate_min: _rm, rate_wish: _rw, seniority: _sen, partner_id: _pid, rate_unit: _ru, source_type: _st, ...restForm } = form

      const payload = {
        ...restForm,
        profile_id,
        seniority: form.seniority || null,
        rate_min: form.rate_min ? parseFloat(form.rate_min) : null,
        rate_wish: form.rate_wish ? parseFloat(form.rate_wish) : null,
        rate_unit: form.rate_unit || 'zi',
        partner_id: form.partner_id || null,
        source_type: form.partner_id ? 'partner' : '',
        experiences,
        certifications,
        projects,
        achievements,
        skill_ids: selectedSkills.map(s => s.id),
        ...(effectiveCvFilePath ? { cv_file_path: effectiveCvFilePath } : {}),
      }

      const url = isEdit ? `/api/candidates/${candidateId}` : '/api/candidates'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setIsDirty(false)
      router.push('/candidates')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare')
    } finally {
      setSaving(false)
      onSavingChange?.(false)
    }
  }

  const inputCls = 'glass-input w-full px-3 py-2.5 rounded-lg text-sm'

  return (
    <form id="candidate-form" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {/* CV upload — shown only in new candidate flow (not managed externally) */}
      {!isCvManagedExternally && (
        <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/60 rounded-xl p-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">CV candidat</p>
              {(cvFileName || localCvFilePath) ? (
                <div className="flex items-center gap-2 mt-1">
                  <FileText size={14} className="text-blue-600 flex-shrink-0" />
                  <span className="text-xs text-blue-700 truncate">
                    {cvFileName || localCvFilePath.split('/').pop()}
                  </span>
                  {cvUploading && <Loader2 size={12} className="animate-spin text-blue-500 flex-shrink-0" />}
                  {!cvUploading && localCvFilePath && <CheckCircle size={12} className="text-green-600 flex-shrink-0" />}
                  {!cvUploading && (
                    <button type="button" onClick={handleClearCv}
                      className="ml-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-blue-700 mt-0.5">PDF sau DOCX — acceptat pentru upload și parsare AI</p>
              )}
              {cvParsed && (
                <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium mt-1">
                  <CheckCircle size={12} /> Câmpurile au fost completate din CV
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {(localCvFilePath || cvFile) && !cvUploading && (
                <button
                  type="button"
                  onClick={handleCvParse}
                  disabled={cvParsing}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    cvParsing
                      ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  )}
                >
                  {cvParsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {cvParsing ? 'Se parsează...' : 'Populează automat'}
                </button>
              )}
              {isEdit && localCvFilePath && !cvUploading && (
                <button
                  type="button"
                  onClick={() => setShowCvPreview(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:border-[#2AA3FF] hover:text-[#2AA3FF] transition-colors flex-shrink-0"
                >
                  <Eye size={14} /> Vizualizează
                </button>
              )}
              <label className={cn(
                'inline-flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0',
                cvUploading ? 'bg-blue-200 text-blue-500 cursor-not-allowed' : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-100'
              )}>
                {cvUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {cvUploading ? 'Se încarcă...' : (localCvFilePath ? 'Înlocuiește' : 'Alege fișier')}
                <input type="file" accept=".pdf,.docx,.doc" onChange={handleFileSelect} disabled={cvUploading || cvParsing} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-8">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-8">

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Date personale</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prenume <span className="text-red-500">*</span></label>
                <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nume <span className="text-red-500">*</span></label>
                <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => { set('email', e.target.value); setDuplicateWarning(null) }} onBlur={handleEmailBlur} className={inputCls} />
                {duplicateWarning && (
                  <div className="mt-1.5 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-xs">
                    <span>⚠️ Există deja un candidat cu acest email:</span>
                    <a href={`/candidates/${duplicateWarning.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-amber-900">
                      {duplicateWarning.name}
                    </a>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                <input type="text" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Locație</label>
                <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="București, România" className={inputCls} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Profil profesional</h3>

            {/* Status candidat */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status candidat</label>
              <div className="flex gap-2">
                {([
                  { value: 'activ',     label: 'Activ',      cls: 'border-green-300 bg-green-50 text-green-700 ring-green-300' },
                  { value: 'pasiv',     label: 'Pasiv',      cls: 'border-gray-300 bg-gray-50 text-gray-600 ring-gray-300' },
                  { value: 'angajat',   label: 'Angajat',    cls: 'border-blue-300 bg-blue-50 text-blue-700 ring-blue-300' },
                  { value: 'blacklist', label: 'Black List', cls: 'border-red-400 bg-red-50 text-red-700 ring-red-300' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      set('candidate_status', opt.value)
                      if (opt.value === 'angajat') set('successful', true)
                    }}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-sm font-medium border transition-all',
                      form.candidate_status === opt.value
                        ? `${opt.cls} ring-2`
                        : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {form.candidate_status === 'activ'     && 'Contactat activ, implicat într-un proces de recrutare.'}
                {form.candidate_status === 'pasiv'     && 'În baza de date, fără proces activ de recrutare.'}
                {form.candidate_status === 'angajat'   && 'Plasat cu succes, ofertă acceptată.'}
                {form.candidate_status === 'blacklist' && 'Candidat blocat — nu apare în pipeline sau AI matching.'}
              </p>
            </div>

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

            {/* Rate inputs */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate minim</label>
                <input type="number" min="0" step="0.01" value={form.rate_min} onChange={e => set('rate_min', e.target.value)}
                  placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate dorit</label>
                <input type="number" min="0" step="0.01" value={form.rate_wish} onChange={e => set('rate_wish', e.target.value)}
                  placeholder="0" className={inputCls} />
              </div>
            </div>

            {/* Currency + Per unit */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monedă</label>
                <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
                  {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Per</label>
                <div className="flex gap-2">
                  {(['zi', 'ora'] as const).map(unit => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => set('rate_unit', unit)}
                      className={cn(
                        'flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all',
                        form.rate_unit === unit
                          ? 'bg-[#0B1A33] text-white border-[#0B1A33]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      )}
                    >
                      {unit === 'zi' ? 'Zi' : 'Oră'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RON equivalent — shown only when currency is not RON and a rate is entered */}
            {form.currency !== 'RON' && (form.rate_min || form.rate_wish) && RON_RATES[form.currency] && (
              <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200/70 rounded-lg text-xs text-amber-800">
                <span className="font-medium">Echivalent indicativ RON:</span>
                {form.rate_min && (
                  <span className="ml-2">
                    minim ~{Math.round(parseFloat(form.rate_min) * RON_RATES[form.currency]).toLocaleString('ro-RO')} RON/{form.rate_unit}
                  </span>
                )}
                {form.rate_min && form.rate_wish && <span className="mx-1 text-amber-500">·</span>}
                {form.rate_wish && (
                  <span>
                    dorit ~{Math.round(parseFloat(form.rate_wish) * RON_RATES[form.currency]).toLocaleString('ro-RO')} RON/{form.rate_unit}
                  </span>
                )}
                <span className="ml-2 text-amber-600/70">(curs aproximativ)</span>
              </div>
            )}

            {/* Source — partner dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sursă / Partener</label>
              <select
                value={form.partner_id}
                onChange={e => set('partner_id', e.target.value)}
                className={inputCls}
              >
                <option value="">— Sursă proprie / LinkedIn —</option>
                {partners.map(p => {
                  const label = p.name
                    ? p.name
                    : [p.first_name, p.last_name].filter(Boolean).join(' ')
                  return <option key={p.id} value={p.id}>{label}</option>
                })}
              </select>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Date companie</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nume companie</label>
                <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Ex: Ion Popescu SRL" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CUI</label>
                  <input value={form.company_cui} onChange={e => set('company_cui', e.target.value)} placeholder="RO12345678" className={inputCls} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" id="company_tva" checked={form.company_tva} onChange={e => set('company_tva', e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
                  <label htmlFor="company_tva" className="text-sm text-gray-700">Plătitor TVA</label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cont bancar (IBAN)</label>
                <input value={form.company_bank_account} onChange={e => set('company_bank_account', e.target.value)} placeholder="RO49AAAA1B31007593840000" className={cn(inputCls, 'font-mono text-xs')} />
              </div>
            </div>
          </section>

          <div className="pt-4 border-t border-gray-200/60">
            <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Câmpuri obligatorii</p>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-3">

          {/* Experiență profesională */}
          <div className="glass rounded-xl overflow-hidden">
            <SectionHeader title="Experiență profesională" count={experiences.length} expanded={expExpanded} onToggle={() => setExpExpanded(v => !v)} />
            {expExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {experiences.map((item) => {
                  const period = (() => {
                    const fmt = (d: string) => { const [y, m] = d.split('-'); return m ? `${m}/${y}` : y }
                    const s = item.start_date ? fmt(item.start_date) : null
                    const e = item.is_present ? 'prezent' : (item.end_date ? fmt(item.end_date) : null)
                    if (!s && !e) return null
                    return `${s ?? '?'} – ${e ?? '?'}`
                  })()
                  return (
                    <ItemCard
                      key={item.id}
                      onRemove={() => expOps.remove(item.id)}
                      defaultExpanded={!item.company && !item.role}
                      summary={
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {item.role || <span className="text-gray-400 italic">Poziție necompletată</span>}
                            {item.company ? <span className="text-gray-400 font-normal"> @ {item.company}</span> : null}
                          </div>
                          {period && <div className="text-xs text-gray-400">{period}</div>}
                        </div>
                      }
                    >
                      <input type="text" value={item.company ?? ''} onChange={e => expOps.update(item.id, 'company', e.target.value)}
                        placeholder="Companie *" className={inputCls} />
                      <input type="text" value={item.role ?? ''} onChange={e => expOps.update(item.id, 'role', e.target.value)}
                        placeholder="Titlu poziție" className={inputCls} />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Start</label>
                          <input type="month" value={item.start_date ?? ''} onChange={e => expOps.update(item.id, 'start_date', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">End</label>
                          <input type="month" value={item.end_date ?? ''} onChange={e => expOps.update(item.id, 'end_date', e.target.value)}
                            disabled={item.is_present} className={cn(inputCls, item.is_present && 'opacity-40 cursor-not-allowed')} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input type="checkbox" checked={item.is_present} onChange={e => expOps.update(item.id, 'is_present', e.target.checked)} className="w-3.5 h-3.5" />
                        Prezent
                      </label>
                      <input type="text" value={item.location ?? ''} onChange={e => expOps.update(item.id, 'location', e.target.value)}
                        placeholder="Locație (opțional)" className={inputCls} />
                      <textarea rows={4} value={item.description ?? ''} onChange={e => expOps.update(item.id, 'description', e.target.value)}
                        placeholder="Descriere completă rol, responsabilități, realizări..." className={cn(inputCls, 'resize-y whitespace-pre-wrap')} />
                    </ItemCard>
                  )
                })}
                <AddButton label="Adaugă experiență" onClick={() => setExperiences(prev => [...prev, newExp()])} />
              </div>
            )}
          </div>

          {/* Proiecte */}
          <div className="glass rounded-xl overflow-hidden">
            <SectionHeader title="Proiecte" count={projects.length} expanded={projExpanded} onToggle={() => setProjExpanded(v => !v)} />
            {projExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {projects.map((item) => (
                  <ItemCard
                    key={item.id}
                    onRemove={() => projOps.remove(item.id)}
                    defaultExpanded={!item.name}
                    summary={
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {item.name || <span className="text-gray-400 italic">Proiect necompletat</span>}
                        </div>
                        {item.technologies && (
                          <div className="text-xs text-gray-400 truncate">{item.technologies}</div>
                        )}
                      </div>
                    }
                  >
                    <input type="text" value={item.name ?? ''} onChange={e => projOps.update(item.id, 'name', e.target.value)}
                      placeholder="Nume proiect *" className={inputCls} />
                    <textarea rows={3} value={item.description ?? ''} onChange={e => projOps.update(item.id, 'description', e.target.value)}
                      placeholder="Descriere completă proiect..." className={cn(inputCls, 'resize-y whitespace-pre-wrap')} />
                    <input type="text" value={item.technologies ?? ''} onChange={e => projOps.update(item.id, 'technologies', e.target.value)}
                      placeholder="Tehnologii folosite" className={inputCls} />
                    <input type="url" value={item.url ?? ''} onChange={e => projOps.update(item.id, 'url', e.target.value)}
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
                {certifications.map((item) => (
                  <ItemCard
                    key={item.id}
                    onRemove={() => certOps.remove(item.id)}
                    defaultExpanded={!item.name}
                    summary={
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {item.name || <span className="text-gray-400 italic">Certificare necompletată</span>}
                        </div>
                        {(item.issuer || item.date_obtained) && (
                          <div className="text-xs text-gray-400">
                            {item.issuer}{item.issuer && item.date_obtained ? ' · ' : ''}{item.date_obtained}
                          </div>
                        )}
                      </div>
                    }
                  >
                    <input type="text" value={item.name ?? ''} onChange={e => certOps.update(item.id, 'name', e.target.value)}
                      placeholder="Nume certificare *" className={inputCls} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={item.issuer ?? ''} onChange={e => certOps.update(item.id, 'issuer', e.target.value)}
                        placeholder="Emitent" className={inputCls} />
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Data obținerii</label>
                        <input type="month" value={item.date_obtained ?? ''} onChange={e => certOps.update(item.id, 'date_obtained', e.target.value)} className={inputCls} />
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
                {achievements.map((item) => (
                  <ItemCard
                    key={item.id}
                    onRemove={() => achOps.remove(item.id)}
                    defaultExpanded={!item.title}
                    summary={
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {item.title || <span className="text-gray-400 italic">Realizare necompletată</span>}
                      </div>
                    }
                  >
                    <input type="text" value={item.title ?? ''} onChange={e => achOps.update(item.id, 'title', e.target.value)}
                      placeholder="Titlu realizare / premiu *" className={inputCls} />
                    <textarea rows={2} value={item.description ?? ''} onChange={e => achOps.update(item.id, 'description', e.target.value)}
                      placeholder="Descriere..." className={cn(inputCls, 'resize-y whitespace-pre-wrap')} />
                  </ItemCard>
                ))}
                <AddButton label="Adaugă realizare" onClick={() => setAchievements(prev => [...prev, newAchievement()])} />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* CV preview modal — new candidate flow only */}
      {showCvPreview && isEdit && candidateId && (
        <CandidateCVModal
          candidateId={candidateId}
          candidateName={`${form.first_name} ${form.last_name}`.trim()}
          onClose={() => setShowCvPreview(false)}
        />
      )}
    </form>
  )
}
