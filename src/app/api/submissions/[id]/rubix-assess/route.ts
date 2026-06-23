import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id: submissionId } = await params
  const supabase = await createClient()

  // Fetch submission → candidate + role
  const { data: sub } = await supabase
    .from('submissions')
    .select(`
      id, role_id,
      candidate:candidates(
        id, first_name, last_name, seniority, experiences,
        profile:profiles(name),
        candidate_skills(skill:skills(name))
      )
    `)
    .eq('id', submissionId)
    .single()

  if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  // Fetch rubix criteria for this role
  const { data: criteria } = await supabase
    .from('role_rubix_criteria')
    .select('id, order_index, criterion, weight')
    .eq('role_id', sub.role_id)
    .order('order_index')

  if (!criteria?.length) {
    return NextResponse.json({ skipped: true, reason: 'No Rubix Matrix defined for this role.' })
  }

  // Build candidate profile text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = sub.candidate as any
  const skillNames = (c.candidate_skills ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((cs: any) => (Array.isArray(cs.skill) ? cs.skill[0] : cs.skill)?.name)
    .filter(Boolean)
    .join(', ') || 'Niciun skill înregistrat'

  const expText = ((c.experiences ?? []) as Array<{
    role: string; company: string; start_date?: string; end_date?: string | null;
    is_present?: boolean; description?: string
  }>)
    .slice(0, 8)
    .map(e => `• ${e.role} @ ${e.company} (${e.start_date ?? '?'} – ${e.is_present ? 'prezent' : (e.end_date ?? '?')})${e.description ? ': ' + e.description.slice(0, 600) : ''}`)
    .join('\n') || 'Nicio experiență înregistrată'

  const profileName = Array.isArray(c.profile) ? (c.profile[0]?.name ?? '') : (c.profile?.name ?? '')

  const criteriaText = criteria
    .map((cr, i) => `${i + 1}. [${cr.weight}%] "${cr.criterion}"`)
    .join('\n')

  const prompt = `Ești recrutor tehnic senior la NexDev. Evaluează candidatul de mai jos contra fiecărui criteriu din rubrica de evaluare. Folosește scala 0–5.

CANDIDAT: ${c.first_name} ${c.last_name}
PROFIL: ${profileName}
SENIORITATE: ${c.seniority ?? 'Nespecificată'}
SKILLURI: ${skillNames}
EXPERIENȚĂ:
${expText}

CRITERII DE EVALUARE (din JD):
${criteriaText}

SCALA: 5 = îndeplinit complet, evidențiat · 4 = puternic · 3 = parțial/adiacent · 2 = limitat · 1 = minimal · 0 = absent

Instrucțiuni:
- Scorează FIECARE criteriu individual, bazat strict pe datele candidatului de mai sus.
- Pentru fiecare criteriu, adaugă 1-2 propoziții scurte de evidență specifică din profilul candidatului.
- Răspunde DOAR cu JSON valid.

Format:
{"scores":[{"index":1,"score":4.5,"evidence":"Text evidență..."},{"index":2,"score":3,"evidence":"..."}]}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })

  let result: { scores: { index: number; score: number; evidence: string }[] }
  try {
    result = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
  }

  // Upsert scores
  const rows = (result.scores ?? []).map(s => {
    const criterion = criteria[s.index - 1]
    if (!criterion) return null
    return {
      submission_id: submissionId,
      rubix_criterion_id: criterion.id,
      score: Math.max(0, Math.min(5, s.score)),
      evidence: s.evidence ?? null,
    }
  }).filter((r): r is NonNullable<typeof r> => r !== null)

  if (rows.length) {
    await supabase
      .from('submission_rubix_scores')
      .upsert(rows, { onConflict: 'submission_id,rubix_criterion_id' })
  }

  // Compute and store overall fit on submission
  const overallFit = criteria.reduce((acc, cr) => {
    const s = result.scores.find(x => criteria[x.index - 1]?.id === cr.id)
    return acc + (cr.weight * (s?.score ?? 0)) / 5
  }, 0)

  await supabase
    .from('submissions')
    .update({ rubix_fit: Math.round(overallFit * 10) / 10 })
    .eq('id', submissionId)

  return NextResponse.json({ success: true, overall_fit: overallFit, scores: rows })
}
