import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { description } = await req.json()
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Job description lipsă' }, { status: 400 })
  }

  // Fetch all skills from nomenclator
  const supabase = await createClient()
  const { data: allSkills } = await supabase
    .from('skills')
    .select('id, name, category')
    .order('name')

  const skillNames = (allSkills ?? []).map(s => s.name).join(', ')

  const prompt = `Ești un recrutor tehnic senior. Analizează job description-ul de mai jos și extrage skillurile tehnice menționate.

JOB DESCRIPTION:
${description.slice(0, 8000)}

NOMENCLATOR SKILLURI DISPONIBILE:
${skillNames}

Instrucțiuni:
1. Identifică skillurile marcate ca OBLIGATORII/REQUIRED (Must have, Required Knowledge, Required Skills etc.)
2. Identifică skillurile marcate ca PREFERATE/NICE-TO-HAVE (Preferred, Desirable, Beneficial etc.)
3. Mapează STRICT pe skillurile din nomenclatorul de mai sus — folosește EXACT numele din nomenclator.
4. Dacă un skill menționat în JD nu există în nomenclator, ignoră-l.
5. Nu inventa skilluri care nu sunt în nomenclator.

Răspunde DOAR cu JSON valid:
{"required":["NumeSkill1","NumeSkill2"],"preferred":["NumeSkill3","NumeSkill4"]}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Nu s-au putut extrage skillurile.' }, { status: 500 })
  }

  let extracted: { required: string[]; preferred: string[] }
  try {
    extracted = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Răspuns invalid de la AI.' }, { status: 500 })
  }

  // Match extracted names against DB skills (case-insensitive)
  const skillMap = new Map((allSkills ?? []).map(s => [s.name.toLowerCase(), s]))

  const required = (extracted.required ?? [])
    .map(name => skillMap.get(name.toLowerCase()))
    .filter(Boolean) as { id: string; name: string; category: string }[]

  const preferred = (extracted.preferred ?? [])
    .map(name => skillMap.get(name.toLowerCase()))
    .filter(Boolean) as { id: string; name: string; category: string }[]

  return NextResponse.json({ required, preferred })
}
