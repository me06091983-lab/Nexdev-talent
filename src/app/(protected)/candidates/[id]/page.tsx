import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CandidateForm } from '@/components/candidates/CandidateForm'

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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Editează: {candidate.first_name} {candidate.last_name}
        </h1>
      </div>
      <div className="glass rounded-2xl p-8">
        <CandidateForm initial={initial} candidateId={id} />
      </div>
    </div>
  )
}
