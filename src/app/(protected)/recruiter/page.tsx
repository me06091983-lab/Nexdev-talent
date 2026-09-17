import { createClient } from '@/lib/supabase/server'
import { RecruiterClient, type RecruiterRole } from '@/components/recruiter/RecruiterClient'

export default async function RecruiterPage() {
  const supabase = await createClient()

  const { data: rolesRaw } = await supabase
    .from('roles')
    .select('id, title, status, deadline, created_at, client:clients(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles: RecruiterRole[] = (rolesRaw ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    deadline: r.deadline,
    client: Array.isArray(r.client) ? (r.client[0] ?? null) : r.client,
  }))

  return (
    <div className="h-screen -m-8">
      <RecruiterClient roles={roles} />
    </div>
  )
}
