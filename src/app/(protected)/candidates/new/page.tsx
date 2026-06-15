'use client'

import { useState } from 'react'
import { CandidateForm } from '@/components/candidates/CandidateForm'
import { Loader2 } from 'lucide-react'

export default function NewCandidatePage() {
  const [saving, setSaving] = useState(false)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidat nou</h1>
          <p className="text-gray-500 mt-1">Completează datele sau încarcă un CV pentru precompletare automată</p>
        </div>
        <button
          type="submit"
          form="candidate-form"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Se salvează...' : 'Salvează candidat'}
        </button>
      </div>
      <div className="glass rounded-2xl p-8">
        <CandidateForm onSavingChange={setSaving} />
      </div>
    </div>
  )
}
