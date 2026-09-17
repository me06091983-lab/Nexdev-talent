'use client'

import { useEffect, useState } from 'react'

interface Star {
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

export function AuroraBackground() {
  // Generated client-side only, after mount — Math.random() would differ
  // between the server-rendered and client-hydrated pass otherwise.
  const [stars, setStars] = useState<Star[] | null>(null)

  useEffect(() => {
    // One-time mount seed (client-only, see comment above) — not a cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStars(
      Array.from({ length: 50 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.6 + 0.6,
        delay: Math.random() * 4,
        duration: 2.5 + Math.random() * 3,
      }))
    )
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="aurora-blob one" />
      <div className="aurora-blob two" />
      <div className="aurora-blob three" />
      <div className="aurora-blob four" />
      {stars?.map((s, i) => (
        <span
          key={i}
          className="deck-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
