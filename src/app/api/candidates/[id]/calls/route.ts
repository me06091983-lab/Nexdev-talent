import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('candidate_calls')
    .select('id, call_date, notes, created_by, created_by_email, created_at, role:roles(id, title)')
    .eq('candidate_id', id)
    .order('call_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json((data ?? []).map((c: any) => ({ ...c, role: Array.isArray(c.role) ? (c.role[0] ?? null) : c.role })))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { call_date, notes, role_id } = await request.json()
  if (!call_date || !/^\d{4}-\d{2}-\d{2}$/.test(call_date)) {
    return NextResponse.json({ error: 'Call date is required.' }, { status: 400 })
  }
  if (!notes || !String(notes).trim()) {
    return NextResponse.json({ error: 'Notes are required.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('candidate_calls')
    .insert({
      candidate_id: id,
      role_id: role_id ?? null,
      call_date,
      notes: String(notes).trim(),
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id, call_date, notes, created_by, created_by_email, created_at, role:roles(id, title)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, role: Array.isArray(data.role) ? (data.role[0] ?? null) : data.role }, { status: 201 })
}
