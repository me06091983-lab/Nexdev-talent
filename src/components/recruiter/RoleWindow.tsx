'use client'

import { useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import { Minus, X, Maximize2, Minimize2 } from 'lucide-react'
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

function RoleWindowInner({
  role,
  onMinimize,
  onClose,
  onFocus,
  defaultRect,
  maximizeRect,
  zIndex,
  ...workspaceProps
}: {
  role: RecruiterRole
  onMinimize: () => void
  onClose: () => void
  onFocus: () => void
  defaultRect: WindowRect
  maximizeRect: WindowRect
  zIndex: number
} & Omit<ComponentProps<typeof RoleWorkspace>, 'role'>) {
  const [rect, setRect] = usePersistentState<WindowRect>(`recruiter-window-${role.id}`, defaultRect)
  const [maximized, setMaximized] = useState(false)
  const effectiveRect = maximized ? maximizeRect : rect

  return (
    <Rnd
      position={{ x: effectiveRect.x, y: effectiveRect.y }}
      size={{ width: effectiveRect.width, height: effectiveRect.height }}
      onDragStop={(_e, d) => !maximized && setRect(r => ({ ...r, x: d.x, y: d.y }))}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        !maximized &&
        setRect({ x: pos.x, y: pos.y, width: parseInt(ref.style.width, 10), height: parseInt(ref.style.height, 10) })
      }
      disableDragging={maximized}
      enableResizing={!maximized}
      bounds="parent"
      dragHandleClassName="window-drag-handle"
      minWidth={520}
      minHeight={420}
      style={{
        display: 'flex',
        flexDirection: 'column',
        zIndex,
        pointerEvents: 'auto',
        boxShadow: '0 40px 110px rgba(0,0,0,.55)',
      }}
      className="window-panel rounded-[28px] overflow-hidden flex flex-col"
      onMouseDown={onFocus}
      resizeHandleComponent={{ bottomRight: <div className="resize-grip" /> }}
    >
      <div className="window-drag-handle flex-none flex items-center gap-2 px-4 py-2.5 border-b border-white/10 cursor-grab active:cursor-grabbing select-none">
        <span className="text-[12.5px] font-semibold text-white truncate flex-1">{role.title}</span>
        <button
          onClick={() => setMaximized(v => !v)}
          title={maximized ? 'Restore' : 'Maximize'}
          className="w-6 h-6 rounded-md flex items-center justify-center text-[#9FB6D6] hover:bg-white/10 hover:text-white transition-colors"
        >
          {maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
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
  )
}

export function RoleWindow({
  visible,
  ...props
}: {
  visible: boolean
} & Omit<ComponentProps<typeof RoleWindowInner>, 'defaultRect' | 'maximizeRect'>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div hidden={!visible} ref={containerRef} className="absolute inset-0 pointer-events-none">
      {size && (
        <RoleWindowInner
          {...props}
          defaultRect={{ x: 24, y: 24, width: Math.max(560, size.w - 48), height: Math.max(440, size.h - 48) }}
          maximizeRect={{ x: 4, y: 4, width: size.w - 8, height: size.h - 8 }}
        />
      )}
    </div>
  )
}
