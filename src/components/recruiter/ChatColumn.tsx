'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Loader2, Sparkles, Globe } from 'lucide-react'

export interface ChatMessage {
  id: string
  from: 'user' | 'system'
  text: string
  time: string
}

export function ChatColumn({
  roleTitle,
  disabled,
  disabledReason,
  messages,
  busy,
  onSend,
}: {
  roleTitle: string | null
  disabled: boolean
  disabledReason?: string
  messages: ChatMessage[]
  busy: boolean
  onSend: (text: string) => void
}) {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  function submit() {
    const text = draft.trim()
    if (!text || disabled || busy) return
    onSend(text)
    setDraft('')
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="px-4 py-4 border-b border-gray-200 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#0B1A33] flex items-center justify-center flex-shrink-0">
          <Bot size={15} className="text-[#2AA3FF]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Recruiter chat</h2>
          <p className="text-[11px] text-gray-400 truncate">{roleTitle ?? 'Select a role to start'}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !disabled && (
          <div className="text-center py-8">
            <p className="text-xs text-gray-400 leading-relaxed max-w-[240px] mx-auto">
              Try: <span className="text-gray-600 font-medium">&quot;find candidates with match over 50%&quot;</span>
            </p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                m.from === 'user'
                  ? 'bg-[#2AA3FF] text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {m.text}
              <div className={`text-[9px] mt-1 ${m.from === 'user' ? 'text-white/60' : 'text-gray-400'}`}>{m.time}</div>
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Searching...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-3">
        {disabled ? (
          <p className="text-[11px] text-gray-400 text-center py-2">{disabledReason}</p>
        ) : (
          <>
            <div className="flex gap-1.5 mb-2">
              <button
                onClick={() => onSend('Find candidates in the database with match over 50%')}
                disabled={busy}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-blue-50 text-[#2AA3FF] border border-blue-100 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Sparkles size={11} /> Match from database
              </button>
              <button
                disabled
                title="Coming in a later phase — see project notes"
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed"
              >
                <Globe size={11} /> Search LinkedIn
              </button>
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
                placeholder="Type a command..."
                rows={1}
                className="flex-1 resize-none px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/50 max-h-24"
              />
              <button
                onClick={submit}
                disabled={!draft.trim() || busy}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#0B1A33] text-white hover:bg-[#0B1A33]/90 disabled:opacity-40 transition-colors flex-shrink-0"
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
