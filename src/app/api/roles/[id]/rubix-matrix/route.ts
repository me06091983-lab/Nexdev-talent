import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('role_rubix_criteria')
    .select('*')
    .eq('role_id', id)
    .order('order_index')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { criteria } = await req.json()
  const supabase = await createClient()

  await supabase.from('role_rubix_criteria').delete().eq('role_id', id)

  if (criteria?.length) {
    const rows = criteria.map((c: { criterion: string; weight: number }, i: number) => ({
      role_id: id,
      order_index: i,
      criterion: c.criterion,
      weight: c.weight,
    }))

    const { error } = await supabase.from('role_rubix_criteria').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = await supabase
    .from('role_rubix_criteria')
    .select('*')
    .eq('role_id', id)
    .order('order_index')

  return NextResponse.json(data ?? [])
}
