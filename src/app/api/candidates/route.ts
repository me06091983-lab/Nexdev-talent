import { createClient } from '@/lib/supabase/server'
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

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || searchParams.get('q') || ''
  const profileId = searchParams.get('profile_id')
  const seniority = searchParams.get('seniority')
  const sourceType = searchParams.get('source_type')
  const notInRole = searchParams.get('not_in_role')

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

  if (notInRole) {
    // Exclude blacklisted candidates from pipeline searches
    query = query.neq('candidate_status', 'blacklist')

    const { data: inPipeline } = await supabase
      .from('submissions')
      .select('candidate_id')
      .eq('role_id', notInRole)
      .is('deleted_at', null)
    const excludeIds = (inPipeline ?? []).map((s: { candidate_id: string }) => s.candidate_id).filter(Boolean)
    if (excludeIds.length) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    }
  }

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

  if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 })

  if (skill_ids?.length) {
    const skillRows = skill_ids.map((sid: string) => ({
      candidate_id: candidate.id,
      skill_id: sid,
    }))
    await supabase.from('candidate_skills').insert(skillRows)
  }

  return NextResponse.json(candidate, { status: 201 })
}
