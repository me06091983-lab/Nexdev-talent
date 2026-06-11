import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import mammoth from 'mammoth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Skill { id: string; name: string; category: string }

function recoverPartialJson(text: string): Record<string, unknown> | null {
  // Extrage câmpurile scalare dintr-un JSON trunchiat
  const get = (key: string) => {
    const m = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`) )
    return m ? m[1] : null
  }
  const first_name = get('first_name')
  const last_name = get('last_name')
  if (!first_name && !last_name) return null

  const arrMatch = (key: string) => {
    const m = text.match(new RegExp(`"${key}"\\s*:\\s*(\\[[\\s\\S]*?)(?=,\\s*"\\w+"|\\s*\\}\\s*$)`))
    if (!m) return []
    try { return JSON.parse(m[1] + ']') } catch { return [] }
  }

  return {
    first_name,
    last_name,
    email: get('email'),
    phone: get('phone'),
    linkedin_url: get('linkedin_url'),
    location: get('location'),
    seniority: get('seniority'),
    skills_detected: arrMatch('skills_detected'),
    experiences: arrMatch('experiences'),
    certifications: arrMatch('certifications'),
    projects: arrMatch('projects'),
    achievements: arrMatch('achievements'),
  }
}

const PROMPT = `Analizează acest CV și extrage informațiile în format JSON.

REGULI pentru descrieri:
- Folosește \\n pentru rânduri noi
- Păstrează bullet points cu "• " sau "- "
- Limitează fiecare câmp "description" la maxim 800 caractere (trunchiază cu "..." dacă e mai lung)

Format JSON de returnat:
{
  "first_name": "prenumele candidatului",
  "last_name": "numele de familie",
  "email": "adresa de email sau null",
  "phone": "numărul de telefon sau null",
  "linkedin_url": "URL LinkedIn sau null",
  "location": "orașul/țara sau null",
  "seniority": "junior|mid|senior|lead|principal sau null",
  "skills_detected": ["lista de skilluri tehnice din CV"],
  "experiences": [
    {
      "company": "numele companiei",
      "role": "titlul poziției",
      "start_date": "YYYY-MM sau null",
      "end_date": "YYYY-MM sau null",
      "is_present": true sau false,
      "location": "locația sau null",
      "description": "descrierea rolului, max 800 caractere"
    }
  ],
  "certifications": [
    {
      "name": "numele certificării",
      "issuer": "organizația emitentă sau null",
      "date_obtained": "YYYY-MM sau null"
    }
  ],
  "projects": [
    {
      "name": "numele proiectului",
      "description": "descrierea proiectului, max 400 caractere",
      "technologies": "tehnologiile ca text sau null",
      "url": "URL-ul sau null"
    }
  ],
  "achievements": [
    {
      "title": "titlul realizării",
      "description": "descrierea, max 400 caractere"
    }
  ]
}

Răspunde DOAR cu JSON-ul valid, fără text suplimentar.`

async function buildContent(bytes: ArrayBuffer, fileName: string): Promise<{ content: Anthropic.MessageParam['content'] } | { error: string }> {
  const isPdf = fileName.toLowerCase().endsWith('.pdf')
  const isDocx = fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc')

  if (!isPdf && !isDocx) {
    return { error: 'Tip fișier neacceptat. Folosește PDF sau DOCX.' }
  }

  if (isPdf) {
    const base64 = Buffer.from(bytes).toString('base64')
    return {
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as unknown as Anthropic.TextBlockParam,
        { type: 'text', text: PROMPT },
      ]
    }
  } else {
    let extractedText = ''
    try {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
      extractedText = result.value
    } catch {
      return { error: 'Nu s-a putut citi fișierul DOCX. Încearcă să îl salvezi ca PDF.' }
    }
    if (!extractedText.trim()) {
      return { error: 'Fișierul DOCX pare gol sau are conținut protejat.' }
    }
    return {
      content: [{
        type: 'text',
        text: `Conținut CV extras din DOCX:\n\n${extractedText}\n\n---\n\n${PROMPT}`,
      }]
    }
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const contentType = request.headers.get('content-type') ?? ''
  let bytes: ArrayBuffer
  let fileName: string

  if (contentType.includes('multipart/form-data')) {
    // Fișier trimis direct
    const formData = await request.formData()
    const file = formData.get('cv') as File
    if (!file) return NextResponse.json({ error: 'Niciun fișier primit.' }, { status: 400 })
    bytes = await file.arrayBuffer()
    fileName = file.name
  } else {
    // Parsare CV existent din storage (file_path)
    const body = await request.json()
    if (!body.file_path) return NextResponse.json({ error: 'file_path sau fișier necesar.' }, { status: 400 })
    const admin = createAdminClient()
    const { data, error } = await admin.storage.from('cvs').download(body.file_path)
    if (error || !data) return NextResponse.json({ error: 'Nu s-a putut descărca CV-ul din storage.' }, { status: 500 })
    bytes = await data.arrayBuffer()
    fileName = body.file_path
  }

  const built = await buildContent(bytes, fileName)
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 })
  const { content } = built

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{ role: 'user', content }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Nu s-a putut parsa CV-ul. Încearcă din nou.' }, { status: 500 })

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      // JSON trunchiat — încearcă să recupereze ce s-a extras
      const partial = recoverPartialJson(jsonMatch[0])
      if (!partial) return NextResponse.json({ error: 'CV-ul este prea lung pentru a fi procesat complet. Încearcă un CV mai scurt sau în format DOCX.' }, { status: 500 })
      parsed = partial
    }

    // Rezolvă skillurile server-side
    if ((parsed.skills_detected as unknown[])?.length) {
      const { data: allSkills } = await supabase.from('skills').select('*')
      const skillMap = new Map((allSkills ?? []).map((s: Skill) => [s.name.toLowerCase(), s]))

      const matched_skills: Skill[] = []
      for (const skillName of parsed.skills_detected as string[]) {
        const trimmed = skillName.trim()
        if (!trimmed) continue
        const existing = skillMap.get(trimmed.toLowerCase())
        if (existing) {
          matched_skills.push(existing)
        } else {
          const { data: newSkill } = await supabase
            .from('skills')
            .insert({ name: trimmed, category: 'General' })
            .select()
            .single()
          if (newSkill) {
            matched_skills.push(newSkill)
            skillMap.set(newSkill.name.toLowerCase(), newSkill)
          }
        }
      }
      parsed.matched_skills = matched_skills
    }

    // Adaugă id-uri locale
    const addIds = (arr: unknown) => Array.isArray(arr) ? arr.map((item) => ({ id: crypto.randomUUID(), ...(item as object) })) : []
    parsed.experiences = addIds(parsed.experiences)
    parsed.certifications = addIds(parsed.certifications)
    parsed.projects = addIds(parsed.projects)
    parsed.achievements = addIds(parsed.achievements)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('CV parse error:', err)
    return NextResponse.json({ error: 'Eroare la procesarea CV-ului' }, { status: 500 })
  }
}
