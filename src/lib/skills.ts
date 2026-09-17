import type { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export interface SkillRow {
  id: string
  name: string
  category: string
}

export async function resolveSkillNames(supabase: SupabaseClient, names: string[]): Promise<SkillRow[]> {
  const cleaned = [...new Set(names.map(n => n.trim()).filter(Boolean))]
  if (cleaned.length === 0) return []

  const { data: allSkills } = await supabase.from('skills').select('id, name, category')
  const skillMap = new Map((allSkills ?? []).map((s: SkillRow) => [s.name.toLowerCase(), s]))

  const resolved: SkillRow[] = []
  for (const name of cleaned) {
    const existing = skillMap.get(name.toLowerCase())
    if (existing) {
      resolved.push(existing)
      continue
    }
    const { data: created } = await supabase
      .from('skills')
      .insert({ name, category: 'General' })
      .select('id, name, category')
      .single()
    if (created) {
      resolved.push(created)
      skillMap.set(created.name.toLowerCase(), created)
    }
  }
  return resolved
}
