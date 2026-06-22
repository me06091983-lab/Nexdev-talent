'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Sparkles, Lock } from 'lucide-react'
import { KanbanBoard, type Submission } from './KanbanBoard'
import { AddCandidateModal } from './AddCandidateModal'
import { AIMatchPanel, type AddCandidateParams } from './AIMatchPanel'
import { RubixMatrixView } from './RubixMatrixView'
import type { PartnerOption } from './ContractModal'

interface Role {
  id: string
  title: string
  status: string
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

type FxRates = Record<string, number>

function calcEurEquivalents(
  rate: number,
  currency: string,
  rateType: string,
  fxRates: FxRates,
): { eurDay: number; eurHour: number } | null {
  const fxRate = currency === 'EUR' ? 1 : fxRates[currency]
  if (!fxRate) return null
  const rateInEur = rate / fxRate
  const eurDay = rateType === 'daily' ? rateInEur : rateInEur * 8
  const eurHour = rateType === 'hourly' ? rateInEur : rateInEur / 8
  return { eurDay: Math.round(eurDay), eurHour: Math.round(eurHour) }
}

export function RolePipelineClient({ role, initialSubmissions, partners }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions)
  const [showAdd, setShowAdd] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [lastAddedSubmissionId, setLastAddedSubmissionId] = useState<string | null>(null)
  const [fxRates, setFxRates] = useState<FxRates | null>(null)
  const isClosed = role.status === 'closed'

  useEffect(() => {
    fetch('/api/exchange-rates')
      .then(r => r.ok ? r.json() : null)
      .then(data => setFxRates(data ?? {}))
      .catch(() => setFxRates({}))
  }, [])

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/submissions?role_id=${role.id}`)
    if (res.ok) setSubmissions(await res.json())
  }, [role.id])

  function handleAdded(submissionId?: string) {
    setShowAdd(false)
    if (submissionId) setLastAddedSubmissionId(submissionId)
    refresh()
  }

  async function handleAddFromAI({ candidateId, rate, currency, rateType, aiScore, aiSummary }: AddCandidateParams) {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: candidateId,
        role_id: role.id,
        submission_rate: rate ?? null,
        submission_currency: currency,
        submission_rate_type: rateType,
        ai_score: aiScore,
        ai_summary: aiSummary,
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error ?? 'Eroare la adăugare')
    }
    const sub = await res.json()
    if (sub?.id) setLastAddedSubmissionId(sub.id)
    refresh()
  }

  return (
    <div className="flex flex-col min-h-0 flex-1 gap-4 relative">

      {/* ── Top section: Kanban (full width) ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 min-h-0">

        {/* Banner rol închis */}
        {isClosed && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-600 flex-shrink-0">
            <Lock size={14} className="text-gray-400 flex-shrink-0" />
            <span>Rol <strong>închis</strong> — vizualizare read-only. Nu se pot adăuga candidați sau modifica statusuri.</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-[#0B1A33]">{role.title}</h1>
            <p className="text-sm text-gray-400">
              {role.client?.name ?? ''}
              {role.rate && (() => {
                const currency = role.rate_currency ?? 'EUR'
                const rateType = role.rate_type ?? 'daily'
                const label = rateType === 'daily' ? 'zi' : 'oră'
                const base = ` · ${role.rate} ${currency} / ${label}`
                if (currency === 'EUR' && rateType === 'daily') return base
                if (fxRates === null) return <>{base}<span className="text-gray-300 mx-1 text-xs"> (curs în curs de încărcare...)</span></>
                const eur = calcEurEquivalents(role.rate, currency, rateType, fxRates)
                if (!eur) return <>{base}<span className="text-gray-300 mx-1 text-xs"> (curs indisponibil)</span></>
                return (
                  <>
                    {base}
                    <span className="text-gray-300 mx-1">·</span>
                    <span className="text-indigo-500 font-medium">≈ {eur.eurDay} EUR/zi</span>
                    <span className="text-gray-300 mx-1">·</span>
                    <span className="text-indigo-400">≈ {eur.eurHour} EUR/oră</span>
                  </>
                )
              })()}
              {' · '}
              <span className="text-gray-500">{submissions.length} candidați</span>
            </p>
          </div>
          {!isClosed && (
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
          )}
        </div>

        {/* Kanban */}
        <div className="flex-1 min-h-0">
          <KanbanBoard
            submissions={submissions}
            onRefresh={refresh}
            partners={partners}
            readOnly={isClosed}
          />
        </div>
      </div>

      {/* ── Bottom section: Rubix Matrix ── */}
      <div className="flex-shrink-0">
        <RubixMatrixView
          roleId={role.id}
          newSubmissionId={lastAddedSubmissionId}
        />
      </div>

      {/* ── AI Match panel — overlay absolut peste tot conținutul ── */}
      {!isClosed && showAI && (
        <div className="absolute top-0 right-0 bottom-0 z-30 w-80 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <AIMatchPanel roleId={role.id} onAddCandidate={handleAddFromAI} onClose={() => setShowAI(false)} />
          </div>
        </div>
      )}

      {!isClosed && showAdd && (
        <AddCandidateModal roleId={role.id} onClose={() => setShowAdd(false)} onAdded={handleAdded} />
      )}
    </div>
  )
}
