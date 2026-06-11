import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const profileId = searchParams.get('profile_id')
  const seniority = searchParams.get('seniority')
  const sourceType = searchParams.get('source_type')

  let query = supabase
    .from('candidates')
    .select(`
      *,
      profile:profiles(id, name),
      partner:partners(id, name),
      candidate_skills(skill:skills(id, name, category))
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (profileId) query = query.eq('profile_id', profileId)
  if (seniority) query = query.eq('seniority', seniority)
  if (sourceType) query = query.eq('source_type', sourceType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const candidates = data?.map((c) => ({
    ...c,
    skills: c.candidate_skills?.map((cs: { skill: unknown }) => cs.skill) ?? [],
  }))

  return NextResponse.json(candidates)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { skill_ids, ...candidateData } = body

  const { data: candidate, error } = await supabase
    .from('candidates')
    .insert(candidateData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (skill_ids?.length) {
    const skillRows = skill_ids.map((sid: string) => ({
      candidate_id: candidate.id,
      skill_id: sid,
    }))
    await supabase.from('candidate_skills').insert(skillRows)
  }

  return NextResponse.json(candidate, { status: 201 })
}
