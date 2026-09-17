'use client'

import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { ChatColumn, type ChatMessage } from './ChatColumn'
import { CandidateResultsColumn, type ResultGroup } from './CandidateResultsColumn'
import type { MatchResult } from '@/lib/matching'
import type { RecruiterRole } from './RecruiterClient'

export function RecruiterModal({
  role,
  onClose,
  isClosed,
  messages,
  busy,
  onSend,
  onAttachCv,
  onConfirmProposal,
  onDiscardProposal,
  loadingCandidates,
  groups,
  activeTab,
  onTabChange,
  onAdd,
}: {
  role: RecruiterRole
  onClose: () => void
  isClosed: boolean
  messages: ChatMessage[]
  busy: boolean
  onSend: (text: string) => void
  onAttachCv: (file: File) => void
  onConfirmProposal: (messageId: string) => Promise<void>
  onDiscardProposal: (messageId: string) => void
  loadingCandidates: boolean
  groups: ResultGroup[]
  activeTab: string
  onTabChange: (key: string) => void
  onAdd: (item: MatchResult) => Promise<void>
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        layoutId={`role-bubble-${role.id}`}
        transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
        className="relative w-full max-w-[1120px] h-[min(760px,88vh)] rounded-[28px] overflow-hidden deck-panel"
        style={{ boxShadow: '0 40px 110px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-[#9FB6D6] hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={15} />
        </button>

        <div className="h-full grid" style={{ gridTemplateColumns: '1fr 300px', gridTemplateRows: 'minmax(0, 1fr)' }}>
          <ChatColumn
            roleTitle={role.title}
            disabled={isClosed}
            disabledReason="This role is closed — chat actions are disabled here."
            messages={messages}
            busy={busy}
            onSend={onSend}
            onAttachCv={onAttachCv}
            onConfirmProposal={onConfirmProposal}
            onDiscardProposal={onDiscardProposal}
          />
          <CandidateResultsColumn
            loading={loadingCandidates}
            groups={groups}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onAdd={onAdd}
          />
        </div>
      </motion.div>
    </div>
  )
}
