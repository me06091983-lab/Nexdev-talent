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
  const supabase = await createClient()

  const { error } = await supabase
    .from('candidates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 })
  return NextResponse.json({ success: true })
}
