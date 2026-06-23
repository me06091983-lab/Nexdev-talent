import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PipelineRadarClient } from '@/components/pipeline/PipelineRadarClient'
import type { RadarSubmission } from '@/components/pipeline/PipelineRadarClient'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: rawSubs } = await supabase
    .from('submissions')
    .select(`
      id, status, ai_score, ai_summary, rubix_fit, interviews, updated_at, role_id,
      candidate:candidates(id, first_name, last_name, phone, email, profile:profiles(name)),
      role:roles(id, title, status, client:clients(name))
    `)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  // Filter to active/on_hold roles only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submissions: RadarSubmission[] = (rawSubs ?? []).filter((s: any) => {
    const roleStatus = Array.isArray(s.role) ? s.role[0]?.status : s.role?.status
    return roleStatus === 'active'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }).map((s: any) => {
    const role = Array.isArray(s.role) ? s.role[0] : s.role
    const candidate = Array.isArray(s.candidate) ? s.candidate[0] : s.candidate
    return {
      id: s.id,
      status: s.status,
      ai_score: s.ai_score ?? null,
      ai_summary: s.ai_summary ?? null,
      rubix_fit: s.rubix_fit ?? null,
      interviews: s.interviews ?? [],
      updated_at: s.updated_at,
      role_id: s.role_id,
      candidate: candidate
        ? {
            id: candidate.id,
            first_name: candidate.first_name,
            last_name: candidate.last_name,
            phone: candidate.phone ?? null,
            email: candidate.email ?? null,
            profile: Array.isArray(candidate.profile)
              ? (candidate.profile[0] ?? null)
              : (candidate.profile ?? null),
          }
        : null,
      role: role
        ? {
            id: role.id,
            title: role.title,
            client: Array.isArray(role.client)
              ? (role.client[0] ?? null)
              : (role.client ?? null),
          }
        : null,
    }
  })

  const activeCount = submissions.length
  const roleCount = new Set(submissions.map(s => s.role_id)).size

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1A33]">Radar</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {activeCount} active candidates in {roleCount} open {roleCount === 1 ? 'role' : 'roles'}
          </p>
        </div>
        <Link
          href="/roles"
          className="text-sm text-gray-400 hover:text-[#2AA3FF] transition-colors"
        >
          View all roles →
        </Link>
      </div>

      {submissions.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-gray-400 mb-2">No candidates in the pipeline at the moment.</p>
          <p className="text-sm text-gray-300">
            Add candidates to an active role from the{' '}
            <Link href="/roles" className="text-[#2AA3FF] hover:underline">Roles</Link> section.
          </p>
        </div>
      ) : (
        <PipelineRadarClient submissions={submissions} />
      )}
    </div>
  )
}
