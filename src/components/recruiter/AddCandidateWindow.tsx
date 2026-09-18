'use client'

import { useEffect, useState } from 'react'
import { Rnd } from 'react-rnd'
import { X, Loader2 } from 'lucide-react'
import { CandidateForm, type ParsedCvData } from '@/components/candidates/CandidateForm'
import { resolveLockedPartner, type LockedPartner } from '@/lib/resolveLockedPartner'

export function AddCandidateWindow({
  cvFilePath,
  parsedCvData,
  onClose,
  onSaved,
}: {
  cvFilePath: string
  parsedCvData: ParsedCvData | null
  onClose: () => void
  onSaved: (candidate: { id: string; first_name: string; last_name: string }) => void
}) {
  const [rect, setRect] = useState({ x: 40, y: 24, width: 880, height: 680 })
  const [lockedPartner, setLockedPartner] = useState<LockedPartner | undefined>(undefined)
  const [resolvingPartner, setResolvingPartner] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    resolveLockedPartner().then(p => {
      if (!cancelled) {
        setLockedPartner(p)
        setResolvingPartner(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  return (
    <Rnd
      position={{ x: rect.x, y: rect.y }}
      size={{ width: rect.width, height: rect.height }}
      onDragStop={(_e, d) => setRect(r => ({ ...r, x: d.x, y: d.y }))}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        setRect({ x: pos.x, y: pos.y, width: parseInt(ref.style.width, 10), height: parseInt(ref.style.height, 10) })
      }
      bounds="parent"
      dragHandleClassName="add-candidate-drag-handle"
      minWidth={560}
      minHeight={480}
      style={{ display: 'flex', flexDirection: 'column', zIndex: 200, boxShadow: '0 40px 110px rgba(0,0,0,.6)' }}
      className="window-panel rounded-[24px] overflow-hidden flex flex-col"
      resizeHandleComponent={{ bottomRight: <div className="resize-grip" /> }}
    >
      <div className="add-candidate-drag-handle flex-none flex items-center gap-2 px-4 py-2.5 border-b border-white/10 cursor-grab active:cursor-grabbing select-none">
        <span className="text-[12.5px] font-semibold text-white flex-1">Add candidate</span>
        <button
          type="submit"
          form="candidate-form"
          disabled={saving || resolvingPartner}
          onPointerDown={e => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#34D2FF] text-[#06131F] text-[11.5px] font-semibold rounded-lg hover:bg-[#34D2FF]/90 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 size={11} className="animate-spin" />}
          {saving ? 'Saving...' : 'Save candidate'}
        </button>
        <button
          onClick={onClose}
          title="Close"
          className="w-6 h-6 rounded-md flex items-center justify-center text-[#9FB6D6] hover:bg-red-500/20 hover:text-red-300 transition-colors"
        >
          <X size={13} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto deck-scroll bg-[#F5F7FA] px-6 py-6">
        {resolvingPartner ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : (
          <CandidateForm
            cvFilePath={cvFilePath}
            parsedCvData={parsedCvData}
            lockedPartner={lockedPartner}
            onSavingChange={setSaving}
            onSaved={onSaved}
          />
        )}
      </div>
    </Rnd>
  )
}
