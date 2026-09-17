'use client'

import { useEffect, useState } from 'react'

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

export function HudDecoration() {
  const time = useClock()

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute top-5 left-5 font-mono text-[9.5px] leading-relaxed text-[#7c7594]">
        <p>NEXDEV // RECRUITER</p>
        <p className="deck-blink text-[#c084fc]/80">● LINK ACTIVE</p>
      </div>
      <div className="absolute top-5 right-5 font-mono text-[9.5px] leading-relaxed text-[#7c7594] text-right">
        <p>{time ?? '--:--:--'}</p>
        <p>UTC OFFSET LOCAL</p>
      </div>
      <div className="absolute bottom-5 left-5 font-mono text-[9.5px] leading-relaxed text-[#7c7594]">
        <p>MODE · SOURCING</p>
      </div>
      <div className="absolute bottom-5 right-5 font-mono text-[9.5px] leading-relaxed text-[#7c7594] text-right">
        <p className="deck-blink">◆ AI ASSIST</p>
      </div>
    </div>
  )
}
