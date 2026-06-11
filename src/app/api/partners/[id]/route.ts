import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('partners').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { first_name, last_name, phone, contact_email, name, company_cui, bank_account, company_country, commission_terms } = body

  if (!last_name) return NextResponse.json({ error: 'Numele este obligatoriu.' }, { status: 400 })

  const { data, error } = await supabase
    .from('partners')
    .update({
      first_name: first_name?.trim() || null,
      last_name: last_name.trim(),
      phone: phone?.trim() || null,
      contact_email: contact_email?.trim() || null,
      name: name?.trim() || null,
      company_cui: company_cui?.trim() || null,
      bank_account: bank_account?.trim() || null,
      company_country: company_country?.trim() || null,
      commission_terms: commission_terms?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('partners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
