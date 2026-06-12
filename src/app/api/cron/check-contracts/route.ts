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

  const { data: angajati } = await admin
    .from('candidates')
    .select('id')
    .eq('candidate_status', 'angajat')

  if (!angajati?.length) return NextResponse.json({ updated: 0 })

  const toPassivize: string[] = []

  for (const candidate of angajati) {
    const { data: allContracts } = await admin
      .from('contracts')
      .select('id')
      .eq('candidate_id', candidate.id)

    if (!allContracts?.length) continue

    const { data: activeContracts } = await admin
      .from('contracts')
      .select('id')
      .eq('candidate_id', candidate.id)
      .or(`end_date.is.null,end_date.gte.${today}`)

    if (!activeContracts?.length) {
      toPassivize.push(candidate.id)
    }
  }

  if (toPassivize.length > 0) {
    await admin
      .from('candidates')
      .update({ candidate_status: 'pasiv' })
      .in('id', toPassivize)
  }

  return NextResponse.json({ updated: toPassivize.length, passivized: toPassivize })
}
