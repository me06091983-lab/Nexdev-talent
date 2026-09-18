import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  return NextResponse.json({
    email: user.email ?? null,
    partner_name: (user.user_metadata?.partner_name as string | undefined) ?? null,
  })
}
