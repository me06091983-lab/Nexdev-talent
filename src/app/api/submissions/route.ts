import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const roleId = new URL(request.url).searchParams.get('role_id')

  let query = supabase
    .from('submissions')
    .select(`
      *,
      contract:contracts(id),
      candidate:candidates(
        id, first_name, last_name, email, seniority, location,
        rate_min, rate_wish, currency,
        profile:profiles(id, name),
        candidate_skills(skill:skills(id, name, category))
      ),
      current_stage:role_stages(id, name, order_index)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (roleId) query = query.eq('role_id', roleId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submissions = (data ?? []).map((s: any) => ({
    ...s,
    contract_id: Array.isArray(s.contract) ? (s.contract[0]?.id ?? null) : (s.contract?.id ?? null),
    candidate: s.candidate
      ? { ...s.candidate, skills: s.candidate.candidate_skills?.map((cs: { skill: unknown }) => cs.skill) ?? [] }
      : null,
  }))

  return NextResponse.json(submissions)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { candidate_id, role_id, note } = await request.json()

  // Check for any existing submission (including soft-deleted)
  const { data: anyExisting } = await supabase
    .from('submissions')
    .select('id, deleted_at')
    .eq('candidate_id', candidate_id)
    .eq('role_id', role_id)
    .maybeSingle()

  let submission
  if (anyExisting) {
    if (!anyExisting.deleted_at) {
      return NextResponse.json({ error: 'Candidatul este deja în pipeline-ul acestui rol.' }, { status: 409 })
    }
    // Restore soft-deleted submission
    const { data: restored, error: restoreError } = await supabase
      .from('submissions')
      .update({ deleted_at: null, status: 'pipeline' })
      .eq('id', anyExisting.id)
      .select()
      .single()
    if (restoreError) return NextResponse.json({ error: restoreError.message }, { status: 500 })
    submission = restored
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('submissions')
      .insert({ candidate_id, role_id, status: 'pipeline' })
      .select()
      .single()
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    submission = inserted
  }

  if (note?.trim()) {
    await supabase.from('stage_history').insert({
      submission_id: submission.id,
      stage_name: 'Adăugat în pipeline',
      result: 'info',
      feedback: note,
    })
  }

  return NextResponse.json(submission, { status: 201 })
}
