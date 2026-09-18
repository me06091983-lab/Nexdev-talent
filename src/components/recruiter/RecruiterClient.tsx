'use client'

import { useEffect, useRef, useState } from 'react'
import { MindMapField } from './MindMapField'
import { RoleWindow } from './RoleWindow'
import { Dock } from './Dock'
import { HudDecoration } from './HudDecoration'
import { AuroraBackground } from './AuroraBackground'

export interface RecruiterRole {
  id: string
  title: string
  status: string
  deadline: string | null
  client: { name: string } | null
}

const OPEN_STATUSES = new Set(['draft', 'active', 'on_hold'])

export function RecruiterClient({ roles }: { roles: RecruiterRole[] }) {
  const [openRoles, setOpenRoles] = useState<string[]>([])
  const [minimizedRoleIds, setMinimizedRoleIds] = useState<Set<string>>(new Set())
  const [zIndices, setZIndices] = useState<Record<string, number>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const zCounter = useRef(30)
  const lastFocusedRef = useRef<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => setCurrentUserId(data?.id ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const top = lastFocusedRef.current
      if (top) minimizeRole(top)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function bringToFront(id: string) {
    zCounter.current += 1
    lastFocusedRef.current = id
    setZIndices(prev => ({ ...prev, [id]: zCounter.current }))
  }

  function openRole(id: string) {
    setOpenRoles(prev => (prev.includes(id) ? prev : [...prev, id]))
    setMinimizedRoleIds(prev => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    bringToFront(id)
  }

  function closeRole(id: string) {
    setOpenRoles(prev => prev.filter(x => x !== id))
    setMinimizedRoleIds(prev => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function minimizeRole(id: string) {
    setMinimizedRoleIds(prev => new Set(prev).add(id))
  }

  const minimizedRoles = openRoles
    .filter(id => minimizedRoleIds.has(id))
    .map(id => roles.find(r => r.id === id))
    .filter((r): r is RecruiterRole => !!r)

  return (
    <div className="h-full deck-bg relative overflow-hidden">
      <AuroraBackground />
      <HudDecoration />

      <div className="relative h-full">
        <MindMapField roles={roles} onOpenRole={openRole} />
      </div>

      {openRoles.map(id => {
        const role = roles.find(r => r.id === id)
        if (!role) return null
        return (
          <RoleWindow
            key={id}
            role={role}
            visible={!minimizedRoleIds.has(id)}
            zIndex={zIndices[id] ?? 30}
            onMinimize={() => minimizeRole(id)}
            onClose={() => closeRole(id)}
            onFocus={() => bringToFront(id)}
            isClosed={!OPEN_STATUSES.has(role.status)}
            currentUserId={currentUserId}
          />
        )
      })}

      <Dock items={minimizedRoles} onRestore={openRole} />
    </div>
  )
}
