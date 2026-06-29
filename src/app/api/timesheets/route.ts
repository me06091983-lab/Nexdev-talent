import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const year = parseInt(new URL(request.url).searchParams.get('year') ?? String(new Date().getFullYear()))

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  // Contracts active in this year — partner_id / partner_id_2 fetched as plain columns
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select(`
      id, candidate_id, role_id, bill_rate, pay_rate, rate_type, currency, start_date, end_date,
      partner_commission, partner_commission_type, partner_commission_2, partner_commission_2_type,
      partner_id, partner_id_2,
      candidate:candidates!candidate_id(id, first_name, last_name, company_tva, profile:profiles(name)),
      role:roles!role_id(id, title, client:clients(name))
    `)
    .lte('start_date', yearEnd)
    .or(`end_date.is.null,end_date.gte.${yearStart}`)
    .not('candidate_id', 'is', null)
    .order('start_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!contracts?.length) return NextResponse.json({ rows: [] })

  // Collect all unique partner IDs from both commission slots
  const partnerIds = new Set<string>()
  for (const c of contracts) {
    if (c.partner_id)   partnerIds.add(c.partner_id)
    if (c.partner_id_2) partnerIds.add(c.partner_id_2)
  }

  // Fetch partner names in one query
  const partnerMap: Record<string, string> = {}
  if (partnerIds.size > 0) {
    const { data: partners } = await supabase
      .from('partners')
      .select('id, name')
      .in('id', Array.from(partnerIds))
    for (const p of partners ?? []) {
      partnerMap[p.id] = p.name
    }
  }

  const contractIds = contracts.map(c => c.id)

  const { data: entries } = await supabase
    .from('timesheets')
    .select('contract_id, month, hours')
    .in('contract_id', contractIds)
    .eq('year', year)

  const hoursMap: Record<string, Record<number, number>> = {}
  for (const e of entries ?? []) {
    if (!hoursMap[e.contract_id]) hoursMap[e.contract_id] = {}
    hoursMap[e.contract_id][e.month] = Number(e.hours)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = contracts.map((c: any) => {
    const cand = Array.isArray(c.candidate) ? c.candidate[0] : c.candidate
    const role = Array.isArray(c.role) ? c.role[0] : c.role
    const profile = cand ? (Array.isArray(cand.profile) ? cand.profile[0] : cand.profile) : null
    const client = role ? (Array.isArray(role.client) ? role.client[0] : role.client) : null

    return {
      contract_id: c.id,
      candidate_id: c.candidate_id,
      candidate_name: cand ? `${cand.first_name} ${cand.last_name}` : '—',
      candidate_tva: cand?.company_tva ?? false,
      profile_name: profile?.name ?? '',
      role_title: role?.title ?? null,
      client_name: client?.name ?? null,
      bill_rate: c.bill_rate,
      pay_rate: c.pay_rate,
      rate_type: c.rate_type ?? 'daily',
      currency: c.currency ?? 'EUR',
      start_date: c.start_date,
      end_date: c.end_date ?? null,
      partner_commission:        c.partner_commission        ?? 0,
      partner_commission_type:   c.partner_commission_type   ?? 'hourly',
      partner_commission_2:      c.partner_commission_2      ?? 0,
      partner_commission_2_type: c.partner_commission_2_type ?? 'hourly',
      partner_id:     c.partner_id   ?? null,
      partner_name:   c.partner_id   ? (partnerMap[c.partner_id]   ?? null) : null,
      partner_id_2:   c.partner_id_2 ?? null,
      partner_name_2: c.partner_id_2 ? (partnerMap[c.partner_id_2] ?? null) : null,
      hours: hoursMap[c.id] ?? {},
    }
  })

  return NextResponse.json({ rows })
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient()
  const { contract_id, candidate_id, year, month, hours } = await request.json()

  if (!contract_id || !year || !month) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('timesheets')
    .upsert(
      { contract_id, candidate_id, year, month, hours: Number(hours) || 0, updated_at: new Date().toISOString() },
      { onConflict: 'contract_id,year,month' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
