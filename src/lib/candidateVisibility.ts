import type { SupabaseClient } from '@supabase/supabase-js'

type VisibleCheck = (c: { id: string; candidate_status?: string | null }) => boolean

// Recruiters don't see employed candidates, except the ones they submitted themselves.
export async function candidateVisibility(supabase: SupabaseClient): Promise<VisibleCheck> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return () => false
  if (user.app_metadata?.role === 'admin') return () => true

  const { data } = await supabase
    .from('submissions')
    .select('candidate_id')
    .eq('submitted_by', user.id)
    .is('deleted_at', null)
  const mine = new Set((data ?? []).map((s: { candidate_id: string }) => s.candidate_id))
  return c => c.candidate_status !== 'angajat' || mine.has(c.id)
}
