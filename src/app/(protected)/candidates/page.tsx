import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { CandidatesClient } from '@/components/candidates/CandidatesClient'

export default async function CandidatesPage() {
  const supabase = await createClient()

  const [{ data: candidates }, { data: profiles }] = await Promise.all([
    supabase
      .from('candidates')
      .select('*, profile:profiles(id, name), candidate_skills(skill:skills(id, name, category))')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, name').order('name'),
  ])

  const list = (candidates ?? []).map(c => ({
    ...c,
    skills: c.candidate_skills?.map((cs: { skill: unknown }) => cs.skill) ?? [],
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

      <CandidatesClient candidates={list} profiles={profiles ?? []} />
    </div>
  )
}
