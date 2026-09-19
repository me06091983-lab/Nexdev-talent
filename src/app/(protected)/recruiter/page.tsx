import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RecruiterClient, type RecruiterRole } from '@/components/recruiter/RecruiterClient'

export default async function RecruiterPage({ searchParams }: { searchParams: Promise<{ role?: string; assess?: string }> }) {
  const { role: roleParam, assess } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.app_metadata?.role === 'admin'

  const [{ data: rolesRaw }, { data: mySubs }] = await Promise.all([
    supabase
      .from('roles')
      .select('id, title, status, deadline, description, seniority, location, collaboration_type, fieldglass_id, recruiter_rate, recruiter_rate_currency, recruiter_rate_type, client:clients(id, name), role_skills(skill_type, skill:skills(id, name))')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    isAdmin
      ? supabase.from('submissions').select('role_id').is('deleted_at', null)
      : user
        ? supabase.from('submissions').select('role_id').eq('submitted_by', user.id).is('deleted_at', null)
        : Promise.resolve({ data: [] as { role_id: string }[] }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles: RecruiterRole[] = (rolesRaw ?? []).map((r: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skillsOf = (type: string) => (r.role_skills ?? []).filter((rs: any) => rs.skill_type === type && rs.skill).map((rs: any) => rs.skill)
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      deadline: r.deadline,
      description: r.description,
      seniority: r.seniority,
      location: r.location,
      collaboration_type: r.collaboration_type,
      fieldglass_id: r.fieldglass_id,
      recruiter_rate: r.recruiter_rate,
      recruiter_rate_currency: r.recruiter_rate_currency,
      recruiter_rate_type: r.recruiter_rate_type,
      client: Array.isArray(r.client) ? (r.client[0] ?? null) : r.client,
      required_skills: skillsOf('required'),
      preferred_skills: skillsOf('preferred'),
    }
  })

  const myCounts: Record<string, number> = {}
  for (const s of mySubs ?? []) myCounts[s.role_id] = (myCounts[s.role_id] ?? 0) + 1

  const recruiterNames: Record<string, string> = {}
  if (isAdmin) {
    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 })
    for (const u of data?.users ?? []) {
      const name = [u.user_metadata?.first_name, u.user_metadata?.last_name].filter(Boolean).join(' ').trim()
      recruiterNames[u.id] = name || u.email || 'Unknown'
    }
  }

  return (
    <RecruiterClient
      roles={roles}
      myCounts={myCounts}
      currentUserId={user?.id ?? null}
      initialRoleId={roleParam ?? null}
      assessSubmissionId={assess ?? null}
      isAdmin={isAdmin}
      recruiterNames={recruiterNames}
    />
  )
}
