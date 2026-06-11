'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Pencil, Trash2, Star, X, Info } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface Skill { id: string; name: string; category: string }
interface Profile { id: string; name: string }
interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string | null
  location: string | null
  seniority: string | null
  rate_min: number | null
  rate_wish: number | null
  currency: string
  source_type: string | null
  successful: boolean
  profile: Profile | null
  skills: Skill[]
  created_at: string
}

const SENIORITY_LABELS: Record<string, string> = {
  junior: 'Junior', mid: 'Mid', senior: 'Senior', lead: 'Lead', principal: 'Principal',
}

export function CandidatesClient({ candidates, profiles }: { candidates: Candidate[]; profiles: Profile[] }) {
  const router = useRouter()

  // Search state
  const [nameSearch, setNameSearch] = useState('')
  const [profileSearch, setProfileSearch] = useState('')
  const [skillSearch, setSkillSearch] = useState('')
  const [seniorityFilter, setSeniorityFilter] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  // Parsează "aws and java and python" în termeni individuali
  const skillTerms = skillSearch
    .toLowerCase()
    .split(/\s+and\s+/)
    .map(t => t.trim())
    .filter(Boolean)

  const filtered = candidates.filter(c => {
    // Caută după nume (first+last)
    if (nameSearch) {
      const q = nameSearch.toLowerCase()
      const fullName = `${c.first_name} ${c.last_name}`.toLowerCase()
      if (!fullName.includes(q) && !c.email?.toLowerCase().includes(q)) return false
    }

    // Caută după profil/rol
    if (profileSearch) {
      const q = profileSearch.toLowerCase()
      if (!c.profile?.name.toLowerCase().includes(q)) return false
    }

    // Caută după skilluri cu AND logic
    if (skillTerms.length > 0) {
      const hasAll = skillTerms.every(term =>
        c.skills.some(s => s.name.toLowerCase().includes(term))
      )
      if (!hasAll) return false
    }

    // Filtre simple
    if (seniorityFilter && c.seniority !== seniorityFilter) return false
    if (locationSearch && !c.location?.toLowerCase().includes(locationSearch.toLowerCase())) return false

    return true
  })

  const hasFilters = nameSearch || profileSearch || skillSearch || seniorityFilter || locationSearch

  function clearAll() {
    setNameSearch('')
    setProfileSearch('')
    setSkillSearch('')
    setSeniorityFilter('')
    setLocationSearch('')
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Ștergi candidatul "${name}"?`)) return
    setDeleting(id)
    await fetch(`/api/candidates/${id}`, { method: 'DELETE' })
    setDeleting(null)
    router.refresh()
  }

  return (
    <div>
      {/* ── SEARCH PANEL ── */}
      <div className="glass rounded-2xl p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Căutare după nume */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={nameSearch} onChange={e => setNameSearch(e.target.value)}
              placeholder="Caută după nume sau email..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]"
            />
          </div>

          {/* Căutare după profil/rol */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" list="profile-search-list" value={profileSearch} onChange={e => setProfileSearch(e.target.value)}
              placeholder="Caută după profil (ex: Java, DevOps...)"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]"
            />
            <datalist id="profile-search-list">
              {profiles.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Căutare după skilluri cu AND */}
          <div className="col-span-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
              placeholder="Skilluri: aws and java and python"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]"
            />
          </div>

          {/* Locație */}
          <div className="relative">
            <input
              type="text" value={locationSearch} onChange={e => setLocationSearch(e.target.value)}
              placeholder="Filtrează după locație..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]"
            />
          </div>

          {/* Senioritate */}
          <select value={seniorityFilter} onChange={e => setSeniorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]">
            <option value="">Toate nivelurile</option>
            {Object.entries(SENIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Info AND search + reset */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Info size={12} />
            <span>Skilluri: folosește <strong>and</strong> între termeni (ex: <em>aws and java and python</em>)</span>
          </div>
          {hasFilters && (
            <button onClick={clearAll} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
              <X size={12} /> Resetează filtrele
            </button>
          )}
        </div>

        {/* Indicatori filtre active */}
        {skillTerms.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {skillTerms.map(t => (
              <span key={t} className="inline-flex items-center bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full font-medium">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Rezultate */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {filtered.length} {filtered.length === 1 ? 'candidat' : 'candidați'}
          {hasFilters && <span className="text-gray-400"> din {candidates.length} total</span>}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-gray-400">Niciun candidat găsit pentru filtrele aplicate.</p>
          {hasFilters && (
            <button onClick={clearAll} className="mt-3 text-sm text-[#2AA3FF] hover:underline">Resetează filtrele</button>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/40 bg-white/30 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidat</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Profil / Nivel</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Skilluri</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sursă</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-900 text-sm">
                        {c.first_name} {c.last_name}
                      </span>
                      {c.successful && <Star size={13} className="text-yellow-400 fill-yellow-400" />}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 space-x-2">
                      {c.email && <span>{c.email}</span>}
                      {c.location && <span>📍 {c.location}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">{c.profile?.name ?? '—'}</div>
                    {c.seniority && (
                      <Badge variant="gray" className="mt-1">{SENIORITY_LABELS[c.seniority]}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.skills.slice(0, 4).map(s => (
                        <Badge key={s.id} variant="blue"
                          className={cn(skillTerms.some(t => s.name.toLowerCase().includes(t)) && 'ring-1 ring-blue-400')}>
                          {s.name}
                        </Badge>
                      ))}
                      {c.skills.length > 4 && <Badge variant="gray">+{c.skills.length - 4}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {c.rate_min || c.rate_wish ? (
                      <div className="space-y-0.5">
                        {c.rate_min && <div className="text-xs text-gray-500">Min: {c.rate_min} {c.currency}</div>}
                        {c.rate_wish && <div className="text-xs font-medium text-gray-700">Dorit: {c.rate_wish} {c.currency}</div>}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.source_type || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/candidates/${c.id}`}
                        className="p-1.5 text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50 rounded transition-colors" title="Editează">
                        <Pencil size={15} />
                      </Link>
                      <button onClick={() => handleDelete(c.id, `${c.first_name} ${c.last_name}`)}
                        disabled={deleting === c.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Șterge">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
