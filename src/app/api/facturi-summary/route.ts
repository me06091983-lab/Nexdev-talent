import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const year = parseInt(new URL(request.url).searchParams.get('year') ?? String(new Date().getFullYear()))

  const yearStart = `${year}-01-01`
  const yearEnd   = `${year}-12-31`

  const { data, error } = await supabase
    .from('manual_invoices')
    .select('type, valoare, data_emitere, luna_efectiva, incasata_platita')
    .gte('data_emitere', yearStart)
    .lte('data_emitere', yearEnd)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    emise_total:     0,
    emise_incasate:  0,
    primite_total:   0,
    primite_platite: 0,
  }))

  for (const f of data ?? []) {
    const mn = f.luna_efectiva ?? parseInt((f.data_emitere as string).split('-')[1])
    if (mn < 1 || mn > 12) continue
    const m = months[mn - 1]
    if (f.type === 'emisa') {
      m.emise_total    += f.valoare
      if (f.incasata_platita) m.emise_incasate += f.valoare
    } else {
      m.primite_total   += f.valoare
      if (f.incasata_platita) m.primite_platite += f.valoare
    }
  }

  const ytd = {
    emise_total:     months.reduce((s, m) => s + m.emise_total, 0),
    emise_incasate:  months.reduce((s, m) => s + m.emise_incasate, 0),
    primite_total:   months.reduce((s, m) => s + m.primite_total, 0),
    primite_platite: months.reduce((s, m) => s + m.primite_platite, 0),
  }

  return NextResponse.json({ months, ytd })
}
