import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  const supabase = await createClient()

  // Get all submission IDs that already have rubix scores
  const { data: scored } = await supabase
    .from('submission_rubix_scores')
    .select('submission_id')

  const submissionIds = [...new Set((scored ?? []).map(r => r.submission_id))]

  if (!submissionIds.length) {
    return NextResponse.json({ message: 'No scored submissions found.', processed: 0 })
  }

  const results: { id: string; status: string }[] = []

  for (const submissionId of submissionIds) {
    try {
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

      if (!sub) { results.push({ id: submissionId, status: 'not_found' }); continue }

      const { data: criteria } = await supabase
        .from('role_rubix_criteria')
        .select('id, order_index, criterion, weight')
        .eq('role_id', sub.role_id)
        .order('order_index')

      if (!criteria?.length) { results.push({ id: submissionId, status: 'no_criteria' }); continue }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = sub.candidate as any
      const skillNames = (c.candidate_skills ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((cs: any) => (Array.isArray(cs.skill) ? cs.skill[0] : cs.skill)?.name)
        .filter(Boolean)
        .join(', ') || 'No skills on record'

      const expText = ((c.experiences ?? []) as Array<{
        role: string; company: string; start_date?: string; end_date?: string | null;
        is_present?: boolean; description?: string
      }>)
        .slice(0, 8)
        .map(e => `• ${e.role} @ ${e.company} (${e.start_date ?? '?'} – ${e.is_present ? 'present' : (e.end_date ?? '?')})${e.description ? ': ' + e.description.slice(0, 600) : ''}`)
        .join('\n') || 'No experience on record'

      const profileName = Array.isArray(c.profile) ? (c.profile[0]?.name ?? '') : (c.profile?.name ?? '')

      const criteriaText = criteria
        .map((cr, i) => `${i + 1}. [${cr.weight}%] "${cr.criterion}"`)
        .join('\n')

      const prompt = `You are a senior technical recruiter at NexDev. Evaluate the candidate below against each criterion in the evaluation rubric. Use the 0–5 scale.

CANDIDATE: ${c.first_name} ${c.last_name}
PROFILE: ${profileName}
SENIORITY: ${c.seniority ?? 'Not specified'}
SKILLS: ${skillNames}
EXPERIENCE:
${expText}

EVALUATION CRITERIA (from JD):
${criteriaText}

SCALE: 5 = fully met, clearly evidenced · 4 = strong · 3 = partial/adjacent · 2 = limited · 1 = minimal · 0 = absent

Instructions:
- Score EACH criterion individually, based strictly on the candidate data above.
- For each criterion, add 1–2 short sentences of specific evidence from the candidate's profile.
- Write ALL evidence text in English.
- Respond ONLY with valid JSON.

Format:
{"scores":[{"index":1,"score":4.5,"evidence":"Evidence text..."},{"index":2,"score":3,"evidence":"..."}]}`

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) { results.push({ id: submissionId, status: 'ai_error' }); continue }

      let result: { scores: { index: number; score: number; evidence: string }[] }
      try {
        result = JSON.parse(jsonMatch[0])
      } catch {
        results.push({ id: submissionId, status: 'json_error' }); continue
      }

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

      const overallFit = criteria.reduce((acc, cr) => {
        const s = result.scores.find(x => criteria[x.index - 1]?.id === cr.id)
        return acc + (cr.weight * (s?.score ?? 0)) / 5
      }, 0)

      await supabase
        .from('submissions')
        .update({ rubix_fit: Math.round(overallFit * 10) / 10 })
        .eq('id', submissionId)

      results.push({ id: submissionId, status: 'ok' })
    } catch (err) {
      results.push({ id: submissionId, status: `error: ${String(err)}` })
    }
  }

  return NextResponse.json({
    processed: results.length,
    ok: results.filter(r => r.status === 'ok').length,
    results,
  })
}
