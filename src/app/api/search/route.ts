import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ candidates: [], roles: [], contracts: [] })

  const supabase = await createClient()
  const like = `%${q}%`

  const [candidatesRes, rolesRes, contractsRes] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, first_name, last_name, email, candidate_status, profile:profiles(name)')
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
      .is('deleted_at', null)
      .limit(5),
    supabase
      .from('roles')
      .select('id, title, status, client:clients(name)')
      .or(`title.ilike.${like},fieldglass_id.ilike.${like}`)
      .is('deleted_at', null)
      .limit(5),
    supabase
      .from('contracts')
      .select('id, status, candidate:candidates(first_name, last_name), role:roles(title)')
      .or(`status.ilike.${like}`)
      .is('deleted_at', null)
      .limit(3),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates = (candidatesRes.data ?? []).map((c: any) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`,
    email: c.email,
    status: c.candidate_status,
    profile: c.profile?.name ?? null,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles = (rolesRes.data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    client: Array.isArray(r.client) ? r.client[0]?.name : r.client?.name,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts = (contractsRes.data ?? []).map((c: any) => {
    const cand = Array.isArray(c.candidate) ? c.candidate[0] : c.candidate
    const role = Array.isArray(c.role) ? c.role[0] : c.role
    return { id: c.id, candidateName: cand ? `${cand.first_name} ${cand.last_name}` : '—', roleTitle: role?.title ?? '—', status: c.status }
  })

  return NextResponse.json({ candidates, roles, contracts })
}
