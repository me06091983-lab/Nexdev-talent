import type { SupabaseClient } from '@supabase/supabase-js'

type VisibleCheck = (c: { id: string; candidate_status?: string | null; created_by?: string | null }) => boolean

// Recruiters only see candidates they uploaded or submitted themselves; employed ones only if they submitted them.
export async function candidateVisibility(supabase: SupabaseClient): Promise<VisibleCheck> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return () => false
  if (user.app_metadata?.role === 'admin') return () => true

  const { data } = await supabase
    .from('submissions')
    .select('candidate_id')
    .eq('submitted_by', user.id)
    .is('deleted_at', null)
  const submitted = new Set((data ?? []).map((s: { candidate_id: string }) => s.candidate_id))
  return c => {
    if (c.candidate_status === 'angajat') return submitted.has(c.id)
    return c.created_by === user.id || submitted.has(c.id)
  }
}
