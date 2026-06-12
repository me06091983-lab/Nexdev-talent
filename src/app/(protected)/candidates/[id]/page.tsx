import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CandidateDetail } from '@/components/candidates/CandidateDetail'

export default async function EditCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('*, profile:profiles(id, name), candidate_skills(skill:skills(id, name, category))')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!candidate) notFound()

  const initial = {
    ...candidate,
    skills: candidate.candidate_skills?.map((cs: { skill: unknown }) => cs.skill) ?? [],
  }

  return (
    <CandidateDetail
      initial={initial}
      candidateId={id}
      candidateName={`${candidate.first_name} ${candidate.last_name}`}
    />
  )
}
