'use client'

import { useEffect, useState } from 'react'

/**
 * Like useState, but backed by localStorage. Always starts from `initial`
 * (even on the client) to avoid an SSR/hydration mismatch, then swaps in
 * the persisted value right after mount.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(initial)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      // One-time mount hydration from localStorage — a single extra render, not a cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState(JSON.parse(raw) as T)
    } catch {}
    setHydrated(true)
  }, [key])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }, [key, state, hydrated])

  return [state, setState, hydrated]
}
