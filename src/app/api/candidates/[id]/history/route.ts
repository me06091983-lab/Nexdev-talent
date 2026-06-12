import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id, status, feedback, created_at, updated_at,
      role:roles(id, title, status, client:clients(name))
    `)
    .eq('candidate_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = (data ?? []).map((s: any) => {
    const role = Array.isArray(s.role) ? s.role[0] : s.role
    const client = role ? (Array.isArray(role.client) ? role.client[0] : role.client) : null
    return { ...s, role: role ? { ...role, client } : null }
  })

  return NextResponse.json(entries)
}
