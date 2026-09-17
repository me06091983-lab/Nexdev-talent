'use client'

import { Rnd } from 'react-rnd'
import { Minus, X } from 'lucide-react'
import { usePersistentState } from '@/lib/usePersistentState'
import { RoleWorkspace } from './RoleWorkspace'
import type { ComponentProps } from 'react'
import type { RecruiterRole } from './RecruiterClient'

interface WindowRect {
  x: number
  y: number
  width: number
  height: number
}

export function RoleWindow({
  role,
  visible,
  onMinimize,
  onClose,
  onFocus,
  ...workspaceProps
}: {
  role: RecruiterRole
  visible: boolean
  onMinimize: () => void
  onClose: () => void
  onFocus: () => void
} & Omit<ComponentProps<typeof RoleWorkspace>, 'role'>) {
  const [rect, setRect] = usePersistentState<WindowRect>(`recruiter-window-${role.id}`, {
    x: 60,
    y: 40,
    width: 1040,
    height: 700,
  })

  return (
    <div hidden={!visible} className="absolute inset-0 pointer-events-none">
      <Rnd
        position={{ x: rect.x, y: rect.y }}
        size={{ width: rect.width, height: rect.height }}
        onDragStop={(_e, d) => setRect(r => ({ ...r, x: d.x, y: d.y }))}
        onResizeStop={(_e, _dir, ref, _delta, pos) =>
          setRect({ x: pos.x, y: pos.y, width: parseInt(ref.style.width, 10), height: parseInt(ref.style.height, 10) })
        }
        bounds="parent"
        dragHandleClassName="window-drag-handle"
        minWidth={520}
        minHeight={420}
        style={{ zIndex: 30, pointerEvents: 'auto', boxShadow: '0 40px 110px rgba(0,0,0,.55)' }}
        className="deck-panel rounded-[28px] overflow-hidden flex flex-col"
        onMouseDown={onFocus}
      >
        <div className="window-drag-handle flex-none flex items-center gap-2 px-4 py-2.5 border-b border-white/10 cursor-grab active:cursor-grabbing select-none">
          <span className="text-[12.5px] font-semibold text-white truncate flex-1">{role.title}</span>
          <button
            onClick={onMinimize}
            title="Minimize"
            className="w-6 h-6 rounded-md flex items-center justify-center text-[#9FB6D6] hover:bg-white/10 hover:text-white transition-colors"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="w-6 h-6 rounded-md flex items-center justify-center text-[#9FB6D6] hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <RoleWorkspace role={role} {...workspaceProps} />
        </div>
      </Rnd>
    </div>
  )
}
