import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { description } = await req.json()

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Job Description missing. Please fill in the role JD first.' }, { status: 400 })
  }

  const prompt = `You are a senior technical recruiter at NexDev, an IT staffing company. Analyse the Job Description below and generate a Rubix Matrix evaluation rubric.

JOB DESCRIPTION:
${description.slice(0, 8000)}

INSTRUCTIONS:
1. Extract 6–10 key evaluation criteria from the "Required Knowledge", "Required Experience", "Responsibilities" and other relevant sections in the JD.
2. Each criterion must be a clear, concise sentence describing WHAT you evaluate in the candidate (e.g., "4+ years demonstrated industry experience", "Proficiency in Python, C++ or Java").
3. Assign each criterion a weight percentage. The TOTAL must be EXACTLY 100%.
4. More important / more frequently mentioned criteria receive higher weights.
5. Do NOT use individual skills as criteria — group them into composite categories (e.g., not "Python" and "Java" separately, but "Proficiency in modern languages — Python, C++ or Java").
6. Write ALL criterion text in English.
7. Respond ONLY with valid JSON, no additional text.

JSON format:
{"criteria":[{"criterion":"Full criterion text","weight":20},{"criterion":"Another criterion","weight":15}]}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Invalid AI response.' }, { status: 500 })
  }

  let result: { criteria: { criterion: string; weight: number }[] }
  try {
    result = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI.' }, { status: 500 })
  }

  const criteria = (result.criteria ?? []).map((c, i) => ({
    order_index: i,
    criterion: c.criterion,
    weight: Math.max(0, Math.min(100, Math.round(c.weight))),
  }))

  return NextResponse.json({ criteria })
}
