import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
      status,
      created_at,
      updated_at,
      role:roles (
        id,
        title,
        client:clients ( name )
      ),
      stage_history (
        stage_name,
        result,
        feedback,
        created_at
      )
    `)
    .eq('candidate_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = (data ?? []).map((s: any) => {
    const role = Array.isArray(s.role) ? s.role[0] : s.role
    const client = role ? (Array.isArray(role.client) ? role.client[0] : role.client) : null

    const history: { stage_name: string; result: string | null; feedback: string | null; created_at: string }[] =
      Array.isArray(s.stage_history) ? s.stage_history : []

    // Find rejection reason: last stage with result 'rejected' or 'fail', or last feedback entry
    const rejectionEntry = history
      .filter(h => h.result === 'rejected' || h.result === 'fail' || h.result === 'respins')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    const lastFeedback = history
      .filter(h => h.feedback)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    return {
      id: s.id,
      status: s.status,
      created_at: s.created_at,
      updated_at: s.updated_at,
      role: role ? { id: role.id, title: role.title, client } : null,
      rejection_reason: rejectionEntry?.feedback ?? null,
      last_feedback: lastFeedback?.feedback ?? null,
      stage_history: history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }
  })

  return NextResponse.json(entries)
}
