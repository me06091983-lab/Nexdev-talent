import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const COLUMN_LABELS: Record<string, string> = {
  first_name: 'First name', last_name: 'Last name', email: 'Email', phone: 'Phone',
  source_type: 'Source', seniority: 'Seniority level', rate_min: 'Minimum rate',
  rate_wish: 'Desired rate', currency: 'Currency', profile_id: 'Profile',
}

function friendlyError(msg: string): string {
  const nullCol = msg.match(/null value in column "(\w+)"/)
  if (nullCol) {
    const label = COLUMN_LABELS[nullCol[1]] ?? nullCol[1]
    return `The field "${label}" is required and cannot be empty.`
  }
  if (msg.includes('duplicate key') && msg.includes('email'))
    return 'A candidate with this email already exists.'
  if (msg.includes('duplicate key'))
    return 'A record with these details already exists.'
  if (msg.includes('invalid input syntax'))
    return 'Invalid value in a field. Check numeric fields and dates.'
  if (msg.includes('foreign key'))
    return 'Invalid reference — one of the selections no longer exists. Reload the page and try again.'
  if (msg.includes('violates check constraint'))
    return 'Invalid value in a field. Check selections (seniority, currency) and try again.'
  if (msg.includes('does not exist'))
    return 'Configuration error — a submitted field does not exist in the database. Contact the administrator.'
  return `Save error: ${msg}`
}

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

  if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 })

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
  const admin = createAdminClient()

  // Get contract IDs for cascade
  const { data: contracts } = await admin.from('contracts').select('id').eq('candidate_id', id)
  const contractIds = (contracts ?? []).map(c => c.id)

  if (contractIds.length) {
    await admin.from('timesheets').delete().in('contract_id', contractIds)
    await admin.from('contract_history').delete().in('contract_id', contractIds)
    await admin.from('contracts').delete().in('id', contractIds)
  }

  // Get submission IDs for cascade
  const { data: subs } = await admin.from('submissions').select('id').eq('candidate_id', id)
  const subIds = (subs ?? []).map(s => s.id)
  if (subIds.length) {
    await admin.from('stage_history').delete().in('submission_id', subIds)
    await admin.from('submissions').delete().in('id', subIds)
  }

  await admin.from('candidate_skills').delete().eq('candidate_id', id)

  const { error } = await admin.from('candidates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 })
  return NextResponse.json({ success: true })
}
