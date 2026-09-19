import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parseAgendaInput, AGENDA_SELECT } from '@/lib/agenda'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('recruiter_agenda_items')
    .select(AGENDA_SELECT)
    .eq('user_id', user.id)
    .order('item_date', { ascending: true, nullsFirst: false })
    .order('start_time', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseAgendaInput(await request.json(), true)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await supabase
    .from('recruiter_agenda_items')
    .insert({ ...parsed.value, user_id: user.id })
    .select(AGENDA_SELECT)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
