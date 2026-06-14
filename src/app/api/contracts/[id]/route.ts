import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  await supabase.from('timesheets').delete().eq('contract_id', id)
  await supabase.from('contract_history').delete().eq('contract_id', id)

  const { error } = await supabase.from('contracts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const {
    start_date, end_date, pay_rate, bill_rate, rate_type, currency,
    partner_commission, partner_commission_type, partner_id,
    partner_commission_2, partner_commission_2_type, partner_id_2,
    notes,
  } = body

  // Fetch current values to detect changes for history
  const { data: current } = await supabase
    .from('contracts')
    .select('end_date, pay_rate, bill_rate')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('contracts')
    .update({
      start_date,
      end_date: end_date || null,
      pay_rate: Number(pay_rate),
      bill_rate: Number(bill_rate),
      rate_type: rate_type ?? 'daily',
      currency: currency ?? 'EUR',
      partner_commission: partner_commission ? Number(partner_commission) : null,
      partner_commission_type: partner_commission_type ?? 'hourly',
      partner_id: partner_id || null,
      partner_commission_2: partner_commission_2 ? Number(partner_commission_2) : null,
      partner_commission_2_type: partner_commission_2_type ?? 'hourly',
      partner_id_2: partner_id_2 || null,
      notes: notes?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Save history if relevant fields changed
  if (current) {
    const changes: Record<string, unknown> = {}
    const newEndDate = end_date || null
    const oldEndDate = current.end_date || null

    if (newEndDate !== oldEndDate) {
      changes.end_date = { from: oldEndDate, to: newEndDate }
    }

    const newPay = Number(pay_rate)
    const oldPay = Number(current.pay_rate)
    if (newPay !== oldPay) {
      const pct = oldPay ? Math.round(((newPay - oldPay) / oldPay) * 1000) / 10 : 0
      changes.pay_rate = { from: oldPay, to: newPay, pct }
    }

    const newBill = Number(bill_rate)
    const oldBill = Number(current.bill_rate)
    if (newBill !== oldBill) {
      const pct = oldBill ? Math.round(((newBill - oldBill) / oldBill) * 1000) / 10 : 0
      changes.bill_rate = { from: oldBill, to: newBill, pct }
    }

    if (Object.keys(changes).length > 0) {
      await supabase.from('contract_history').insert({
        contract_id: id,
        end_date: data.end_date,
        pay_rate: Number(data.pay_rate),
        bill_rate: Number(data.bill_rate),
        changes,
      })
    }
  }

  return NextResponse.json(data)
}

// Schimbare status contract (activ → terminat)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { contract_status, termination_reason } = await request.json()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('contracts')
    .update({
      contract_status,
      termination_reason: termination_reason?.trim() || null,
      // La terminare manuală, data de final devine ziua de azi
      ...(contract_status === 'terminat' ? { end_date: today } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Actualizează statusul candidatului
  if (data?.candidate_id && contract_status === 'terminat') {
    const { data: activeContracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('candidate_id', data.candidate_id)
      .eq('contract_status', 'activ')

    if (!activeContracts?.length) {
      await supabase
        .from('candidates')
        .update({ candidate_status: 'pasiv' })
        .eq('id', data.candidate_id)
        .eq('candidate_status', 'angajat')
    }
  }

  return NextResponse.json(data)
}
