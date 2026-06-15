import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Skill { id: string; name: string }
interface CandidateRow {
  id: string
  first_name: string
  last_name: string
  seniority: string | null
  experiences: { role: string; company: string; start_date: string; end_date: string | null; is_present: boolean; description: string }[]
  profile: { name: string } | null
  skills: Skill[]
}

async function scoreCandidate(
  candidate: CandidateRow,
  roleTitle: string,
  clientName: string,
  jd: string,
  requiredSkillNames: string[]
): Promise<{ score: number; matched_skills: string[]; missing_skills: string[]; summary: string }> {
  const skillNames = candidate.skills.map(s => s.name).join(', ') || 'Niciun skill înregistrat'
  const expText = (candidate.experiences ?? [])
    .slice(0, 10)
    .map(e => `${e.role} @ ${e.company} (${e.start_date ?? '?'} – ${e.is_present ? 'prezent' : (e.end_date ?? '?')})${e.description ? ': ' + e.description.slice(0, 1000) : ''}`)
    .join('\n') || 'Nicio experiență înregistrată'

  const prompt = `Ești recrutor tehnic senior. Scorează potrivirea candidat-rol pe baza JD-ului, experienței și skillurilor candidatului.

ROL: ${roleTitle} @ ${clientName}
CERINȚE OBLIGATORII (skilluri): ${requiredSkillNames.join(', ') || 'nespecificate'}

JOB DESCRIPTION:
${jd?.slice(0, 10000) || 'Nedisponibil'}

CANDIDAT: ${candidate.first_name} ${candidate.last_name}
PROFIL: ${candidate.profile?.name ?? 'Nespecificat'}
SENIORITATE: ${candidate.seniority ?? 'Nespecificată'}
SKILLURI: ${skillNames}
EXPERIENȚĂ:
${expText}

Instrucțiuni de scorare:
1. Analizează JD-ul în detaliu, în special secțiunile "Required Knowledge", "Required Skills" și cerințele tehnice.
2. Evaluează experiența candidatului: rolurile anterioare, durata, responsabilitățile și descrierile din fiecare poziție.
3. Evaluează skillurile declarate ale candidatului față de cerințele din JD.
4. Scorul reflectă atât experiența relevantă cât și acoperirea skillurilor tehnice cerute.

Răspunde DOAR cu JSON valid:
{"score":0-100,"matched_skills":["..."],"missing_skills":["..."],"summary":"2-3 propoziții în română despre potrivirea experienței și skillurilor față de cerințele rolului"}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const json = text.match(/\{[\s\S]*\}/)
  if (!json) return { score: 0, matched_skills: [], missing_skills: [], summary: 'Nu s-a putut analiza.' }
  return JSON.parse(json[0])
}

async function batchRun<T, R>(items: T[], fn: (item: T) => Promise<R>, size = 4): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.all(items.slice(i, i + size).map(fn))
    results.push(...batch)
  }
  return results
}

// Extracts lowercase keywords from role title + first part of JD for experience matching
function extractKeywords(roleTitle: string, jd: string): Set<string> {
  const stopWords = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'be', 'will', 'have', 'has', 'cu', 'de', 'la', 'si', 'in', 'pe', 'pentru', 'sau'])
  const text = `${roleTitle} ${jd.slice(0, 2000)}`
  const words = text.toLowerCase().match(/[a-z][a-z0-9+#.]{2,}/g) ?? []
  return new Set(words.filter(w => !stopWords.has(w)))
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch role
  const { data: role } = await supabase
    .from('roles')
    .select('title, description, client:clients(name), role_skills(skill:skills(id, name), skill_type)')
    .eq('id', id)
    .single()

  if (!role) return NextResponse.json({ error: 'Rol negăsit' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRaw = role.client as any
  const clientName = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw)?.name ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requiredSkillNames = ((role.role_skills ?? []) as any[])
    .filter((rs) => rs.skill_type === 'required')
    .map((rs) => (Array.isArray(rs.skill) ? rs.skill[0] : rs.skill)?.name as string)
    .filter(Boolean)

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipelineResults = await batchRun(
    (submissions ?? []).filter(s => s.candidate),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (s: any) => {
      const c = s.candidate
      const candidate: CandidateRow = {
        id: c.id, first_name: c.first_name, last_name: c.last_name,
        seniority: c.seniority, experiences: c.experiences,
        profile: Array.isArray(c.profile) ? (c.profile[0] ?? null) : c.profile,
        skills: (c.candidate_skills ?? []).map((cs: { skill: Skill | Skill[] }) => Array.isArray(cs.skill) ? cs.skill[0] : cs.skill),
      }
      const result = await scoreCandidate(candidate, role.title, clientName, role.description ?? '', requiredSkillNames)
      await supabase
        .from('submissions')
        .update({ ai_score: result.score, ai_summary: result.summary })
        .eq('id', s.id)
      return { submission_id: s.id, candidate_id: candidate.id, candidate_name: `${candidate.first_name} ${candidate.last_name}`, rate_min: c.rate_min ?? null, rate_wish: c.rate_wish ?? null, currency: c.currency ?? 'EUR', cv_file_path: c.cv_file_path ?? null, ...result }
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

  // Pre-filter combinat: skill overlap + potrivire cuvinte cheie din JD în experiența candidatului
  const reqSkillSet = new Set(requiredSkillNames.map(s => s.toLowerCase()))
  const jdKeywords = extractKeywords(role.title, role.description ?? '')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scored = ((allCandidates ?? []) as any[]).map(c => {
    // Skill overlap score
    const cSkills = (c.candidate_skills ?? []).map((cs: { skill: { name: string } | { name: string }[] }) => {
      const sk = Array.isArray(cs.skill) ? cs.skill[0] : cs.skill
      return sk?.name?.toLowerCase() ?? ''
    })
    const skillOverlap = reqSkillSet.size > 0
      ? cSkills.filter((s: string) => reqSkillSet.has(s)).length
      : 0

    // Experience keyword score: words from JD found in candidate's experience titles + descriptions
    const expText = ((c.experiences ?? []) as { role: string; description: string }[])
      .slice(0, 10)
      .map(e => `${e.role} ${e.description ?? ''}`)
      .join(' ')
      .toLowerCase()
    const expWords = expText.match(/[a-z][a-z0-9+#.]{2,}/g) ?? []
    const expKeywordHits = expWords.filter((w: string) => jdKeywords.has(w)).length

    // Combined relevance score: skill overlap weighted higher, experience as tiebreaker
    const relevance = skillOverlap * 3 + Math.min(expKeywordHits, 20)
    return { ...c, relevance }
  })
  .sort((a, b) => b.relevance - a.relevance)
  .slice(0, 15)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discoveryResults = await batchRun(scored, async (c: any) => {
    const candidate: CandidateRow = {
      id: c.id, first_name: c.first_name, last_name: c.last_name,
      seniority: c.seniority, experiences: c.experiences,
      profile: Array.isArray(c.profile) ? (c.profile[0] ?? null) : c.profile,
      skills: (c.candidate_skills ?? []).map((cs: { skill: Skill | Skill[] }) => Array.isArray(cs.skill) ? cs.skill[0] : cs.skill),
    }
    const result = await scoreCandidate(candidate, role.title, clientName, role.description ?? '', requiredSkillNames)
    return { candidate_id: c.id, candidate_name: `${c.first_name} ${c.last_name}`, rate_min: c.rate_min ?? null, rate_wish: c.rate_wish ?? null, currency: c.currency ?? 'EUR', cv_file_path: c.cv_file_path ?? null, ...result }
  })

  return NextResponse.json({
    pipeline_scored: pipelineResults.sort((a, b) => b.score - a.score),
    discovered: discoveryResults.sort((a, b) => b.score - a.score),
  })
}
