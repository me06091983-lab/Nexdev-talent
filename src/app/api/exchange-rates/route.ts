import { NextResponse } from 'next/server'

export const revalidate = 3600 // reîmprospătează cursul o dată pe oră

export async function GET() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?base=EUR&symbols=USD,GBP,RON', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error('Frankfurter error')
    const data = await res.json()
    // data.rates = { USD: 1.13, GBP: 0.84, RON: 4.98 }
    return NextResponse.json(data.rates)
  } catch {
    // fallback dacă API-ul e indisponibil
    return NextResponse.json({ USD: 1.10, GBP: 0.85, RON: 4.97 })
  }
}
