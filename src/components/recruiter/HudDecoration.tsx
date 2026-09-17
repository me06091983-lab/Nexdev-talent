'use client'

import { useEffect, useMemo, useState } from 'react'

function useClock() {
  const [time, setTime] = useState<string | null>(null)
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

function RadarTicks() {
  const ticks = useMemo(() => {
    const items: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = []
    for (let i = 0; i < 72; i++) {
      const angle = (i * 5 * Math.PI) / 180
      const major = i % 6 === 0
      const r1 = 440
      const r2 = major ? 420 : 431
      items.push({
        x1: 450 + r1 * Math.cos(angle),
        y1: 450 + r1 * Math.sin(angle),
        x2: 450 + r2 * Math.cos(angle),
        y2: 450 + r2 * Math.sin(angle),
        major,
      })
    }
    return items
  }, [])

  return (
    <svg
      viewBox="0 0 900 900"
      className="deck-radar-ticks"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 900,
        height: 900,
        transform: 'translate(-50%, -50%)',
        animation: 'deck-spin 140s linear infinite',
      }}
    >
      <circle cx={450} cy={450} r={440} fill="none" stroke="rgba(52,210,255,.09)" strokeWidth={1} />
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke={t.major ? 'rgba(52,210,255,.2)' : 'rgba(52,210,255,.08)'}
          strokeWidth={1}
        />
      ))}
    </svg>
  )
}

export function HudDecoration() {
  const time = useClock()

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <RadarTicks />
      <div className="deck-sweep" />

      <div className="absolute top-5 left-5 font-mono text-[9.5px] leading-relaxed text-[#3D5570]">
        <p>NEXDEV // RECRUITER</p>
        <p className="deck-blink text-[#34D2FF]/70">● LINK ACTIVE</p>
      </div>
      <div className="absolute top-5 right-5 font-mono text-[9.5px] leading-relaxed text-[#3D5570] text-right">
        <p>{time ?? '--:--:--'}</p>
        <p>UTC OFFSET LOCAL</p>
      </div>
      <div className="absolute bottom-5 left-5 font-mono text-[9.5px] leading-relaxed text-[#3D5570]">
        <p>MODE · SOURCING</p>
      </div>
      <div className="absolute bottom-5 right-5 font-mono text-[9.5px] leading-relaxed text-[#3D5570] text-right">
        <p className="deck-blink">◆ AI ASSIST</p>
      </div>
    </div>
  )
}
