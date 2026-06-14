import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return null
  return user
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Acces interzis.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = (data.users as any[]).map(u => ({
    id: u.id,
    email: u.email ?? '',
    first_name: (u.user_metadata?.first_name as string) ?? '',
    last_name:  (u.user_metadata?.last_name  as string) ?? '',
    phone:      (u.user_metadata?.phone       as string) ?? '',
    role:       (u.app_metadata?.role         as string) ?? 'recruiter',
    enabled:    !u.banned_until || new Date(u.banned_until) <= new Date(),
    created_at:      u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }))

  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Acces interzis.' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, role, first_name = '', last_name = '', phone = '', enabled = true } = body

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Email, parolă și rol sunt obligatorii.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Parola trebuie să aibă cel puțin 6 caractere.' }, { status: 400 })
  }
  if (!['admin', 'recruiter'].includes(role)) {
    return NextResponse.json({ error: 'Rol invalid.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    user_metadata:  { first_name, last_name, phone },
    app_metadata:   { role },
    email_confirm:  true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(enabled === false ? { ban_duration: '876600h' } as any : {}),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.user.id }, { status: 201 })
}
