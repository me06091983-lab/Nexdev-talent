import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const COLUMN_LABELS: Record<string, string> = {
  first_name: 'Prenume', last_name: 'Nume', email: 'Email', phone: 'Telefon',
  source_type: 'Sursă', seniority: 'Nivel senioritate', rate_min: 'Rate minim',
  rate_wish: 'Rate dorit', currency: 'Monedă', profile_id: 'Profil',
}

function friendlyError(msg: string): string {
  const nullCol = msg.match(/null value in column "(\w+)"/)
  if (nullCol) {
    const label = COLUMN_LABELS[nullCol[1]] ?? nullCol[1]
    return `Câmpul "${label}" este obligatoriu și nu poate fi gol.`
  }
  if (msg.includes('duplicate key') && msg.includes('email'))
    return 'Există deja un candidat cu această adresă de email.'
  if (msg.includes('duplicate key'))
    return 'Există deja o înregistrare cu aceste date.'
  if (msg.includes('invalid input syntax'))
    return 'Valoare invalidă introdusă într-un câmp. Verifică câmpurile numerice și datele.'
  if (msg.includes('foreign key'))
    return 'Referință invalidă — una dintre selecții nu mai există. Reîncarcă pagina și încearcă din nou.'
  if (msg.includes('violates check constraint'))
    return 'Valoare nepermisă într-un câmp. Verifică selecțiile (senioritate, monedă) și încearcă din nou.'
  if (msg.includes('does not exist'))
    return 'Eroare de configurare — un câmp trimis nu există în baza de date. Contactează administratorul.'
  return `Eroare la salvare: ${msg}`
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
