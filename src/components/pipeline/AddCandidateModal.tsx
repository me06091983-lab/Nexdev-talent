'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Plus, Loader2 } from 'lucide-react'

interface Candidate {
  id: string
  first_name: string
  last_name: string
  seniority: string | null
  profile: { name: string } | null
  skills: { id: string; name: string }[]
}

interface Props {
  roleId: string
  onClose: () => void
  onAdded: () => void
}

export function AddCandidateModal({ roleId, onClose, onAdded }: Props) {
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const search = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/candidates?q=${encodeURIComponent(q)}&not_in_role=${roleId}`)
      const data = await res.json()
      setCandidates(data ?? [])
    } catch {
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [roleId])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  async function addCandidate(candidateId: string) {
    setAdding(candidateId)
    setError('')
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, role_id: roleId, note: note.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Eroare')
      onAdded()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eroare necunoscută')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Adaugă candidat în pipeline</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Caută după nume..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50"
              autoFocus
            />
          </div>

          <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-1.5">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-400">
                {query ? 'Niciun candidat găsit' : 'Tastează un nume pentru a căuta'}
              </p>
            ) : (
              candidates.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {`${c.first_name[0]}${c.last_name[0]}`.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-gray-400">{c.profile?.name ?? ''}{c.seniority ? ` · ${c.seniority}` : ''}</p>
                  </div>
                  <button
                    onClick={() => addCandidate(c.id)}
                    disabled={adding === c.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1A33] text-white text-xs font-medium rounded-xl hover:bg-[#0B1A33]/90 transition-colors disabled:opacity-50"
                  >
                    {adding === c.id ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    Adaugă
                  </button>
                </div>
              ))
            )}
          </div>

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Notă opțională la adăugare..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  )
}
