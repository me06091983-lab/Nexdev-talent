import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { generateCVDocx, CVCandidate, CVExperience, CVCertification } from '@/lib/generate-cv'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function generateProfileSummary(candidate: {
  first_name: string
  last_name: string
  seniority: string | null
  profile_name: string | null
  skills: string[]
  experiences: CVExperience[]
}): Promise<string> {
  const expText = candidate.experiences.slice(0, 4).map(e =>
    `${e.role} @ ${e.company} (${e.start_date ?? '?'} – ${e.is_present ? 'prezent' : (e.end_date ?? '?')})`
  ).join('; ')

  const prompt = `Write a concise 3-sentence professional profile summary in English for a CV/resume.
Candidate: ${candidate.first_name} ${candidate.last_name}
Level: ${candidate.seniority ?? 'Senior'}
Profile: ${candidate.profile_name ?? 'IT Professional'}
Top skills: ${candidate.skills.slice(0, 8).join(', ')}
Recent experience: ${expText}

Rules:
- Start with their job title and years of experience (estimate from oldest experience if possible)
- Mention top 2-3 technical strengths
- End with what they bring to teams/clients
- Professional tone, no fluff, no first person
- Return ONLY the profile text, no quotes or labels`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('candidates')
    .select(`
      first_name, last_name, email, phone, location, linkedin_url,
      seniority, notes,
      profile:profiles(name),
      candidate_skills(skill:skills(id, name, category)),
      experiences, certifications
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Candidat negăsit' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any
  const profileName: string | null = (Array.isArray(raw.profile) ? raw.profile[0] : raw.profile)?.name ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const skills: string[] = (raw.candidate_skills ?? []).map((cs: any) => {
    const s = Array.isArray(cs.skill) ? cs.skill[0] : cs.skill
    return s?.name as string
  }).filter(Boolean)

  const experiences: CVExperience[] = (raw.experiences ?? []).map((e: CVExperience) => ({
    role:        e.role        ?? '',
    company:     e.company     ?? '',
    start_date:  e.start_date  ?? null,
    end_date:    e.end_date    ?? null,
    is_present:  e.is_present  ?? false,
    location:    e.location    ?? null,
    description: e.description ?? null,
  }))

  const certifications: CVCertification[] = (raw.certifications ?? []).map((c: CVCertification) => ({
    name:           c.name           ?? '',
    issuer:         c.issuer         ?? null,
    date_obtained:  c.date_obtained  ?? null,
  }))

  // Generate AI profile summary
  const profileSummary = await generateProfileSummary({
    first_name:   raw.first_name,
    last_name:    raw.last_name,
    seniority:    raw.seniority,
    profile_name: profileName,
    skills,
    experiences,
  })

  const candidate: CVCandidate = {
    first_name:      raw.first_name,
    last_name:       raw.last_name,
    email:           raw.email           ?? null,
    phone:           raw.phone           ?? null,
    location:        raw.location        ?? null,
    linkedin_url:    raw.linkedin_url    ?? null,
    seniority:       raw.seniority       ?? null,
    profile_name:    profileName,
    skills,
    languages:       [],          // not stored separately in DB yet — can be added later
    education:       null,        // not stored separately in DB yet — can be added later
    experiences,
    certifications,
    profile_summary: profileSummary,
  }

  const buffer = await generateCVDocx(candidate)

  const fileName = `CV_${raw.first_name}_${raw.last_name}_NexDev.docx`
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '')

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
