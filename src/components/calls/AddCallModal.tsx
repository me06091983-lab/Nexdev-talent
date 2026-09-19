'use client'

import { useEffect } from 'react'
import { PhoneCall, X } from 'lucide-react'
import { CallForm, type CandidateCall } from './CallForm'

export function AddCallModal({
  candidateId,
  candidateName,
  roleId,
  roleTitle,
  onClose,
  onSaved,
}: {
  candidateId: string
  candidateName: string
  roleId?: string | null
  roleTitle?: string | null
  onClose: () => void
  onSaved: (call: CandidateCall) => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <PhoneCall size={16} className="text-[#2AA3FF]" /> Log a call
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {candidateName}{roleTitle && <span className="text-gray-400"> · {roleTitle}</span>}
            </p>
          </div>
          <button onClick={onClose} title="Close" className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
            <X size={16} />
          </button>
        </div>
        <CallForm candidateId={candidateId} roleId={roleId} autoFocus onCancel={onClose} onSaved={onSaved} />
      </div>
    </div>
  )
}
