import { createClient } from '@/lib/supabase/server'
import {
  RecruiterDashboardClient,
  type DashRole,
  type DashSubmission,
} from '@/components/recruiter-dashboard/RecruiterDashboardClient'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const one = (v: any) => (Array.isArray(v) ? (v[0] ?? null) : v)

export default async function RecruiterDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.app_metadata?.role === 'admin'
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  let subsQuery = supabase
    .from('submissions')
    .select('id, status, created_at, interviews, candidate:candidates(id, first_name, last_name), role:roles(id, title, status, deleted_at, client:clients(name))')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (!isAdmin) subsQuery = subsQuery.eq('submitted_by', user?.id ?? '')

  let callsQuery = supabase.from('candidate_calls').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo)
  if (!isAdmin) callsQuery = callsQuery.eq('created_by', user?.id ?? '')

  const [{ data: rolesRaw }, { data: subsRaw }, { count: callsLast7 }] = await Promise.all([
    supabase.from('roles').select('id, title, client:clients(name)').eq('status', 'active').is('deleted_at', null),
    subsQuery,
    callsQuery,
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openRoles: DashRole[] = (rolesRaw ?? []).map((r: any) => ({ id: r.id, title: r.title, client: one(r.client)?.name ?? null }))

  const submissions: DashSubmission[] = (subsRaw ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => {
      const role = one(s.role)
      const cand = one(s.candidate)
      if (!role || role.deleted_at || !cand) return null
      return {
        id: s.id,
        status: s.status,
        createdAt: s.created_at,
        candidateId: cand.id,
        candidateName: `${cand.first_name} ${cand.last_name}`,
        roleId: role.id,
        roleTitle: role.title,
        roleActive: role.status === 'active',
        client: one(role.client)?.name ?? null,
        interviews: ((s.interviews ?? []) as { label: string; enabled: boolean; datetime: string; status: string; feedback?: string }[])
          .filter(i => i.enabled)
          .map(i => ({ label: i.label, datetime: i.datetime || null, status: i.status, feedback: i.feedback ?? '' })),
      }
    })
    .filter((s): s is DashSubmission => s !== null)

  return (
    <RecruiterDashboardClient
      scope={isAdmin ? 'team' : 'mine'}
      nowIso={now.toISOString()}
      openRoles={openRoles}
      submissions={submissions}
      callsLast7={callsLast7 ?? 0}
    />
  )
}
