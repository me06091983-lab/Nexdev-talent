import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('contracts')
    .select(`
      id,
      start_date,
      end_date,
      candidate_id,
      submission_id,
      direct_candidate:candidates!candidate_id(
        id, first_name, last_name, company_name, company_bank_account
      ),
      submission:submissions!submission_id(
        candidate:candidates(id, first_name, last_name, company_name, company_bank_account)
      )
    `)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type CandidateRow = {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
    company_bank_account: string | null
  }

  const seen = new Set<string>()
  const result: CandidateRow[] = []

  for (const c of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const directCand = Array.isArray((c as any).direct_candidate) ? (c as any).direct_candidate[0] : (c as any).direct_candidate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = Array.isArray((c as any).submission) ? (c as any).submission[0] : (c as any).submission
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subCand = sub ? (Array.isArray(sub.candidate) ? sub.candidate[0] : sub.candidate) : null
    const cand: CandidateRow | null = directCand ?? subCand

    if (cand && !seen.has(cand.id)) {
      seen.add(cand.id)
      result.push(cand)
    }
  }

  return NextResponse.json(result)
}
