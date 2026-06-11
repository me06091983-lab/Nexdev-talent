'use client'

import { useState, useEffect } from 'react'
import {
  X, Mail, Phone, MapPin, Link2, Star, ChevronDown, ChevronRight,
  Loader2, ExternalLink, FileText, Building2, History, User,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface Skill { id: string; name: string; category: string }
interface Experience {
  id: string; company: string; role: string
  start_date: string | null; end_date: string | null; is_present: boolean
  location: string | null; description: string | null
}
interface Certification {
  id: string; name: string; issuer: string | null; date_obtained: string | null
}
interface Project {
  id: string; name: string; description: string | null; technologies: string | null; url: string | null
}
interface Achievement { id: string; title: string; description: string | null }

interface CandidateFull {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  location: string | null
  seniority: string | null
  rate_min: number | null
  rate_wish: number | null
  currency: string
  source_type: string | null
  candidate_status: string | null
  successful: boolean
  successful_client: string | null
  notes: string | null
  company_name: string | null
  company_cui: string | null
  company_tva: boolean
  company_bank_account: string | null
  profile: { id: string; name: string } | null
  skills: Skill[]
  experiences: Experience[]
  certifications: Certification[]
  projects: Project[]
  achievements: Achievement[]
}

interface HistoryEntry {
  id: string
  status: string
  feedback: string | null
  created_at: string
  updated_at: string
  role: { id: string; title: string; status: string; client: { name: string } | null } | null
}

const SENIORITY_LABELS: Record<string, string> = {
  junior: 'Junior', mid: 'Mid', senior: 'Senior', lead: 'Lead', principal: 'Principal',
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pipeline: { label: 'Pipeline', cls: 'bg-gray-100 text-gray-600' },
  submitted: { label: 'Trimis', cls: 'bg-blue-50 text-blue-700' },
  shortlisted: { label: 'Shortlist', cls: 'bg-indigo-50 text-indigo-700' },
  interview: { label: 'Interviu', cls: 'bg-purple-50 text-purple-700' },
  offer: { label: 'Ofertă', cls: 'bg-green-50 text-green-700' },
  rejected: { label: 'Respins', cls: 'bg-red-50 text-red-600' },
}

function formatPeriod(start: string | null, end: string | null, isPresent: boolean) {
  const fmt = (d: string) => { const [y, m] = d.split('-'); return m ? `${m}/${y}` : y }
  return `${start ? fmt(start) : '?'} – ${isPresent ? 'prezent' : (end ? fmt(end) : '?')}`
}

function CollapsibleRow({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors">
        {open ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
        <span className="flex-1 min-w-0">{summary}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-50 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
          {children}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{title}</h3>
      {children}
    </div>
  )
}

// ─── CV Preview panel ────────────────────────────────────────────────────────

function CvPanel({ candidateId }: { candidateId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/candidates/${candidateId}/cv`)
      .then(r => r.json())
      .then(data => { if (data.error) throw new Error(data.error); setUrl(data.url) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [candidateId])

  const isPdf = url ? !url.toLowerCase().includes('.doc') : false

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
      <Loader2 size={24} className="animate-spin" />
      <p className="text-sm">Se încarcă CV-ul...</p>
    </div>
  )

  if (error || !url) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <FileText size={48} className="text-gray-200 mb-3" />
      <p className="text-sm text-gray-500">{error || 'CV indisponibil'}</p>
    </div>
  )

  if (isPdf) return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <span className="text-xs text-gray-500 font-medium">CV Preview</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#2AA3FF] hover:underline">
          Deschide <ExternalLink size={10} />
        </a>
      </div>
      <iframe src={url} className="flex-1 w-full" title="CV Preview" />
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <FileText size={48} className="text-gray-300" />
      <p className="text-sm text-gray-600">Fișier DOCX — nu poate fi previzualizat.</p>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-[#0B1A33] text-white text-sm rounded-xl hover:bg-[#0B1A33]/90 transition-colors">
        <ExternalLink size={14} /> Descarcă CV
      </a>
    </div>
  )
}

// ─── Tab: Profil ─────────────────────────────────────────────────────────────

function ProfileTab({ candidate }: { candidate: CandidateFull }) {
  return (
    <div className="space-y-5">
      <Section title="Contact">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {candidate.email && (
            <a href={`mailto:${candidate.email}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#2AA3FF]">
              <Mail size={13} /> {candidate.email}
            </a>
          )}
          {candidate.phone && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600"><Phone size={13} /> {candidate.phone}</span>
          )}
          {candidate.location && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600"><MapPin size={13} /> {candidate.location}</span>
          )}
          {candidate.linkedin_url && (
            <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[#2AA3FF] hover:underline">
              <Link2 size={13} /> LinkedIn <ExternalLink size={11} />
            </a>
          )}
        </div>
      </Section>

      {(candidate.rate_min || candidate.rate_wish) && (
        <Section title="Rate">
          <div className="flex gap-4 text-sm">
            {candidate.rate_min && <span className="text-gray-600">Minim: <strong>{candidate.rate_min} {candidate.currency}</strong></span>}
            {candidate.rate_wish && <span className="text-gray-600">Dorit: <strong>{candidate.rate_wish} {candidate.currency}</strong></span>}
            {candidate.source_type && <span className="text-gray-400">Sursă: {candidate.source_type}</span>}
          </div>
        </Section>
      )}

      {candidate.skills.length > 0 && (
        <Section title={`Skilluri (${candidate.skills.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills.map(s => <Badge key={s.id} variant="blue">{s.name}</Badge>)}
          </div>
        </Section>
      )}

      {candidate.experiences?.length > 0 && (
        <Section title={`Experiență (${candidate.experiences.length})`}>
          <div className="space-y-1.5">
            {candidate.experiences.map(exp => (
              <CollapsibleRow key={exp.id}
                summary={
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-800 block truncate">
                      {exp.role || '—'} <span className="text-gray-400 font-normal">@ {exp.company || '—'}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatPeriod(exp.start_date, exp.end_date, exp.is_present)}
                      {exp.location ? ` · ${exp.location}` : ''}
                    </span>
                  </div>
                }>
                {exp.description || <span className="text-gray-400 italic">Fără descriere.</span>}
              </CollapsibleRow>
            ))}
          </div>
        </Section>
      )}

      {candidate.certifications?.length > 0 && (
        <Section title={`Certificări (${candidate.certifications.length})`}>
          <div className="space-y-1.5">
            {candidate.certifications.map(cert => (
              <CollapsibleRow key={cert.id}
                summary={
                  <div>
                    <span className="text-sm font-medium text-gray-800">{cert.name}</span>
                    {(cert.issuer || cert.date_obtained) && (
                      <span className="text-xs text-gray-400 ml-2">{cert.issuer}{cert.issuer && cert.date_obtained ? ' · ' : ''}{cert.date_obtained}</span>
                    )}
                  </div>
                }>
                <div className="space-y-0.5 text-sm text-gray-600">
                  {cert.issuer && <div>Emis de: <strong>{cert.issuer}</strong></div>}
                  {cert.date_obtained && <div>Data: <strong>{cert.date_obtained}</strong></div>}
                </div>
              </CollapsibleRow>
            ))}
          </div>
        </Section>
      )}

      {candidate.projects?.length > 0 && (
        <Section title={`Proiecte (${candidate.projects.length})`}>
          <div className="space-y-1.5">
            {candidate.projects.map(proj => (
              <CollapsibleRow key={proj.id}
                summary={
                  <div>
                    <span className="text-sm font-medium text-gray-800">{proj.name}</span>
                    {proj.technologies && <span className="text-xs text-gray-400 ml-2 truncate">{proj.technologies}</span>}
                  </div>
                }>
                {proj.description && <p className="mb-1">{proj.description}</p>}
                {proj.technologies && <p className="text-xs text-gray-500">Tehnologii: {proj.technologies}</p>}
                {proj.url && (
                  <a href={proj.url} target="_blank" rel="noopener noreferrer"
                    className={cn('text-xs text-[#2AA3FF] hover:underline flex items-center gap-1 mt-1')}>
                    <ExternalLink size={11} /> {proj.url}
                  </a>
                )}
              </CollapsibleRow>
            ))}
          </div>
        </Section>
      )}

      {candidate.achievements?.length > 0 && (
        <Section title={`Realizări (${candidate.achievements.length})`}>
          <div className="space-y-1.5">
            {candidate.achievements.map(ach => (
              <CollapsibleRow key={ach.id} summary={<span className="text-sm font-medium text-gray-800">{ach.title}</span>}>
                {ach.description || <span className="text-gray-400 italic">Fără descriere.</span>}
              </CollapsibleRow>
            ))}
          </div>
        </Section>
      )}

      {candidate.notes && (
        <Section title="Notițe interne">
          <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{candidate.notes}</p>
        </Section>
      )}
    </div>
  )
}

// ─── Tab: Companie ────────────────────────────────────────────────────────────

function CompanyTab({ candidate }: { candidate: CandidateFull }) {
  const hasData = candidate.company_name || candidate.company_cui || candidate.company_bank_account

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Building2 size={40} className="text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">Nu există date de companie înregistrate.</p>
        <p className="text-xs text-gray-300 mt-1">Completează din ecranul de editare al candidatului.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {candidate.company_name && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Nume companie</p>
          <p className="text-sm font-medium text-gray-800">{candidate.company_name}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {candidate.company_cui && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">CUI</p>
            <p className="text-sm text-gray-700 font-mono">{candidate.company_cui}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">TVA</p>
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full border',
            candidate.company_tva
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-gray-100 text-gray-500 border-gray-200'
          )}>
            {candidate.company_tva ? 'Da (platitor TVA)' : 'Nu'}
          </span>
        </div>
      </div>
      {candidate.company_bank_account && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Cont bancar (IBAN)</p>
          <p className="text-sm text-gray-700 font-mono bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
            {candidate.company_bank_account}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Istoric ─────────────────────────────────────────────────────────────

function HistoryTab({ candidateId }: { candidateId: string }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/candidates/${candidateId}/history`)
      .then(r => r.json())
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [candidateId])

  if (loading) return (
    <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">Se încarcă istoricul...</span>
    </div>
  )

  if (!entries?.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <History size={40} className="text-gray-200 mb-3" />
      <p className="text-sm text-gray-400">Nicio activitate înregistrată.</p>
      <p className="text-xs text-gray-300 mt-1">Va apărea automat când candidatul este adăugat în pipeline.</p>
    </div>
  )

  return (
    <div className="space-y-2.5">
      {entries.map(e => {
        const st = STATUS_LABELS[e.status] ?? { label: e.status, cls: 'bg-gray-100 text-gray-600' }
        const roleOpen = e.role?.status === 'active' || e.role?.status === 'on_hold'
        return (
          <div key={e.id} className="border border-gray-100 rounded-xl p-3.5 hover:border-gray-200 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {e.role?.title ?? '—'}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {e.role?.client && <p className="text-xs text-gray-400">{e.role.client.name}</p>}
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', roleOpen ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400')}>
                    {roleOpen ? 'Rol activ' : 'Rol închis'}
                  </span>
                </div>
              </div>
              <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0', st.cls)}>
                {st.label}
              </span>
            </div>
            {e.feedback && (
              <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 italic">
                &ldquo;{e.feedback}&rdquo;
              </p>
            )}
            <p className="text-[11px] text-gray-300 mt-2">
              Adăugat {new Date(e.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
              {e.updated_at !== e.created_at && ` · Actualizat ${new Date(e.updated_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}`}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

type TabId = 'profil' | 'companie' | 'istoric'

function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'profil', label: 'Profil', icon: <User size={13} /> },
    { id: 'companie', label: 'Companie', icon: <Building2 size={13} /> },
    { id: 'istoric', label: 'Istoric', icon: <History size={13} /> },
  ]
  return (
    <div className="flex border-b border-gray-100 px-1">
      {tabs.map(t => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            active === t.id
              ? 'border-[#2AA3FF] text-[#2AA3FF]'
              : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
          )}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function CandidateViewModal({
  candidateId,
  onClose,
  leftPanel,
}: {
  candidateId: string
  onClose: () => void
  leftPanel?: boolean
}) {
  const [candidate, setCandidate] = useState<CandidateFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('profil')

  useEffect(() => {
    fetch(`/api/candidates/${candidateId}`)
      .then(r => r.json())
      .then(data => { if (data.error) throw new Error(data.error); setCandidate(data) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [candidateId])

  function renderTabContent() {
    if (!candidate) return null
    if (activeTab === 'profil') return <ProfileTab candidate={candidate} />
    if (activeTab === 'companie') return <CompanyTab candidate={candidate} />
    return <HistoryTab candidateId={candidateId} />
  }

  function renderHeader(candidate: CandidateFull, large: boolean) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <h2 className={cn('font-bold text-[#0B1A33]', large ? 'text-xl' : 'text-lg')}>
            {candidate.first_name} {candidate.last_name}
          </h2>
          {candidate.successful && <Star size={large ? 16 : 15} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {candidate.profile && <span className="text-sm text-gray-500">{candidate.profile.name}</span>}
          {candidate.seniority && <Badge variant="gray">{SENIORITY_LABELS[candidate.seniority] ?? candidate.seniority}</Badge>}
          {candidate.candidate_status === 'activ' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Activ</span>
          )}
          {candidate.candidate_status === 'angajat' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Angajat</span>
          )}
          {candidate.successful_client && (
            <span className="text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
              Plasat la {candidate.successful_client}
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── leftPanel mode ────────────────────────────────────────────────────────
  if (leftPanel) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-start p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-[520px] max-h-[calc(100vh-2rem)]" onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between p-5 border-b flex-shrink-0">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400"><Loader2 size={16} className="animate-spin" /><span className="text-sm">Se încarcă...</span></div>
            ) : candidate ? renderHeader(candidate, false) : (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded ml-4 flex-shrink-0"><X size={18} /></button>
          </div>
          {candidate && (
            <>
              <TabBar active={activeTab} onChange={setActiveTab} />
              <div className="overflow-y-auto flex-1 p-5">{renderTabContent()}</div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Full mode ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-[90vw] max-w-[1280px] h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b flex-shrink-0">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400"><Loader2 size={16} className="animate-spin" /><span className="text-sm">Se încarcă...</span></div>
          ) : candidate ? renderHeader(candidate, true) : (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded ml-4 flex-shrink-0"><X size={20} /></button>
        </div>

        {/* Body */}
        {candidate && (
          <div className="flex flex-1 min-h-0">
            {/* Left: tabs + content */}
            <div className="w-[420px] flex-shrink-0 flex flex-col border-r border-gray-100">
              <TabBar active={activeTab} onChange={setActiveTab} />
              <div className="overflow-y-auto flex-1 p-6">{renderTabContent()}</div>
            </div>
            {/* Right: CV preview */}
            <div className="flex-1 min-w-0 bg-gray-50 rounded-br-2xl overflow-hidden">
              <CvPanel candidateId={candidateId} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
