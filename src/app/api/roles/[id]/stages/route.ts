import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('role_stages')
    .select('*')
    .eq('role_id', id)
    .order('order_index')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { name } = await request.json()

  const { data: existing } = await supabase
    .from('role_stages')
    .select('order_index')
    .eq('role_id', id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1

  const { data, error } = await supabase
    .from('role_stages')
    .insert({ role_id: id, name: name.trim(), order_index: nextIndex })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { stage_id, order_index } = await request.json()
  if (!stage_id) return NextResponse.json({ error: 'stage_id lipsă' }, { status: 400 })

  const { error } = await supabase
    .from('role_stages')
    .update({ order_index })
    .eq('id', stage_id)
    .eq('role_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const url = new URL(request.url)
  const stageId = url.searchParams.get('stage_id')
  if (!stageId) return NextResponse.json({ error: 'stage_id lipsă' }, { status: 400 })

  const { error } = await supabase
    .from('role_stages')
    .delete()
    .eq('id', stageId)
    .eq('role_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
