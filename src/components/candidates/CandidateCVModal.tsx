'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, FileText, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  candidateId: string
  candidateName: string
  onClose: () => void
}

export function CandidateCVModal({ candidateId, candidateName, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/candidates/${candidateId}/cv`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setUrl(data.url)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [candidateId])

  const isPdf = url?.toLowerCase().includes('.pdf') || (!url?.toLowerCase().includes('.doc'))

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-[85vw] max-w-[1100px] h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#2AA3FF]" />
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">CV — {candidateName}</h2>
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#2AA3FF] hover:underline flex items-center gap-1">
                  Deschide în tab nou <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={cn("flex-1 min-h-0", loading || error ? "flex items-center justify-center p-8" : "")}>
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-sm">Se încarcă CV-ul...</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <FileText size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{error}</p>
              <p className="text-xs text-gray-400 mt-1">CV-ul trebuie încărcat din profilul candidatului.</p>
            </div>
          ) : url && isPdf ? (
            <iframe
              src={url}
              className="w-full h-full rounded-b-2xl"
              title={`CV ${candidateName}`}
            />
          ) : url ? (
            <div className="flex flex-col items-center justify-center p-8 gap-3">
              <FileText size={40} className="text-gray-300" />
              <p className="text-sm text-gray-600">Fișier DOCX — nu poate fi previzualizat direct.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#0B1A33] text-white text-sm rounded-xl hover:bg-[#0B1A33]/90 transition-colors"
              >
                <ExternalLink size={14} /> Descarcă CV
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
