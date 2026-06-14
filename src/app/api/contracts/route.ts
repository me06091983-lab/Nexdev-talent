import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contracts')
    .select(`
      id, start_date, end_date, pay_rate, bill_rate, rate_type, currency,
      partner_commission, notes, created_at, candidate_id, role_id,
      submission:submissions(
        id, role_id,
        candidate:candidates(id, first_name, last_name, profile:profiles(name)),
        role:roles(id, title, client:clients(name))
      ),
      direct_candidate:candidates!candidate_id(id, first_name, last_name, profile:profiles(name)),
      direct_role:roles!role_id(id, title, client:clients(name))
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts = (data ?? []).map((c: any) => {
    const sub = Array.isArray(c.submission) ? c.submission[0] : c.submission
    const directCand = Array.isArray(c.direct_candidate) ? c.direct_candidate[0] : c.direct_candidate
    const directRole = Array.isArray(c.direct_role) ? c.direct_role[0] : c.direct_role
    const directClient = directRole ? (Array.isArray(directRole.client) ? directRole.client[0] : directRole.client) : null
    const subCand = sub ? (Array.isArray(sub.candidate) ? sub.candidate[0] : sub.candidate) : null
    const subRole = sub ? (Array.isArray(sub.role) ? sub.role[0] : sub.role) : null
    const subClient = subRole ? (Array.isArray(subRole.client) ? subRole.client[0] : subRole.client) : null
    const cand = directCand ?? subCand
    const role = directRole ?? subRole
    const client = directClient ?? subClient
    const profile = cand ? (Array.isArray(cand.profile) ? cand.profile[0] : cand.profile) : null

    return {
      ...c,
      candidate: cand ? { ...cand, profile } : null,
      role: role ? { ...role, client } : null,
      role_id: c.role_id ?? sub?.role_id ?? null,
    }
  })

  return NextResponse.json(contracts)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const {
    submission_id,
    candidate_id,
    role_id,
    start_date,
    end_date,
    pay_rate,
    bill_rate,
    rate_type,
    currency,
    partner_commission,
    partner_commission_type,
    partner_commission_2,
    partner_commission_2_type,
    notes,
  } = body

  if (!start_date || !pay_rate || !bill_rate) {
    return NextResponse.json({ error: 'Câmpuri obligatorii lipsă.' }, { status: 400 })
  }

  let resolvedCandidateId = candidate_id ?? null
  let resolvedRoleId = role_id ?? null
  let resolvedSubmissionId = submission_id ?? null

  if (submission_id) {
    const { data: sub, error: subError } = await supabase
      .from('submissions')
      .select('id, status, candidate_id, role_id')
      .eq('id', submission_id)
      .single()

    if (subError || !sub) return NextResponse.json({ error: 'Submisie negăsită.' }, { status: 404 })
    if (sub.status !== 'offer') return NextResponse.json({ error: 'Submisia nu are status Ofertă.' }, { status: 400 })

    resolvedCandidateId = sub.candidate_id
    resolvedRoleId = sub.role_id
  } else if (!candidate_id) {
    return NextResponse.json({ error: 'Candidat obligatoriu.' }, { status: 400 })
  } else if (candidate_id && role_id) {
    // Find latest submission for this candidate+role that doesn't already have a contract
    const { data: matchingSub } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('candidate_id', candidate_id)
      .eq('role_id', role_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (matchingSub) {
      // Check if this submission already has a contract (would violate unique constraint)
      const { data: existingContract } = await supabase
        .from('contracts')
        .select('id')
        .eq('submission_id', matchingSub.id)
        .maybeSingle()

      if (!existingContract) {
        // Submission free — link to it and advance to offer
        resolvedSubmissionId = matchingSub.id
        if (matchingSub.status !== 'offer') {
          await supabase
            .from('submissions')
            .update({ status: 'offer' })
            .eq('id', matchingSub.id)
        }
      }
      // If submission already has a contract, leave resolvedSubmissionId = null
      // → contract will be created with direct candidate_id + role_id (no unique constraint there)
    }
  }

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .insert({
      submission_id: resolvedSubmissionId,
      candidate_id: resolvedCandidateId,
      role_id: resolvedRoleId,
      start_date,
      end_date: end_date || null,
      pay_rate: Number(pay_rate),
      bill_rate: Number(bill_rate),
      rate_type: rate_type ?? 'daily',
      currency: currency ?? 'EUR',
      partner_commission: partner_commission ? Number(partner_commission) : null,
      partner_commission_type: partner_commission_type ?? 'hourly',
      partner_commission_2: partner_commission_2 ? Number(partner_commission_2) : null,
      partner_commission_2_type: partner_commission_2_type ?? 'hourly',
      notes: notes?.trim() || null,
    })
    .select()
    .single()

  if (contractError) {
    if (contractError.code === '23505') {
      return NextResponse.json({ error: 'Există deja un contract pentru această submisie.' }, { status: 409 })
    }
    return NextResponse.json({ error: contractError.message }, { status: 500 })
  }

  if (resolvedCandidateId) {
    await supabase
      .from('candidates')
      .update({ candidate_status: 'angajat' })
      .eq('id', resolvedCandidateId)
  }

  return NextResponse.json(contract, { status: 201 })
}
