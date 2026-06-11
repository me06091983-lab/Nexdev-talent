import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('candidates')
    .select(`
      *,
      profile:profiles(id, name),
      partner:partners(id, name),
      candidate_skills(skill:skills(id, name, category))
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json({
    ...data,
    skills: data.candidate_skills?.map((cs: { skill: unknown }) => cs.skill) ?? [],
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { skill_ids, ...candidateData } = body

  const { data: candidate, error } = await supabase
    .from('candidates')
    .update(candidateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (skill_ids !== undefined) {
    await supabase.from('candidate_skills').delete().eq('candidate_id', id)
    if (skill_ids.length) {
      const skillRows = skill_ids.map((sid: string) => ({ candidate_id: id, skill_id: sid }))
      await supabase.from('candidate_skills').insert(skillRows)
    }
  }

  return NextResponse.json(candidate)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('candidates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
