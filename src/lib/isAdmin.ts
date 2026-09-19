import { createClient } from '@/lib/supabase/server'

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.app_metadata?.role === 'admin'
}

export function withoutRoleRate<T extends { rate?: unknown }>(role: T): T {
  return { ...role, rate: null }
}
