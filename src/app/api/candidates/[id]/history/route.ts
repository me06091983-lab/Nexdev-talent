import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [submissionsRes, contractsRes] = await Promise.all([
    supabase
      .from('submissions')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        role:roles (
          id,
          title,
          status,
          client:clients ( name )
        ),
        stage_history (
          stage_name,
          result,
          feedback,
          created_at
        )
      `)
      .eq('candidate_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),

    supabase
      .from('contracts')
      .select('id, contract_status, start_date, end_date, bill_rate, pay_rate, rate_type, currency, role:roles(id, title)')
      .eq('candidate_id', id)
      .order('start_date', { ascending: false }),
  ])

  if (submissionsRes.error) return NextResponse.json({ error: submissionsRes.error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submissions = (submissionsRes.data ?? []).map((s: any) => {
    const role = Array.isArray(s.role) ? s.role[0] : s.role
    const client = role ? (Array.isArray(role.client) ? role.client[0] : role.client) : null

    const stageHistory: { stage_name: string; result: string | null; feedback: string | null; created_at: string }[] =
      Array.isArray(s.stage_history) ? s.stage_history : []

    const rejectionEntry = stageHistory
      .filter(h => h.result === 'rejected' || h.result === 'fail' || h.result === 'respins')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    const lastFeedback = stageHistory
      .filter(h => h.feedback)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    return {
      id: s.id,
      status: s.status,
      created_at: s.created_at,
      updated_at: s.updated_at,
      role: role ? { id: role.id, title: role.title, status: role.status, client } : null,
      rejection_reason: rejectionEntry?.feedback ?? null,
      last_feedback: lastFeedback?.feedback ?? null,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts = (contractsRes.data ?? []).map((c: any) => {
    const role = Array.isArray(c.role) ? c.role[0] : c.role
    return {
      id: c.id,
      contract_status: c.contract_status,
      start_date: c.start_date,
      end_date: c.end_date,
      bill_rate: c.bill_rate,
      pay_rate: c.pay_rate ?? null,
      rate_type: c.rate_type ?? 'daily',
      currency: c.currency,
      role_title: role?.title ?? null,
      role_id: role?.id ?? null,
    }
  })

  return NextResponse.json({ submissions, contracts })
}
