import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface CandidateRow {
  id: string
  first_name: string
  last_name: string
  seniority: string | null
  experiences: { role: string; company: string; start_date?: string; end_date?: string | null; is_present?: boolean; description?: string }[]
  profile: { name: string } | null
  skills: { id: string; name: string }[]
  rate_min?: number | null
  rate_wish?: number | null
  currency?: string | null
  cv_file_path?: string | null
}

interface RubixCriterion {
  id: string
  order_index: number
  criterion: string
  weight: number
}

interface RubixScore {
  criterion_id: string
  score: number
  evidence: string
}

async function scoreAgainstRubix(
  candidate: CandidateRow,
  criteria: RubixCriterion[]
): Promise<{ rubix_fit: number; scores: RubixScore[]; strong_criteria: string[]; weak_criteria: string[]; summary: string }> {
  const skillNames = candidate.skills.map(s => s.name).join(', ') || 'Niciun skill înregistrat'
  const expText = (candidate.experiences ?? [])
    .slice(0, 8)
    .map(e => `• ${e.role} @ ${e.company} (${e.start_date ?? '?'} – ${e.is_present ? 'prezent' : (e.end_date ?? '?')})${e.description ? ': ' + e.description.slice(0, 600) : ''}`)
    .join('\n') || 'Nicio experiență înregistrată'

  const profileName = candidate.profile?.name ?? 'Nespecificat'
  const criteriaText = criteria.map((cr, i) => `${i + 1}. [${cr.weight}%] "${cr.criterion}"`).join('\n')

  const prompt = `Ești recrutor tehnic senior la NexDev. Evaluează candidatul de mai jos contra fiecărui criteriu din rubrica de evaluare. Folosește scala 0–5.

CANDIDAT: ${candidate.first_name} ${candidate.last_name}
PROFIL: ${profileName}
SENIORITATE: ${candidate.seniority ?? 'Nespecificată'}
SKILLURI: ${skillNames}
EXPERIENȚĂ:
${expText}

CRITERII DE EVALUARE (din JD):
${criteriaText}

SCALA: 5 = îndeplinit complet · 4 = puternic · 3 = parțial · 2 = limitat · 1 = minimal · 0 = absent

Instrucțiuni:
- Scorează FIECARE criteriu bazat strict pe datele candidatului.
- Pentru fiecare criteriu, adaugă 1 propoziție scurtă de evidență specifică.
- summary: 1-2 propoziții în română despre potrivirea generală față de rubric.
- Răspunde DOAR cu JSON valid.

Format:
{"scores":[{"index":1,"score":4,"evidence":"..."},{"index":2,"score":3,"evidence":"..."}],"summary":"..."}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { rubix_fit: 0, scores: [], strong_criteria: [], weak_criteria: [], summary: 'Nu s-a putut analiza.' }

  let parsed: { scores: { index: number; score: number; evidence: string }[]; summary?: string }
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return { rubix_fit: 0, scores: [], strong_criteria: [], weak_criteria: [], summary: 'Eroare parsare AI.' }
  }

  const scores: RubixScore[] = (parsed.scores ?? [])
    .map(s => {
      const criterion = criteria[s.index - 1]
      if (!criterion) return null
      return {
        criterion_id: criterion.id,
        score: Math.max(0, Math.min(5, Number(s.score) || 0)),
        evidence: s.evidence ?? '',
      }
    })
    .filter((r): r is RubixScore => r !== null)

  const rubix_fit = criteria.reduce((acc, cr) => {
    const s = scores.find(x => x.criterion_id === cr.id)
    return acc + (cr.weight * (s?.score ?? 0)) / 5
  }, 0)

  const strong_criteria = criteria
    .filter(cr => (scores.find(x => x.criterion_id === cr.id)?.score ?? 0) >= 3.5)
    .map(cr => cr.criterion.split('–')[0].split('&')[0].trim().slice(0, 40))
    .slice(0, 3)

  const weak_criteria = criteria
    .filter(cr => (scores.find(x => x.criterion_id === cr.id)?.score ?? 0) <= 2)
    .map(cr => cr.criterion.split('–')[0].split('&')[0].trim().slice(0, 40))
    .slice(0, 2)

  return {
    rubix_fit: Math.round(rubix_fit * 10) / 10,
    scores,
    strong_criteria,
    weak_criteria,
    summary: parsed.summary ?? '',
  }
}

async function batchRun<T, R>(items: T[], fn: (item: T) => Promise<R>, size = 4): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.all(items.slice(i, i + size).map(fn))
    results.push(...batch)
  }
  return results
}

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'be', 'will', 'have', 'has', 'cu', 'de', 'la', 'si', 'in', 'pe', 'pentru', 'sau', 'din', 'ale'])
  const words = text.toLowerCase().match(/[a-z][a-z0-9+#.]{2,}/g) ?? []
  return new Set(words.filter(w => !stopWords.has(w)))
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch role
  const { data: role } = await supabase
    .from('roles')
    .select('title, description, client:clients(name)')
    .eq('id', id)
    .single()

  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

  // Rubix Matrix — obligatoriu
  const { data: criteria } = await supabase
    .from('role_rubix_criteria')
    .select('id, order_index, criterion, weight')
    .eq('role_id', id)
    .order('order_index')

  if (!criteria || criteria.length === 0) {
    return NextResponse.json(
      { error: 'No Rubix Matrix found for this role. Add one in the Role Edit section, then come back.' },
      { status: 400 }
    )
  }

  // Fetch pipeline submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id,
      candidate:candidates(
        id, first_name, last_name, seniority, experiences,
        rate_min, rate_wish, currency, cv_file_path,
        profile:profiles(name),
        candidate_skills(skill:skills(id, name))
      )
    `)
    .eq('role_id', id)
    .is('deleted_at', null)

  // Score pipeline candidates against Rubix Matrix
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipelineResults = await batchRun(
    (submissions ?? []).filter(s => s.candidate),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (s: any) => {
      const c = s.candidate
      const candidate: CandidateRow = {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        seniority: c.seniority,
        experiences: c.experiences ?? [],
        profile: Array.isArray(c.profile) ? (c.profile[0] ?? null) : c.profile,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        skills: (c.candidate_skills ?? []).map((cs: any) => Array.isArray(cs.skill) ? cs.skill[0] : cs.skill).filter(Boolean),
        rate_min: c.rate_min,
        rate_wish: c.rate_wish,
        currency: c.currency,
        cv_file_path: c.cv_file_path,
      }

      const result = await scoreAgainstRubix(candidate, criteria)

      // Persist scores to submission_rubix_scores
      const rows = result.scores.map(sc => ({
        submission_id: s.id,
        rubix_criterion_id: sc.criterion_id,
        score: sc.score,
        evidence: sc.evidence,
      }))
      if (rows.length) {
        await supabase
          .from('submission_rubix_scores')
          .upsert(rows, { onConflict: 'submission_id,rubix_criterion_id' })
      }
      await supabase
        .from('submissions')
        .update({ rubix_fit: result.rubix_fit })
        .eq('id', s.id)

      return {
        submission_id: s.id,
        candidate_id: candidate.id,
        candidate_name: `${candidate.first_name} ${candidate.last_name}`,
        score: result.rubix_fit,
        matched_skills: result.strong_criteria,
        missing_skills: result.weak_criteria,
        summary: result.summary,
        rate_min: candidate.rate_min ?? null,
        rate_wish: candidate.rate_wish ?? null,
        currency: candidate.currency ?? 'EUR',
        cv_file_path: candidate.cv_file_path ?? null,
      }
    }
  )

  // Discover candidates not yet in pipeline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipelineCandidateIds = (submissions ?? []).map((s: any) => s.candidate?.id).filter(Boolean)

  const { data: allCandidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, seniority, experiences, rate_min, rate_wish, currency, cv_file_path, profile:profiles(name), candidate_skills(skill:skills(id, name))')
    .is('deleted_at', null)
    .neq('candidate_status', 'blacklist')
    .not('id', 'in', pipelineCandidateIds.length ? `(${pipelineCandidateIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')

  // Pre-filter by keyword relevance from rubix criteria + role description
  const jdKeywords = extractKeywords(
    `${role.title} ${criteria.map(c => c.criterion).join(' ')} ${(role.description ?? '').slice(0, 3000)}`
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scored = ((allCandidates ?? []) as any[])
    .map(c => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cSkills = (c.candidate_skills ?? []).map((cs: any) => {
        const sk = Array.isArray(cs.skill) ? cs.skill[0] : cs.skill
        return sk?.name?.toLowerCase() ?? ''
      })
      const skillHits = cSkills.filter((s: string) => jdKeywords.has(s)).length

      const expText = ((c.experiences ?? []) as { role: string; description: string }[])
        .slice(0, 8)
        .map(e => `${e.role} ${e.description ?? ''}`)
        .join(' ')
        .toLowerCase()
      const expWords = expText.match(/[a-z][a-z0-9+#.]{2,}/g) ?? []
      const expKeywordHits = expWords.filter((w: string) => jdKeywords.has(w)).length

      return { ...c, relevance: skillHits * 3 + Math.min(expKeywordHits, 20) }
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 15)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discoveryResults = await batchRun(scored, async (c: any) => {
    const candidate: CandidateRow = {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      seniority: c.seniority,
      experiences: c.experiences ?? [],
      profile: Array.isArray(c.profile) ? (c.profile[0] ?? null) : c.profile,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      skills: (c.candidate_skills ?? []).map((cs: any) => Array.isArray(cs.skill) ? cs.skill[0] : cs.skill).filter(Boolean),
      rate_min: c.rate_min,
      rate_wish: c.rate_wish,
      currency: c.currency,
      cv_file_path: c.cv_file_path,
    }

    const result = await scoreAgainstRubix(candidate, criteria)
    return {
      candidate_id: c.id,
      candidate_name: `${c.first_name} ${c.last_name}`,
      score: result.rubix_fit,
      matched_skills: result.strong_criteria,
      missing_skills: result.weak_criteria,
      summary: result.summary,
      rate_min: candidate.rate_min ?? null,
      rate_wish: candidate.rate_wish ?? null,
      currency: candidate.currency ?? 'EUR',
      cv_file_path: candidate.cv_file_path ?? null,
    }
  })

  return NextResponse.json({
    pipeline_scored: pipelineResults.sort((a, b) => b.score - a.score),
    discovered: discoveryResults.sort((a, b) => b.score - a.score),
  })
}
