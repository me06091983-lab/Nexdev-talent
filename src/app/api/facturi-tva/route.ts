import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const year = parseInt(new URL(request.url).searchParams.get('year') ?? String(new Date().getFullYear()))

  const { data, error } = await supabase
    .from('manual_invoices')
    .select('type, tva_valoare, data_emitere, luna_efectiva, incasata_platita, data_incasare_plata')
    .eq('incasata_platita', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    tva_incasat: 0,
    tva_platit:  0,
  }))

  for (const f of data ?? []) {
    const tva = f.tva_valoare ?? 0
    if (tva === 0) continue  // skip invoices with no TVA recorded

    let mn: number
    if (f.data_incasare_plata) {
      const d = new Date(f.data_incasare_plata)
      if (d.getFullYear() !== year) continue
      mn = d.getMonth() + 1
    } else {
      const ref = f.data_emitere as string | null
      if (!ref) continue
      const refYear = parseInt(ref.split('-')[0])
      if (refYear !== year) continue
      mn = f.luna_efectiva ?? parseInt(ref.split('-')[1] ?? '')
    }

    if (!mn || isNaN(mn) || mn < 1 || mn > 12) continue

    if (f.type === 'emisa') {
      months[mn - 1].tva_incasat += tva
    } else {
      months[mn - 1].tva_platit += tva
    }
  }

  const result = months.map(m => ({
    month:        m.month,
    tva_incasat: Math.round(m.tva_incasat * 100) / 100,
    tva_platit:  Math.round(m.tva_platit  * 100) / 100,
    diferenta:   Math.round((m.tva_incasat - m.tva_platit) * 100) / 100,
  }))

  const totals = {
    tva_incasat: Math.round(result.reduce((s, m) => s + m.tva_incasat, 0) * 100) / 100,
    tva_platit:  Math.round(result.reduce((s, m) => s + m.tva_platit,  0) * 100) / 100,
    diferenta:   Math.round(result.reduce((s, m) => s + m.diferenta,   0) * 100) / 100,
  }

  return NextResponse.json({ months: result, totals })
}
