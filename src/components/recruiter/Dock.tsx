'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { RecruiterRole } from './RecruiterClient'

export function Dock({
  items,
  onRestore,
}: {
  items: RecruiterRole[]
  onRestore: (id: string) => void
}) {
  if (items.length === 0) return null

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="deck-panel rounded-2xl px-2.5 py-2 flex items-center gap-1.5 pointer-events-auto">
        <AnimatePresence initial={false}>
          {items.map(r => (
            <motion.button
              key={r.id}
              layout
              initial={{ opacity: 0, scale: 0.7, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: 8 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              onClick={() => onRestore(r.id)}
              title={`Restore ${r.title}`}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11.5px] text-[#EAF1FC] transition-colors flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D2FF] flex-none" />
              <span className="max-w-[140px] truncate">{r.title}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
