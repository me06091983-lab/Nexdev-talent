import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: criteria }, { data: submissions }] = await Promise.all([
    supabase
      .from('role_rubix_criteria')
      .select('id, order_index, criterion, weight')
      .eq('role_id', id)
      .order('order_index'),

    supabase
      .from('submissions')
      .select(`
        id, rubix_fit,
        candidate:candidates(id, first_name, last_name),
        submission_rubix_scores(rubix_criterion_id, score, evidence)
      `)
      .eq('role_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
  ])

  if (!criteria?.length) {
    return NextResponse.json({ hasCriteria: false, criteria: [], candidates: [] })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates = (submissions ?? []).map((s: any) => {
    const cand = Array.isArray(s.candidate) ? s.candidate[0] : s.candidate
    const scoreMap: Record<string, { score: number; evidence: string | null }> = {}
    for (const sc of (s.submission_rubix_scores ?? [])) {
      scoreMap[sc.rubix_criterion_id] = { score: sc.score, evidence: sc.evidence }
    }

    const hasScores = Object.keys(scoreMap).length > 0

    // Compute overall fit from scores if rubix_fit not stored yet
    let overallFit = s.rubix_fit ?? null
    if (overallFit === null && hasScores) {
      overallFit = (criteria ?? []).reduce((acc: number, cr: { id: string; weight: number }) => {
        const sc = scoreMap[cr.id]
        return acc + (sc ? (cr.weight * sc.score) / 5 : 0)
      }, 0)
      overallFit = Math.round((overallFit as number) * 10) / 10
    }

    return {
      submission_id: s.id,
      candidate_name: cand ? `${cand.first_name} ${cand.last_name}` : 'Necunoscut',
      candidate_id: cand?.id,
      has_scores: hasScores,
      overall_fit: overallFit,
      scores: scoreMap,
    }
  })

  return NextResponse.json({ hasCriteria: true, criteria: criteria ?? [], candidates })
}
