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

  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', id)

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
      partner_commission_type: partner_commission_type ?? 'monthly',
      partner_id: partner_id || null,
      partner_commission_2: partner_commission_2 ? Number(partner_commission_2) : null,
      partner_commission_2_type: partner_commission_2_type ?? 'monthly',
      partner_id_2: partner_id_2 || null,
      notes: notes?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
