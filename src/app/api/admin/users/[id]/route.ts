import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Acces interzis.' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = {}

  if (body.role && ['admin', 'recruiter'].includes(body.role)) {
    updates.app_metadata = { role: body.role }
  }

  if (body.password) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: 'Parola trebuie să aibă cel puțin 6 caractere.' }, { status: 400 })
    }
    updates.password = body.password
  }

  // Name / phone go into user_metadata (Supabase merges, doesn't replace)
  const metaFields: Record<string, string> = {}
  if (body.first_name !== undefined) metaFields.first_name = body.first_name
  if (body.last_name  !== undefined) metaFields.last_name  = body.last_name
  if (body.phone      !== undefined) metaFields.phone      = body.phone
  if (Object.keys(metaFields).length > 0) updates.user_metadata = metaFields

  // Enable / disable via ban_duration
  if (typeof body.enabled === 'boolean') {
    // Cannot disable own account
    if (!body.enabled && caller.id === id) {
      return NextResponse.json({ error: 'Nu poți dezactiva propriul cont.' }, { status: 400 })
    }
    updates.ban_duration = body.enabled ? 'none' : '876600h'
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nimic de actualizat.' }, { status: 400 })
  }

  const { error } = await admin.auth.admin.updateUserById(id, updates)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Acces interzis.' }, { status: 403 })

  const { id } = await params

  if (caller.id === id) {
    return NextResponse.json({ error: 'Nu poți șterge propriul cont.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
