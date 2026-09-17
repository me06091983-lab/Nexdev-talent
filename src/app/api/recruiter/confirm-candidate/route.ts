import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { resolveSkillNames } from '@/lib/skills'

interface ProposedCandidate {
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  linkedin_url?: string | null
  location?: string | null
  seniority?: string | null
  skills?: string[]
  summary?: string | null
  cv_file_path?: string | null
  source: 'linkedin' | 'cv_upload' | 'manual'
}

const VALID_SENIORITY = new Set(['junior', 'mid', 'senior', 'lead', 'principal'])

export async function POST(request: NextRequest) {
  const { role_id, candidate, add_to_pipeline } = (await request.json()) as {
    role_id?: string
    candidate?: ProposedCandidate
    add_to_pipeline?: boolean
  }

  if (!role_id || !candidate?.first_name || !candidate?.last_name) {
    return NextResponse.json({ error: 'role_id, first_name and last_name are required' }, { status: 400 })
  }

  const supabase = await createClient()

  const skillRows = await resolveSkillNames(supabase, candidate.skills ?? [])

  const { data: newCandidate, error: insertError } = await supabase
    .from('candidates')
    .insert({
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email || null,
      phone: candidate.phone || null,
      linkedin_url: candidate.linkedin_url || null,
      location: candidate.location || null,
      seniority: VALID_SENIORITY.has(candidate.seniority ?? '') ? candidate.seniority : null,
      cv_file_path: candidate.cv_file_path || null,
      source_type: 'own',
      notes: candidate.summary ? `Added via Recruiter (${candidate.source}): ${candidate.summary}` : null,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  if (skillRows.length > 0) {
    await supabase.from('candidate_skills').insert(
      skillRows.map(s => ({ candidate_id: newCandidate.id, skill_id: s.id }))
    )
  }

  await supabase.from('recruiter_discovered_candidates').upsert(
    {
      role_id,
      candidate_id: newCandidate.id,
      score: 0,
      matched_skills: skillRows.map(s => s.name),
      missing_skills: [],
      summary: candidate.summary ?? '',
      rate_min: null,
      rate_wish: null,
      currency: 'EUR',
      source: candidate.source,
    },
    { onConflict: 'role_id,candidate_id' }
  )

  let pipelineChanged = false
  if (add_to_pipeline) {
    const { error: subError } = await supabase
      .from('submissions')
      .insert({ candidate_id: newCandidate.id, role_id, status: 'pipeline' })
    pipelineChanged = !subError
  }

  return NextResponse.json({
    candidate_id: newCandidate.id,
    candidate_name: `${newCandidate.first_name} ${newCandidate.last_name}`,
    score: 0,
    matched_skills: skillRows.map(s => s.name),
    missing_skills: [],
    summary: candidate.summary ?? '',
    rate_min: null,
    rate_wish: null,
    currency: 'EUR',
    cv_file_path: candidate.cv_file_path ?? null,
    source: candidate.source,
    pipelineChanged,
  })
}
