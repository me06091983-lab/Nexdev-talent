import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = cronSecret &&
    request.headers.get('Authorization') === `Bearer ${cronSecret}`

  if (!isVercelCron) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // 1. Marchează contractele expirate ca terminate
  const { data: expired } = await admin
    .from('contracts')
    .update({ contract_status: 'terminat', termination_reason: 'Expirare contract' })
    .eq('contract_status', 'activ')
    .not('end_date', 'is', null)
    .lt('end_date', today)
    .select('id, candidate_id')

  // 2. Actualizează candidații fără contracte active → pasiv
  const affectedCandidateIds = [...new Set((expired ?? []).map(c => c.candidate_id).filter(Boolean))]

  const passivized: string[] = []
  for (const candidateId of affectedCandidateIds) {
    const { data: activeContracts } = await admin
      .from('contracts')
      .select('id')
      .eq('candidate_id', candidateId)
      .eq('contract_status', 'activ')

    if (!activeContracts?.length) {
      await admin
        .from('candidates')
        .update({ candidate_status: 'pasiv' })
        .eq('id', candidateId)
        .eq('candidate_status', 'angajat')
      passivized.push(candidateId)
    }
  }

  return NextResponse.json({
    contracts_terminated: expired?.length ?? 0,
    candidates_passivized: passivized.length,
  })
}
