'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, Plus } from 'lucide-react'

interface Skill {
  id: string
  name: string
  category: string
}

interface SkillSelectorProps {
  selected: Skill[]
  onChange: (skills: Skill[]) => void
  placeholder?: string
}

export function SkillSelector({ selected, onChange, placeholder = 'Search or add skills...' }: SkillSelectorProps) {
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/skills').then(r => r.json()).then(setAllSkills)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = allSkills.filter(
    s =>
      !selected.find(sel => sel.id === s.id) &&
      s.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20)

  const grouped = filtered.reduce<Record<string, Skill[]>>((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = []
    acc[skill.category].push(skill)
    return acc
  }, {})

  const hasExact = allSkills.some(s => s.name.toLowerCase() === query.toLowerCase().trim())
  const alreadySelected = selected.some(s => s.name.toLowerCase() === query.toLowerCase().trim())
  const showAddOption = query.trim().length >= 2 && !hasExact && !alreadySelected

  function add(skill: Skill) {
    onChange([...selected, skill])
    setQuery('')
    setOpen(false)
  }

  function remove(id: string) {
    onChange(selected.filter(s => s.id !== id))
  }

  async function createAndAdd() {
    if (!query.trim() || adding) return
    setAdding(true)
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: query.trim(), category: 'General' }),
      })
      const newSkill: Skill = await res.json()
      setAllSkills(prev => [...prev, newSkill].sort((a, b) => a.name.localeCompare(b.name)))
      add(newSkill)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(skill => (
            <span key={skill.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2 py-1 rounded-full">
              {skill.name}
              <button type="button" onClick={() => remove(skill.id)} className="hover:text-blue-900">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF] focus:border-transparent"
        />
      </div>

      {open && query.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {Object.keys(grouped).length === 0 && !showAddOption ? (
            <div className="px-4 py-3 text-sm text-gray-400">No skills found</div>
          ) : (
            <>
              {Object.entries(grouped).map(([category, skills]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">
                    {category}
                  </div>
                  {skills.map(skill => (
                    <button
                      key={skill.id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); add(skill) }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              ))}
              {showAddOption && (
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); createAndAdd() }}
                  disabled={adding}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#2AA3FF] hover:bg-blue-50 font-medium border-t border-gray-100 flex items-center gap-2"
                >
                  <Plus size={14} />
                  {adding ? 'Adding...' : `Add "${query.trim()}" to directory`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
