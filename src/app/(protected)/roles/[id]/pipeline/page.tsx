import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RolePipelineClient } from '@/components/pipeline/RolePipelineClient'
import type { Submission } from '@/components/pipeline/KanbanBoard'
import type { PartnerOption } from '@/components/pipeline/ContractModal'

export default async function RolePipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: role }, { data: subs }, { data: rawPartners }] = await Promise.all([
    supabase
      .from('roles')
      .select('id, title, rate, rate_currency, rate_type, client:clients(name)')
      .eq('id', id)
      .single(),
    supabase
      .from('submissions')
      .select(`
        id, status, ai_score, ai_summary, role_id, interviews,
        contract:contracts(id),
        candidate:candidates(
          id, first_name, last_name, seniority,
          rate_min, rate_wish, currency,
          profile:profiles(name),
          candidate_skills(skill:skills(id, name, category))
        ),
        current_stage:role_stages(id, name, order_index)
      `)
      .eq('role_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),

    supabase
      .from('partners')
      .select('id, first_name, last_name, name')
      .order('last_name', { ascending: true }),
  ])

  if (!role) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partners: PartnerOption[] = (rawPartners ?? []).map((p: any) => ({
    id: p.id as string,
    label: [p.first_name, p.last_name].filter(Boolean).join(' ') + (p.name ? ` (${p.name})` : ''),
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = role as any
  const typedRole = {
    id: r.id as string,
    title: r.title as string,
    client: r.client ? (Array.isArray(r.client) ? (r.client[0] ?? null) : r.client) as { name: string } : null,
    rate: r.rate as number | null,
    rate_currency: r.rate_currency as string | null,
    rate_type: r.rate_type as string | null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submissions: Submission[] = (subs ?? []).map((s: any) => ({
    id: s.id,
    status: s.status,
    ai_score: s.ai_score,
    ai_summary: s.ai_summary,
    role_id: s.role_id,
    candidate: s.candidate
      ? {
          id: s.candidate.id,
          first_name: s.candidate.first_name,
          last_name: s.candidate.last_name,
          seniority: s.candidate.seniority,
          rate_min: s.candidate.rate_min ?? null,
          rate_wish: s.candidate.rate_wish ?? null,
          currency: s.candidate.currency ?? null,
          profile: Array.isArray(s.candidate.profile) ? (s.candidate.profile[0] ?? null) : s.candidate.profile,
          skills: (s.candidate.candidate_skills ?? []).map((cs: { skill: unknown }) => cs.skill),
        }
      : null,
    current_stage: s.current_stage
      ? (Array.isArray(s.current_stage) ? (s.current_stage[0] ?? null) : s.current_stage)
      : null,
    interviews: s.interviews ?? [],
    contract_id: Array.isArray(s.contract) ? (s.contract[0]?.id ?? null) : (s.contract?.id ?? null),
    role: { title: typedRole.title, client: typedRole.client },
  }))

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <RolePipelineClient role={typedRole} initialSubmissions={submissions} partners={partners} />
    </div>
  )
}
