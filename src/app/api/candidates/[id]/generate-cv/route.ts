export const runtime = 'nodejs'

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { generateCVPdf, CVDataPDF, CVExperiencePDF, CVCertificationPDF, CVEducationPDF } from '@/lib/generate-cv-pdf'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Extraction prompt — reads full CV with no truncation ─────────────────────

const EXTRACT_PROMPT = `You are a CV data extractor. Your ONLY job is to faithfully copy information from this CV into JSON format.

CRITICAL RULES:
- Copy ALL experiences, skills, and certifications exactly as written in the CV — do NOT omit any
- Do NOT invent, summarize, or add information not present in the CV
- For experience descriptions: copy the full text verbatim (all bullet points). Only fix obvious typos or format ambiguous sentences so they read clearly in English — keep all technical details and achievements intact
- For skills: extract every technical skill, tool, and technology mentioned anywhere in the CV
- For certifications: copy every certificate and training listed
- profile_summary: copy the existing summary/objective section verbatim if present, otherwise return null

Return ONLY valid JSON (no markdown, no text outside JSON):
{
  "first_name": "string",
  "last_name": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "city/country or null",
  "linkedin_url": "full LinkedIn URL or null",
  "seniority": "junior|mid|senior|lead|principal or null",
  "profile_name": "primary job title from CV or null",
  "profile_summary": "verbatim summary/objective section if present in CV, otherwise null",
  "skills": ["every technical skill, tool, technology, framework mentioned in the CV"],
  "languages": ["spoken languages only — English, Romanian, French, etc."],
  "education": [
    {
      "degree": "exact degree name",
      "institution": "exact institution name",
      "year": "graduation year YYYY or null"
    }
  ],
  "experiences": [
    {
      "company": "company name",
      "role": "job title",
      "start_date": "YYYY-MM or null",
      "end_date": "YYYY-MM or null",
      "is_present": true or false,
      "location": "city or null",
      "description": "full description — copy all bullet points separated by \\n. Fix typos and clarify ambiguous wording but keep all content"
    }
  ],
  "certifications": [
    {
      "name": "exact certification name",
      "issuer": "issuing organization or null",
      "date_obtained": "YYYY-MM or null"
    }
  ]
}`

async function extractFromFile(bytes: ArrayBuffer, fileName: string): Promise<Record<string, unknown>> {
  const isPdf = fileName.toLowerCase().endsWith('.pdf')
  const isDocx = fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc')

  let content: Anthropic.MessageParam['content']

  if (isPdf) {
    const base64 = Buffer.from(bytes).toString('base64')
    content = [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as unknown as Anthropic.TextBlockParam,
      { type: 'text', text: EXTRACT_PROMPT },
    ]
  } else if (isDocx) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
    const text = result.value
    if (!text.trim()) throw new Error('Fișierul DOCX este gol sau protejat')
    content = [{ type: 'text', text: `CV content:\n\n${text}\n\n---\n\n${EXTRACT_PROMPT}` }]
  } else {
    throw new Error('Format fișier nesuportat')
  }

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude nu a returnat JSON valid')

  return JSON.parse(match[0]) as Record<string, unknown>
}

