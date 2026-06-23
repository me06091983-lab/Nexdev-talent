import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { STATUS_LABELS } from '@/lib/pipeline'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: sub, error }, { data: history }] = await Promise.all([
    supabase
      .from('submissions')
      .select(`
        *,
        candidate:candidates(id, first_name, last_name, email, seniority, location,
          profile:profiles(id, name),
          candidate_skills(skill:skills(id, name, category))
        ),
        current_stage:role_stages(id, name, order_index)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('stage_history')
      .select('*')
      .eq('submission_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json({
    ...sub,
    candidate: sub.candidate
      ? { ...sub.candidate, skills: sub.candidate.candidate_skills?.map((cs: { skill: unknown }) => cs.skill) ?? [] }
      : null,
    history: history ?? [],
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { status, current_stage_id, feedback, result, ai_score, ai_summary, interviews } = body

  const updateData: Record<string, unknown> = {}
  if (status !== undefined) updateData.status = status
  if (current_stage_id !== undefined) updateData.current_stage_id = current_stage_id
  if (ai_score !== undefined) updateData.ai_score = ai_score
  if (ai_summary !== undefined) updateData.ai_summary = ai_summary
  if (interviews !== undefined) updateData.interviews = interviews

  const { data: submission, error } = await supabase
    .from('submissions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Candidat ajunge la ofertare → devine angajat
  if (status === 'offer' && submission?.candidate_id) {
    await supabase
      .from('candidates')
      .update({ candidate_status: 'angajat' })
      .eq('id', submission.candidate_id)
  }

  if (status || feedback?.trim()) {
    await supabase.from('stage_history').insert({
      submission_id: id,
      stage_id: current_stage_id ?? null,
      stage_name: status ? (STATUS_LABELS[status] ?? status) : 'Note',
      result: result ?? null,
      feedback: feedback?.trim() || null,
    })
  }

  return NextResponse.json(submission)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  await supabase.from('stage_history').delete().eq('submission_id', id)
  const { error } = await supabase.from('submissions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
