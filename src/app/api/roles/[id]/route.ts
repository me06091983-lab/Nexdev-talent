import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('roles')
    .select('*, client:clients(id, name), role_skills(skill:skills(id, name, category), skill_type)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({
    ...data,
    required_skills: data.role_skills?.filter((rs: { skill_type: string }) => rs.skill_type === 'required').map((rs: { skill: unknown }) => rs.skill) ?? [],
    preferred_skills: data.role_skills?.filter((rs: { skill_type: string }) => rs.skill_type === 'preferred').map((rs: { skill: unknown }) => rs.skill) ?? [],
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { required_skill_ids, preferred_skill_ids, ...roleData } = body

  const { data: role, error } = await supabase
    .from('roles')
    .update(roleData)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (required_skill_ids !== undefined || preferred_skill_ids !== undefined) {
    await supabase.from('role_skills').delete().eq('role_id', id)
    const skillRows = [
      ...(required_skill_ids ?? []).map((sid: string) => ({ role_id: id, skill_id: sid, skill_type: 'required' })),
      ...(preferred_skill_ids ?? []).map((sid: string) => ({ role_id: id, skill_id: sid, skill_type: 'preferred' })),
    ]
    if (skillRows.length) await supabase.from('role_skills').insert(skillRows)
  }

  // Când rolul devine "Ocupat", marchează ca "Angajat" candidatul cu ofertă
  // DOAR dacă există exact 1 ofertă activă (caz fără ambiguitate).
  // Dacă sunt mai multe oferte, utilizatorul trebuie să marcheze manual.
  if (roleData.status === 'filled') {
    const admin = createAdminClient()
    const { data: offers } = await admin
      .from('submissions')
      .select('candidate_id')
      .eq('role_id', id)
      .eq('status', 'offer')
      .is('deleted_at', null)
    const candidateIds = (offers ?? []).map((s: { candidate_id: string }) => s.candidate_id).filter(Boolean)
    if (candidateIds.length === 1) {
      await admin
        .from('candidates')
        .update({ candidate_status: 'angajat', successful: true })
        .in('id', candidateIds)
    }
  }

  return NextResponse.json(role)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase
    .from('roles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
