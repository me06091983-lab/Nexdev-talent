'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Briefcase, ScrollText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
  candidates: { id: string; name: string; email: string; status: string; profile: string | null }[]
  roles: { id: string; title: string; status: string; client: string }[]
  contracts: { id: string; candidateName: string; roleTitle: string; status: string }[]
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults(null); return }
    setLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => { setResults(data); setLoading(false) })
        .catch(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true); inputRef.current?.focus() }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); setResults(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery(''); setResults(null)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function navigate(href: string) {
    router.push(href)
    setOpen(false); setQuery(''); setResults(null)
  }

  const hasResults = results && (results.candidates.length + results.roles.length + results.contracts.length) > 0

  return (
    <div ref={containerRef} className="relative px-3 mb-2">
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white/60 text-xs transition-all"
      >
        <Search size={13} />
        <span className="flex-1 text-left">Caută...</span>
        <kbd className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-mono">Ctrl K</kbd>
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-0 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Caută candidați, roluri, contracte..."
                className="flex-1 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                autoFocus
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults(null) }} className="text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {loading && (
              <div className="px-4 py-3 text-xs text-gray-400">Se caută...</div>
            )}

            {!loading && results && !hasResults && (
              <div className="px-4 py-3 text-xs text-gray-400">Niciun rezultat pentru &ldquo;{query}&rdquo;</div>
            )}

            {hasResults && (
              <div className="max-h-80 overflow-y-auto py-1">
                {results!.candidates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5">
                      <Users size={11} className="text-gray-400" />
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Candidați</span>
                    </div>
                    {results!.candidates.map(c => (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/candidates/${c.id}`)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#2AA3FF]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-[#2AA3FF]">{c.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{c.profile ?? c.email}</p>
                        </div>
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full flex-shrink-0',
                          c.status === 'activ' ? 'bg-green-100 text-green-700' :
                          c.status === 'angajat' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        )}>
                          {c.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {results!.roles.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 mt-1">
                      <Briefcase size={11} className="text-gray-400" />
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Roluri</span>
                    </div>
                    {results!.roles.map(r => (
                      <button
                        key={r.id}
                        onClick={() => navigate(`/roles/${r.id}/pipeline`)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <Briefcase size={12} className="text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">{r.client}</p>
                        </div>
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full flex-shrink-0',
                          r.status === 'active' ? 'bg-green-100 text-green-700' :
                          r.status === 'closed' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'
                        )}>
                          {r.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {results!.contracts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 mt-1">
                      <ScrollText size={11} className="text-gray-400" />
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Contracte</span>
                    </div>
                    {results!.contracts.map(c => (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/contracts/${c.id}`)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <ScrollText size={12} className="text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.candidateName}</p>
                          <p className="text-[10px] text-gray-400 truncate">{c.roleTitle}</p>
                        </div>
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full flex-shrink-0',
                          c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        )}>
                          {c.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
