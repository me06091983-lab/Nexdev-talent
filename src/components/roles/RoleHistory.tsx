'use client'

import { useState, useEffect } from 'react'
import { History, ChevronDown, ChevronRight, ArrowRight, Loader2 } from 'lucide-react'

interface HistoryEntry {
  id: string
  changed_at: string
  field: string
  old_value: string | null
  new_value: string | null
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function RoleHistory({ roleId }: { roleId: string }) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || entries !== null) return
    setLoading(true)
    fetch(`/api/roles/${roleId}/history`)
      .then(r => r.ok ? r.json() : [])
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [open, roleId, entries])

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <History size={13} className="text-gray-400" />
        Change history
      </button>

      {open && (
        <div className="mt-3">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
              <Loader2 size={12} className="animate-spin" /> Loading...
            </div>
          )}
          {!loading && entries?.length === 0 && (
            <p className="text-xs text-gray-400 italic py-2">No changes recorded.</p>
          )}
          {!loading && entries && entries.length > 0 && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {entries.map(e => (
                <div key={e.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-700">{e.field}</span>
                      {e.old_value && (
                        <>
                          <span className="text-[10px] text-gray-400 line-through">{e.old_value}</span>
                          <ArrowRight size={10} className="text-gray-300 flex-shrink-0" />
                        </>
                      )}
                      {e.new_value && (
                        <span className="text-[10px] font-semibold text-gray-700">{e.new_value}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{fmtDateTime(e.changed_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
