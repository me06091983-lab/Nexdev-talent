import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parseAgendaInput, AGENDA_SELECT } from '@/lib/agenda'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: current } = await supabase
    .from('recruiter_agenda_items')
    .select(AGENDA_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = parseAgendaInput({ ...current, ...(await request.json()) }, false)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await supabase
    .from('recruiter_agenda_items')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select(AGENDA_SELECT)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error, count } = await supabase
    .from('recruiter_agenda_items')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
