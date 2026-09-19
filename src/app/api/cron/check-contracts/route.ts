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

  // Candidate statuses follow automatically via the contracts_candidate_status DB trigger.
  return NextResponse.json({ contracts_terminated: expired?.length ?? 0 })
}
