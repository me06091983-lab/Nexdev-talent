import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const url = new URL(request.url)
  const year  = parseInt(url.searchParams.get('year')  ?? String(new Date().getFullYear()))
  const month = parseInt(url.searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const all   = url.searchParams.get('all') === 'true'

  let query = supabase
    .from('manual_invoices')
    .select('id, type, valoare, tva_valoare, valuta, data_emitere, data_scadenta, incasata_platita, data_incasare_plata, numar_factura, client_id, contract_id, luna_efectiva, notes')

  if (all) {
    query = query
      .order('luna_efectiva', { ascending: true, nullsFirst: false })
      .order('data_emitere',  { ascending: true })
  } else {
    const monthStr       = String(month).padStart(2, '0')
    const monthStart     = `${year}-${monthStr}-01`
    const ny = month === 12 ? year + 1 : year
    const nm = month === 12 ? 1 : month + 1
    const nextMonthStart = `${ny}-${String(nm).padStart(2, '0')}-01`
    query = query
      .gte('data_emitere', monthStart)
      .lt('data_emitere',  nextMonthStart)
      .order('data_emitere', { ascending: false })
  }

  const { data: facturi, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with names
  const clientIds   = [...new Set((facturi ?? []).filter(f => f.client_id).map(f => f.client_id as string))]
  const contractIds = [...new Set((facturi ?? []).filter(f => f.contract_id).map(f => f.contract_id as string))]

  const [{ data: clientsData }, { data: contractsData }] = await Promise.all([
    clientIds.length > 0
      ? supabase.from('clients').select('id, name').in('id', clientIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    contractIds.length > 0
      ? supabase.from('contracts').select('id, candidate:candidates!candidate_id(id, first_name, last_name)').in('id', contractIds)
      : Promise.resolve({ data: [] as { id: string; candidate: unknown }[] }),
  ])

  const clientMap: Record<string, string> = {}
  for (const c of clientsData ?? []) clientMap[c.id] = c.name

  const contractCandMap: Record<string, string> = {}
  for (const c of contractsData ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cand: any = Array.isArray(c.candidate) ? c.candidate[0] : c.candidate
    if (cand) contractCandMap[c.id] = `${cand.first_name} ${cand.last_name}`
  }

  const enriched = (facturi ?? []).map(f => ({
    ...f,
    client_name:    f.client_id   ? (clientMap[f.client_id]         ?? null) : null,
    candidate_name: f.contract_id ? (contractCandMap[f.contract_id] ?? null) : null,
  }))

  // Active contracts for dropdowns (primite + emise)
  const today = new Date().toISOString().split('T')[0]
  const { data: activeContracts } = await supabase
    .from('contracts')
    .select('id, currency, role:roles!role_id(client_id), candidate:candidates!candidate_id(id, first_name, last_name)')
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .not('candidate_id', 'is', null)
    .order('start_date', { ascending: false })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsedContracts = (activeContracts ?? []).reduce<{ id: string; currency: string; candidate_name: string; client_id: string | null }[]>((acc, c: any) => {
    const cand = Array.isArray(c.candidate) ? c.candidate[0] : c.candidate
    if (!cand) return acc
    const role = Array.isArray(c.role) ? c.role[0] : c.role
    acc.push({
      id: c.id as string,
      currency: (c.currency ?? 'EUR') as string,
      candidate_name: `${cand.first_name} ${cand.last_name}`,
      client_id: role?.client_id ?? null,
    })
    return acc
  }, [])

  return NextResponse.json({
    facturi: enriched,
    activeContracts: parsedContracts,
    clients: clients ?? [],
  })
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('manual_invoices')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
