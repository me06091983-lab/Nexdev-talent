'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CandidateForm } from '@/components/candidates/CandidateForm'
import { Loader2 } from 'lucide-react'

export default function NewCandidatePage() {
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New candidate</h1>
          <p className="text-gray-500 mt-1">Fill in the details or upload a CV for automatic pre-filling</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/candidates')}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="candidate-form"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save candidate'}
          </button>
        </div>
      </div>
      <div className="glass rounded-2xl p-8">
        <CandidateForm onSavingChange={setSaving} />
      </div>
    </div>
  )
}
