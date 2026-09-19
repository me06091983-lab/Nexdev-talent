import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; callId: string }> }) {
  const { id, callId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: call } = await supabase
    .from('candidate_calls')
    .select('id, created_by')
    .eq('id', callId)
    .eq('candidate_id', id)
    .maybeSingle()
  if (!call) return NextResponse.json({ error: 'Call not found.' }, { status: 404 })

  if (call.created_by !== user.id && user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'You can only delete calls you added.' }, { status: 403 })
  }

  const { error } = await supabase.from('candidate_calls').delete().eq('id', callId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
