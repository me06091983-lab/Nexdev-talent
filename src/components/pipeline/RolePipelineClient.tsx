'use client'

import { useState, useCallback } from 'react'
import { Plus, Sparkles, Settings2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { KanbanBoard, type Submission } from './KanbanBoard'
import { AddCandidateModal } from './AddCandidateModal'
import { AIMatchPanel } from './AIMatchPanel'
import type { PartnerOption } from './ContractModal'
import type { RoleStage } from './StatusModal'

interface Role {
  id: string
  title: string
  client: { name: string } | null
  rate: number | null
  rate_currency: string | null
  rate_type: string | null
}

interface Props {
  role: Role
  roleId: string
  initialSubmissions: Submission[]
  partners: PartnerOption[]
  stages: RoleStage[]
}

// ─── Stages Manager Panel ────────────────────────────────────────────────────

function StagesPanel({ roleId, stages, onChange }: {
  roleId: string
  stages: RoleStage[]
  onChange: (updated: RoleStage[]) => void
}) {
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function addStage() {
    const name = newName.trim()
    if (!name) return
    if (stages.length >= 4) { setError('Maxim 4 etape de interviu per rol.'); return }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/roles/${roleId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const newStage: RoleStage = await res.json()
      onChange([...stages, newStage])
      setNewName('')
    } else {
      setError('Eroare la adăugare.')
    }
    setSaving(false)
  }

  async function deleteStage(id: string) {
    onChange(stages.filter(s => s.id !== id))
    await fetch(`/api/roles/${roleId}/stages?stage_id=${id}`, { method: 'DELETE' })
  }

  async function moveStage(idx: number, dir: -1 | 1) {
    const next = [...stages]
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= next.length) return
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    const reordered = next.map((s, i) => ({ ...s, order_index: i }))
    onChange(reordered)
    await Promise.all(reordered.map(s =>
      fetch(`/api/roles/${roleId}/stages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: s.id, order_index: s.order_index }),
      })
    ))
  }

  return (
    <div className="glass rounded-2xl p-4 mb-4">
      <p className="text-xs text-gray-500 mb-3">
        Definește etapele de interviu pentru acest rol (max. 4). Acestea vor înlocui labelurile generice &quot;Interview 1-4&quot; în modalul de status.
      </p>

      <div className="space-y-1.5 mb-3">
        {stages.length === 0 && (
          <p className="text-xs text-gray-400 italic">Nicio etapă configurată — se folosesc labeluri implicite (Interview 1-4).</p>
        )}
        {stages.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveStage(idx, -1)} disabled={idx === 0} className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-0">
                <ChevronUp size={12} />
              </button>
              <button onClick={() => moveStage(idx, 1)} disabled={idx === stages.length - 1} className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-0">
                <ChevronDown size={12} />
              </button>
            </div>
            <span className="w-5 h-5 rounded-full bg-[#0B1A33]/10 text-[#0B1A33] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {idx + 1}
            </span>
            <span className="text-sm text-gray-800 flex-1">{s.name}</span>
            <button onClick={() => deleteStage(s.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      {stages.length < 4 && (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStage()}
            placeholder="Nume etapă (ex: Screening tehnic)"
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2AA3FF] placeholder:text-gray-300"
          />
          <button
            onClick={addStage}
            disabled={saving || !newName.trim()}
            className="px-4 py-2 bg-[#0B1A33] text-white text-sm font-medium rounded-xl hover:bg-[#162540] transition-colors disabled:opacity-50 flex-shrink-0"
          >
            Adaugă
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function RolePipelineClient({ role, roleId, initialSubmissions, partners, stages: initialStages }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions)
  const [showAdd, setShowAdd] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showStages, setShowStages] = useState(false)
  const [stages, setStages] = useState<RoleStage[]>(initialStages)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/submissions?role_id=${role.id}`)
    if (res.ok) {
      const data = await res.json()
      setSubmissions(data)
    }
  }, [role.id])

  function handleAdded() {
    setShowAdd(false)
    refresh()
  }

  async function handleAddFromAI(candidateId: string) {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, role_id: role.id }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error ?? 'Eroare la adăugare')
    }
    refresh()
  }

  return (
    <div className="flex gap-5 min-h-0 flex-1">
      {/* Main column: Kanban */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-[#0B1A33]">{role.title}</h1>
            <p className="text-sm text-gray-400">
              {role.client?.name ?? ''}
              {role.rate ? ` · ${role.rate} ${role.rate_currency ?? 'EUR'} / ${role.rate_type === 'daily' ? 'zi' : 'oră'}` : ''}
              {' · '}
              <span className="text-gray-500">{submissions.length} candidați</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStages(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                showStages
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              title="Configurează etapele de interviu"
            >
              <Settings2 size={14} />
              Etape interviu
              {stages.length > 0 && (
                <span className="ml-0.5 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">
                  {stages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowAI(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                showAI
                  ? 'bg-[#2AA3FF]/10 border-[#2AA3FF]/30 text-[#2AA3FF]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Sparkles size={14} />
              AI Match
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0B1A33] text-white text-sm font-medium rounded-xl hover:bg-[#0B1A33]/90 transition-colors"
            >
              <Plus size={14} />
              Adaugă candidat
            </button>
          </div>
        </div>

        {/* Stages panel (collapsible) */}
        {showStages && (
          <StagesPanel roleId={roleId} stages={stages} onChange={setStages} />
        )}

        {/* Kanban */}
        <div className="flex-1 min-h-0">
          <KanbanBoard
            submissions={submissions}
            onRefresh={refresh}
            partners={partners}
            stages={stages}
          />
        </div>
      </div>

      {/* AI Panel sidebar */}
      {showAI && (
        <div className="w-80 flex-shrink-0">
          <AIMatchPanel roleId={role.id} onAddCandidate={handleAddFromAI} />
        </div>
      )}

      {showAdd && (
        <AddCandidateModal roleId={role.id} onClose={() => setShowAdd(false)} onAdded={handleAdded} />
      )}
    </div>
  )
}
