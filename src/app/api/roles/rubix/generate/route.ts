import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { description } = await req.json()

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Job Description lipsă. Completează mai întâi JD-ul rolului.' }, { status: 400 })
  }

  const prompt = `Ești un recrutor tehnic senior la NexDev, firmă de staffing IT. Analizează JD-ul de mai jos și generează o Rubrix Matrix de evaluare, exact ca în modelul nostru intern.

JOB DESCRIPTION:
${description.slice(0, 8000)}

INSTRUCȚIUNI:
1. Extrage 6–10 criterii de evaluare cheie din secțiunile "Required Knowledge", "Required Experience", "Responsibilities" și altele relevante din JD.
2. Fiecare criteriu trebuie să fie o propoziție clară și concisă care descrie CE evaluezi la candidat (ex: "4+ ani experiență industrie demonstrată", "Proficiency în Python, C++ sau Java").
3. Asignează fiecărui criteriu o pondere (weight) în procente. SUMA TOTALĂ trebuie să fie EXACT 100%.
4. Criteriile mai importante / mai des menționate în JD primesc ponderi mai mari.
5. Nu folosi skilluri individuale ca criterii — grupează-le în categorii compuse (ex: nu "Python" și "Java" separat, ci "Proficiency în limbaje moderne — Python, C++ sau Java").
6. Răspunde DOAR cu JSON valid, fără text suplimentar.

Format JSON:
{"criteria":[{"criterion":"Text criteriu complet","weight":20},{"criterion":"Alt criteriu","weight":15}]}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Răspuns invalid de la AI.' }, { status: 500 })
  }

  let result: { criteria: { criterion: string; weight: number }[] }
  try {
    result = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'JSON invalid de la AI.' }, { status: 500 })
  }

  const criteria = (result.criteria ?? []).map((c, i) => ({
    order_index: i,
    criterion: c.criterion,
    weight: Math.max(0, Math.min(100, Math.round(c.weight))),
  }))

  return NextResponse.json({ criteria })
}
