import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CandidatesClient } from '@/components/candidates/CandidatesClient'

export type CandidateRole = { role_id: string; role_title: string; status: string }
export type CandidateRolesMap = Record<string, CandidateRole[]>
export type CandidateAiScoreMap = Record<string, number>

export default async function CandidatesPage() {
  const supabase = await createClient()

  const [{ data: candidates }, { data: profiles }, { data: submissions }, { data: aiScores }] = await Promise.all([
    supabase
      .from('candidates')
      .select('*, profile:profiles(id, name), partner:partners(id, name), candidate_skills(skill:skills(id, name, category))')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, name').order('name'),
    supabase
      .from('submissions')
      .select('candidate_id, status, role:roles(id, title, status)')
      .is('deleted_at', null),
    supabase
      .from('submissions')
      .select('candidate_id, ai_score')
      .not('ai_score', 'is', null)
      .is('deleted_at', null),
  ])

  // Build map: candidateId → active-role submissions
  const candidateRoles: CandidateRolesMap = {}
  for (const s of submissions ?? []) {
    const role = (s.role as unknown) as { id: string; title: string; status: string } | null
    if (!role) continue
    if (role.status !== 'active' && role.status !== 'on_hold') continue
    if (!candidateRoles[s.candidate_id]) candidateRoles[s.candidate_id] = []
    candidateRoles[s.candidate_id].push({ role_id: role.id, role_title: role.title, status: s.status })
  }

  // Build map: candidateId → best AI score across all roles
  const candidateAiScores: CandidateAiScoreMap = {}
  for (const s of aiScores ?? []) {
    const score = Number(s.ai_score)
    if (!candidateAiScores[s.candidate_id] || score > candidateAiScores[s.candidate_id]) {
      candidateAiScores[s.candidate_id] = Math.round(score)
    }
  }

  const list = (candidates ?? []).map(c => ({
    ...c,
    skills:       c.candidate_skills?.map((cs: { skill: unknown }) => cs.skill) ?? [],
    partner_name: (c.partner as { name?: string } | null)?.name ?? null,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidați</h1>
          <p className="text-gray-500 mt-1">{list.length} candidați în baza de date</p>
        </div>
        <Link
          href="/candidates/new"
          className="bg-[#2AA3FF] hover:bg-[#1a8fe0] text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          + Candidat nou
        </Link>
      </div>

      <CandidatesClient
        candidates={list}
        profiles={profiles ?? []}
        candidateRoles={candidateRoles}
        candidateAiScores={candidateAiScores}
      />
    </div>
  )
}