async function generateProfileSummary(data: Record<string, unknown>): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exps = (data.experiences as any[])?.slice(0, 3)
    .map((e: { role?: string; company?: string; start_date?: string; is_present?: boolean; end_date?: string }) =>
      `${e.role ?? ''} @ ${e.company ?? ''}`)
    .join('; ') ?? ''

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{
      role: 'user',
      content: `Write a concise 3-sentence professional profile summary in English for a CV.
Candidate: ${data.first_name} ${data.last_name}
Level: ${data.seniority ?? 'Senior'}
Title: ${data.profile_name ?? 'IT Professional'}
Top skills: ${(data.skills as string[])?.slice(0, 8).join(', ') ?? ''}
Recent experience: ${exps}

Rules: start with title and years of experience, mention top 2-3 strengths, end with value they bring.
Professional tone, no first person. Return ONLY the summary text.`,
    }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  // Fetch candidate — need cv_file_path and fallback fields
  const { data: candidate, error: fetchErr } = await supabase
    .from('candidates')
    .select(`
      first_name, last_name, email, phone, location, linkedin_url,
      seniority, cv_file_path,
      profile:profiles(name),
      candidate_skills(skill:skills(id, name, category)),
      experiences, certifications
    `)
    .eq('id', id)
    .single()

  if (fetchErr || !candidate) {
    return NextResponse.json({ error: 'Candidat negăsit' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = candidate as any
  const cvFilePath: string | null = raw.cv_file_path ?? null

  let cvData: CVDataPDF

  if (cvFilePath) {
    // ── Path A: read original CV from storage → extract with Claude Sonnet ──
    try {
      const { data: fileData, error: dlErr } = await supabase.storage
        .from('cvs')
        .download(cvFilePath)

      if (dlErr || !fileData) throw new Error('Nu s-a putut descărca CV-ul original')

      const bytes = await fileData.arrayBuffer()
      const extracted = await extractFromFile(bytes, cvFilePath)

      // Generate profile summary if CV doesn't have one
      const profileSummary = (extracted.profile_summary as string | null)?.trim()
        || await generateProfileSummary(extracted)

      cvData = {
        first_name:      (extracted.first_name as string)  || raw.first_name  || '',
        last_name:       (extracted.last_name as string)   || raw.last_name   || '',
        email:           (extracted.email as string | null)    ?? raw.email    ?? null,
        phone:           (extracted.phone as string | null)    ?? raw.phone    ?? null,
        location:        (extracted.location as string | null) ?? raw.location ?? null,
        linkedin_url:    (extracted.linkedin_url as string | null) ?? raw.linkedin_url ?? null,
        seniority:       (extracted.seniority as string | null)    ?? raw.seniority    ?? null,
        profile_name:    (extracted.profile_name as string | null) ?? (Array.isArray(raw.profile) ? raw.profile[0] : raw.profile)?.name ?? null,
        profile_summary: profileSummary,
        skills:          (extracted.skills as string[]) ?? [],
        languages:       (extracted.languages as string[]) ?? [],
        education:       ((extracted.education as CVEducationPDF[]) ?? []),
        experiences:     ((extracted.experiences as CVExperiencePDF[]) ?? []),
        certifications:  ((extracted.certifications as CVCertificationPDF[]) ?? []),
      }

    } catch (err) {
      console.error('CV extraction error:', err)
      // Fall through to Path B on error
      cvData = await buildFromDb(raw)
    }

  } else {
    // ── Path B: no original CV — use DB data ──
    cvData = await buildFromDb(raw)
  }

  const buffer = await generateCVPdf(cvData)
  const fileName = `CV_${cvData.first_name}_${cvData.last_name}_NexDev.pdf`
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '')

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}

// ─── Build CVDataPDF from DB when no original CV is available ─────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildFromDb(raw: any): Promise<CVDataPDF> {
  const profileName: string | null = (Array.isArray(raw.profile) ? raw.profile[0] : raw.profile)?.name ?? null

  const skills: string[] = (raw.candidate_skills ?? []).map((cs: { skill: { name: string } | { name: string }[] }) => {
    const s = Array.isArray(cs.skill) ? cs.skill[0] : cs.skill
    return s?.name as string
  }).filter(Boolean)

  const experiences: CVExperiencePDF[] = (raw.experiences ?? []).map((e: CVExperiencePDF) => ({
    role:        e.role        ?? '',
    company:     e.company     ?? '',
    start_date:  e.start_date  ?? null,
    end_date:    e.end_date    ?? null,
    is_present:  e.is_present  ?? false,
    location:    e.location    ?? null,
    description: e.description ?? null,
  }))

  const certifications: CVCertificationPDF[] = (raw.certifications ?? []).map((c: CVCertificationPDF) => ({
    name:          c.name          ?? '',
    issuer:        c.issuer        ?? null,
    date_obtained: c.date_obtained ?? null,
  }))

  const profileSummary = await generateProfileSummary({
    first_name:   raw.first_name,
    last_name:    raw.last_name,
    seniority:    raw.seniority,
    profile_name: profileName,
    skills,
    experiences,
  })

  return {
    first_name:      raw.first_name     ?? '',
    last_name:       raw.last_name      ?? '',
    email:           raw.email          ?? null,
    phone:           raw.phone          ?? null,
    location:        raw.location       ?? null,
    linkedin_url:    raw.linkedin_url   ?? null,
    seniority:       raw.seniority      ?? null,
    profile_name:    profileName,
    profile_summary: profileSummary,
    skills,
    languages:       [],
    education:       [],
    experiences,
    certifications,
  }
}
