import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import mammoth from 'mammoth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Skill { id: string; name: string; category: string }

const PROMPT = `Analizează acest CV în detaliu și extrage TOATE informațiile disponibile în format JSON.

REGULI CRITICE pentru formatare:
- Pentru câmpurile "description" și "achievements.description": păstrează EXACT formatarea originală
  - Folosește \\n pentru rânduri noi
  - Păstrează bullet points cu "• " sau "- " exact cum apar în original
  - Nu comprima mai multe rânduri într-unul singur
  - Nu combina paragrafe separate - păstrează structura originală
- Copiază textul INTEGRAL, fără să trunchiezi sau să rezumi

Format JSON de returnat:
{
  "first_name": "prenumele candidatului",
  "last_name": "numele de familie",
  "email": "adresa de email sau null",
  "phone": "numărul de telefon sau null",
  "linkedin_url": "URL LinkedIn sau null",
  "location": "orașul/țara sau null",
  "seniority": "junior|mid|senior|lead|principal sau null",
  "skills_detected": ["lista completă de skilluri tehnice și non-tehnice din CV"],
  "experiences": [
    {
      "company": "numele companiei",
      "role": "titlul poziției",
      "start_date": "YYYY-MM sau null",
      "end_date": "YYYY-MM sau null dacă is_present=true",
      "is_present": true sau false,
      "location": "locația sau null",
      "description": "TEXTUL COMPLET din CV pentru acest rol, cu \\n între rânduri și bullet points păstrate"
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
      "description": "TEXTUL COMPLET al descrierii proiectului, cu \\n între rânduri",
      "technologies": "tehnologiile ca text sau null",
      "url": "URL-ul sau null"
    }
  ],
  "achievements": [
    {
      "title": "titlul realizării",
      "description": "descrierea completă cu formatare păstrată"
    }
  ]
}

Răspunde DOAR cu JSON-ul valid, fără text suplimentar.`

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('cv') as File
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const isDocx = file.type.includes('word') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')

  if (!isPdf && !isDocx) {
    return NextResponse.json({ error: 'Tip fișier neacceptat. Folosește PDF sau DOCX.' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  let content: Anthropic.MessageParam['content']

  if (isPdf) {
    const base64 = Buffer.from(bytes).toString('base64')
    content = [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as unknown as Anthropic.TextBlockParam,
      { type: 'text', text: PROMPT },
    ]
  } else {
    // Extrage textul din DOCX cu mammoth
    let extractedText = ''
    try {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
      extractedText = result.value
    } catch {
      return NextResponse.json({ error: 'Nu s-a putut citi fișierul DOCX. Încearcă să îl salvezi ca PDF.' }, { status: 400 })
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Fișierul DOCX pare gol sau are conținut protejat.' }, { status: 400 })
    }

    content = [{
      type: 'text',
      text: `Conținut CV extras din DOCX:\n\n${extractedText}\n\n---\n\n${PROMPT}`,
    }]
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Nu s-a putut parsa CV-ul' }, { status: 500 })

    const parsed = JSON.parse(jsonMatch[0])

    // Rezolvă skillurile server-side
    if (parsed.skills_detected?.length) {
      const supabase = await createClient()
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
    const addIds = (arr: unknown[]) => arr?.map((item) => ({ id: crypto.randomUUID(), ...(item as object) })) ?? []
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
