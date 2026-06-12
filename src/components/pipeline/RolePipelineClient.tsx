'use client'

import { useState, useCallback } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { KanbanBoard, type Submission } from './KanbanBoard'
import { AddCandidateModal } from './AddCandidateModal'
import { AIMatchPanel } from './AIMatchPanel'
import type { PartnerOption } from './ContractModal'

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
  initialSubmissions: Submission[]
  partners: PartnerOption[]
}

export function RolePipelineClient({ role, initialSubmissions, partners }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions)
  const [showAdd, setShowAdd] = useState(false)
  const [showAI, setShowAI] = useState(false)

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

        {/* Kanban */}
        <div className="flex-1 min-h-0">
          <KanbanBoard
            submissions={submissions}
            onRefresh={refresh}
            partners={partners}
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
