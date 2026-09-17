'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Loader2, Sparkles, Link2, Paperclip, Check, X, MapPin, BadgeCheck } from 'lucide-react'
import type { CandidateSource } from '@/lib/matching'

export interface ProposedCandidateData {
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  linkedin_url?: string | null
  location?: string | null
  seniority?: string | null
  skills: string[]
  summary?: string
  cv_file_path?: string | null
  source: CandidateSource
  status: 'pending' | 'added' | 'discarded'
}

export interface ChatMessage {
  id: string
  from: 'user' | 'system'
  text: string
  time: string
  proposal?: ProposedCandidateData
}

function ProposalCard({
  proposal,
  onConfirm,
  onDiscard,
}: {
  proposal: ProposedCandidateData
  onConfirm: () => void
  onDiscard: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="deck-card deck-rise rounded-2xl p-3.5 max-w-[85%]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {proposal.first_name} {proposal.last_name}
          </p>
          <div className="flex items-center gap-2.5 mt-1 flex-wrap">
            {proposal.seniority && (
              <span className="text-[10px] font-mono uppercase tracking-wide text-[#7E97BA]">{proposal.seniority}</span>
            )}
            {proposal.location && (
              <span className="text-[10px] text-[#7E97BA] flex items-center gap-0.5"><MapPin size={9} />{proposal.location}</span>
            )}
          </div>
        </div>
        {proposal.source === 'linkedin' && <Link2 size={14} className="text-[#34D2FF] flex-shrink-0 mt-0.5" />}
      </div>

      {proposal.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {proposal.skills.slice(0, 8).map(s => (
            <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#9FB6D6] border border-white/10">{s}</span>
          ))}
        </div>
      )}

      {proposal.summary && (
        <p className="text-[12px] text-[#C6D5EA] leading-relaxed mt-2.5">{proposal.summary}</p>
      )}

      {proposal.status === 'pending' && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/10">
          <button
            onClick={confirm}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium rounded-lg bg-[#34D2FF] text-[#04101F] hover:bg-[#4DB4FF] transition-colors disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Add to database
          </button>
          <button
            onClick={onDiscard}
            disabled={busy}
            className="flex items-center justify-center gap-1 px-3 py-1.5 text-[11.5px] font-medium rounded-lg border border-white/15 text-[#9FB6D6] hover:border-white/30 hover:text-white transition-colors"
          >
            <X size={12} /> Discard
          </button>
        </div>
      )}
      {proposal.status === 'added' && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/10 text-[11.5px] text-[#5FE0A8]">
          <BadgeCheck size={13} /> Added to database
        </div>
      )}
      {proposal.status === 'discarded' && (
        <div className="mt-3 pt-3 border-t border-white/10 text-[11.5px] text-[#7E97BA]">Discarded</div>
      )}
    </div>
  )
}

export function ChatColumn({
  roleTitle,
  disabled,
  disabledReason,
  messages,
  busy,
  onSend,
  onAttachCv,
  onConfirmProposal,
  onDiscardProposal,
}: {
  roleTitle: string | null
  disabled: boolean
  disabledReason?: string
  messages: ChatMessage[]
  busy: boolean
  onSend: (text: string) => void
  onAttachCv: (file: File) => void
  onConfirmProposal: (messageId: string) => Promise<void>
  onDiscardProposal: (messageId: string) => void
}) {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  function submit() {
    const text = draft.trim()
    if (!text || disabled || busy) return
    onSend(text)
    setDraft('')
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onAttachCv(file)
    e.target.value = ''
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="panel-drag-handle flex-none px-4 py-4 border-b border-white/10 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none">
        <div className="w-7 h-7 rounded-lg bg-white/5 border border-[#34D2FF]/30 flex items-center justify-center flex-shrink-0">
          <Bot size={15} className="text-[#34D2FF]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">Recruiter chat</h2>
          <p className="text-[11px] text-[#7E97BA] truncate">{roleTitle ?? 'Select a role to start'}</p>
        </div>
        {!disabled && <span className="deck-pulse flex-shrink-0" title="Live" />}
      </div>

      <div ref={scrollRef} className="deck-scroll flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !disabled && (
          <div className="text-center py-10">
            <p className="text-[12px] text-[#7E97BA] leading-relaxed max-w-[260px] mx-auto">
              Try: <span className="text-[#C6D5EA] font-medium">&quot;find candidates with match over 50%&quot;</span>
              <br />or paste a LinkedIn profile you found, and I&apos;ll structure it for you to confirm.
            </p>
          </div>
        )}
        {messages.map(m => {
          if (m.proposal) {
            return (
              <div key={m.id} className="flex justify-start">
                <ProposalCard
                  proposal={m.proposal}
                  onConfirm={() => onConfirmProposal(m.id)}
                  onDiscard={() => onDiscardProposal(m.id)}
                />
              </div>
            )
          }
          return (
            <div key={m.id} className={`flex deck-rise ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  m.from === 'user'
                    ? 'bg-[#34D2FF] text-[#04101F] rounded-br-sm'
                    : 'deck-card text-[#EAF1FC] rounded-bl-sm'
                }`}
              >
                {m.text}
                <div className={`text-[9px] font-mono mt-1 ${m.from === 'user' ? 'text-[#04101F]/60' : 'text-[#7E97BA]'}`}>{m.time}</div>
              </div>
            </div>
          )
        })}
        {busy && (
          <div className="flex justify-start">
            <div className="deck-card text-[#9FB6D6] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="flex-none border-t border-white/10 p-3">
        {disabled ? (
          <p className="text-[11px] text-[#7E97BA] text-center py-2">{disabledReason}</p>
        ) : (
          <>
            <div className="flex gap-1.5 mb-2">
              <button
                onClick={() => onSend('Find candidates in the database with match over 50%')}
                disabled={busy}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-[#34D2FF]/10 text-[#34D2FF] border border-[#34D2FF]/25 hover:bg-[#34D2FF]/15 transition-colors disabled:opacity-50"
              >
                <Sparkles size={11} /> Match from database
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                title="Attach a CV to parse and evaluate"
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-white/10 text-[#9FB6D6] hover:border-[#34D2FF]/40 hover:text-[#34D2FF] transition-colors disabled:opacity-50"
              >
                <Paperclip size={11} /> Attach CV
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFilePick} className="hidden" />
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                }}
                placeholder="Type a command, or paste a LinkedIn profile..."
                rows={1}
                className="flex-1 resize-none px-3 py-2.5 rounded-xl text-[13px] bg-white/5 border border-white/10 text-white placeholder:text-[#5E7699] focus:outline-none focus:ring-2 focus:ring-[#34D2FF]/50 focus:border-[#34D2FF]/40 max-h-24"
              />
              <button
                onClick={submit}
                disabled={!draft.trim() || busy}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#34D2FF] text-[#04101F] hover:bg-[#4DB4FF] disabled:opacity-40 transition-colors flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
