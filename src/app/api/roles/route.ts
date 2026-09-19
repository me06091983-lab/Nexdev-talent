import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, withoutRoleRate } from '@/lib/isAdmin'

function shapeRole(r: Record<string, unknown> & { role_skills?: { skill: unknown; skill_type: string }[] }) {
  return {
    ...r,
    required_skills: r.role_skills?.filter(rs => rs.skill_type === 'required').map(rs => rs.skill) ?? [],
    preferred_skills: r.role_skills?.filter(rs => rs.skill_type === 'preferred').map(rs => rs.skill) ?? [],
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('roles')
    .select('*, client:clients(id, name), role_skills(skill:skills(id, name, category), skill_type)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const admin = await isAdmin()
  return NextResponse.json((data ?? []).map(r => shapeRole(admin ? r : withoutRoleRate(r))))
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { required_skill_ids, preferred_skill_ids, ...roleData } = body
  const admin = await isAdmin()
  if (!admin) { delete roleData.rate; delete roleData.rate_type; delete roleData.rate_currency }

  const { data: role, error } = await supabase
    .from('roles')
    .insert(roleData)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const skillRows = [
    ...(required_skill_ids ?? []).map((id: string) => ({ role_id: role.id, skill_id: id, skill_type: 'required' })),
    ...(preferred_skill_ids ?? []).map((id: string) => ({ role_id: role.id, skill_id: id, skill_type: 'preferred' })),
  ]
  if (skillRows.length) await supabase.from('role_skills').insert(skillRows)

  return NextResponse.json(admin ? role : withoutRoleRate(role), { status: 201 })
}
