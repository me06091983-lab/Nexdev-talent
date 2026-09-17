import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { matchCandidatesForRole, searchCandidatesByKeyword, type MatchResult } from '@/lib/matching'
import { buildAttachmentBlock } from '@/lib/attachments'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-opus-5'
const MAX_TOOL_STEPS = 5
const HISTORY_ROW_LIMIT = 48

const HOSTED_TOOLS: Anthropic.ToolUnion[] = [
  { type: 'web_search_20260209', name: 'web_search', max_uses: 5 },
  { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 5 },
]

const TOOLS = [
  {
    name: 'find_database_matches',
    description:
      'Search the NexDev candidate database for people who match the CURRENTLY SELECTED role, scored against its evaluation rubric (Rubix Matrix). Only returns candidates NOT already in the pipeline for this role. Use when the user asks to find or search matching/fitting candidates for this specific role, optionally above a score.',
    input_schema: {
      type: 'object' as const,
      properties: {
        min_score: { type: 'number', description: 'Minimum match score, 0-100. Default to 50 if the user does not specify one.' },
      },
    },
  },
  {
    name: 'search_candidates_by_keyword',
    description:
      'Search the FULL NexDev candidate database by free-text keyword (a skill, technology or seniority level) — not scored against any specific role. Use for broad lookups like "who knows Kubernetes" or "find senior AWS engineers", or when the selected role has no rubric yet.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Keyword(s) to search for, e.g. "AWS", "Kubernetes", "senior python".' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_pipeline_candidates',
    description: 'List the candidates currently in the pipeline for the selected role, with their current status and score.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'add_candidate_to_pipeline',
    description:
      'Add one specific candidate to the pipeline for the selected role. Only call this when the user clearly asks to add/shortlist a SPECIFIC candidate that was already identified by name earlier in this conversation (from a previous tool result), so you have their candidate_id.',
    input_schema: {
      type: 'object' as const,
      properties: {
        candidate_id: { type: 'string', description: 'The candidate UUID, taken from a previous search result in this conversation.' },
      },
      required: ['candidate_id'],
    },
  },
  {
    name: 'get_role_brief',
    description: 'Get the full brief for the selected role: title, client, job description, and the weighted evaluation criteria (Rubix Matrix).',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'propose_new_candidate',
    description:
      'Structure a candidate that is NOT yet in the NexDev database — typically pasted LinkedIn profile text, or a candidate the user describes manually. This does NOT save anything yet — it shows the user a confirmation card so they can review and explicitly approve before it is added to the database. Use this whenever the user pastes profile text/details about someone new, or asks you to "add" a person you do not already have a candidate_id for. Extract as much as you can from what was pasted; leave fields out if not mentioned.',
    input_schema: {
      type: 'object' as const,
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        linkedin_url: { type: 'string' },
        location: { type: 'string' },
        seniority: { type: 'string', enum: ['junior', 'mid', 'senior', 'lead', 'principal'] },
        skills: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string', description: 'One-sentence recruiter note on this person — seniority, strengths, fit.' },
        source: { type: 'string', enum: ['linkedin', 'manual'], description: '"linkedin" if this came from pasted LinkedIn content, "manual" otherwise.' },
      },
      required: ['first_name', 'last_name', 'source'],
    },
  },
]

function systemPrompt(roleTitle: string, clientName: string) {
  return `Ești asistentul de recrutare al NexDev, integrat direct în platforma internă de recrutare (nu ești Claude.ai generic — ești un coleg recruiter AI cu acces la baza de date reală a firmei).

Rolul selectat acum în interfață: "${roleTitle}" pentru clientul ${clientName}. Toate uneltele tale de recrutare (căutare, pipeline, adăugare) se referă implicit la acest rol, dacă utilizatorul nu specifică altceva.

Poți: căuta candidați din bază potriviți cu rubrica rolului curent, căuta candidați după cuvinte-cheie (skilluri) în toată baza, vedea cine e deja în pipeline pe rolul curent, adăuga un candidat anume (deja din bază) în pipeline, structura un candidat nou din text lipit (ex. profil LinkedIn copiat manual) pentru confirmare, și vedea brief-ul complet al rolului.

Ai acces la căutare live pe internet (web_search) și poți deschide/citi o pagină web anume (web_fetch) — folosește-le liber când utilizatorul întreabă ceva ce necesită informație curentă din afara bazei de date (despre o companie, o tehnologie, salarii de piață, etc.). Poți citi orice fișier pe care utilizatorul îl atașează în chat (PDF, Word, Excel, imagine, text) — conținutul lui apare direct în conversație, analizează-l și răspunde la ce a cerut despre el.

NU poți naviga automat pe LinkedIn (nu ai login acolo) — dacă utilizatorul cere să "cauți pe LinkedIn", explică-i clar: nu poți naviga automat pe profiluri LinkedIn, dar dacă îți lipește (paste) textul unui profil găsit de el, îl structurezi imediat cu propose_new_candidate. Nu inventa niciodată rezultate LinkedIn.

Ai memorie comună pe TOATE rolurile din acest workspace, nu doar pe cel curent — mai jos în conversație pot apărea mesaje din alte ferestre de rol, marcate cu "[Rol: ...]". Poți folosi acel context liber (ex. dacă utilizatorul întreabă "ce am discutat despre X la celălalt rol") — dar uneltele de recrutare tot operează implicit pe rolul curent, "${roleTitle}", exceptând cazul în care utilizatorul specifică alt rol explicit.

Poți răspunde și la întrebări generale, în afara recrutării (ca un asistent obișnuit) — nu te limita strict la unelte, dar rămâi util și la obiect.

Când utilizatorul lipește text despre o persoană (profil LinkedIn, CV ca text, descriere) și pare să vrea s-o adaugi, folosește propose_new_candidate — NU scrie datele extrase doar ca text în răspuns, pentru că interfața are nevoie de acel apel ca să afișeze cardul de confirmare cu butoane Add/Discard. Nu salvezi nimic direct — utilizatorul confirmă din interfață.

Când o unealtă de recrutare întoarce o listă de candidați, NU repeta toată lista în text — ea apare deja vizual într-o coloană dedicată din interfață. Doar rezumă pe scurt (câți ai găsit, eventual cei mai buni 1-2 cu un motiv scurt) și spune-i utilizatorului să se uite în coloana Candidates.

Răspunde concis (2-4 propoziții de obicei), în stilul unui coleg recruiter eficient, nu ca un asistent generic. Scrie în limba în care scrie utilizatorul (română sau engleză).`
}

export async function POST(request: NextRequest) {
  let role_id: string | undefined
  let message: string | undefined
  let attachmentFile: File | null = null

  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    role_id = (formData.get('role_id') as string) ?? undefined
    message = (formData.get('message') as string) ?? undefined
    const f = formData.get('file')
    if (f instanceof File && f.size > 0) attachmentFile = f
  } else {
    const body = (await request.json()) as { role_id?: string; message?: string }
    role_id = body.role_id
    message = body.message
  }

  if (!role_id || (!message?.trim() && !attachmentFile)) {
    return NextResponse.json({ error: 'role_id and message (or a file) are required' }, { status: 400 })
  }
  const userMessageText = message?.trim() || `A atașat fișierul "${attachmentFile?.name}" fără mesaj — analizează-l și rezumă ce conține.`

  const supabase = await createClient()

  const { data: role } = await supabase
    .from('roles')
    .select('title, description, client:clients(name)')
    .eq('id', role_id)
    .single()

  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

  const roleTitle = role.title
  const roleDescription = role.description

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (Array.isArray(role.client) ? (role.client[0] as any)?.name : (role.client as any)?.name) ?? 'Unknown client'

  let attachmentNote = ''
  const userContent: Anthropic.MessageParam['content'] = []
  if (attachmentFile) {
    const bytes = await attachmentFile.arrayBuffer()
    const built = await buildAttachmentBlock(bytes, attachmentFile.name)
    if ('error' in built) {
      return NextResponse.json({ error: built.error }, { status: 400 })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userContent.push(built.block as any)
    attachmentNote = `📎 ${attachmentFile.name}\n`
  }
  userContent.push({ type: 'text', text: userMessageText })

  // Memorie comună: istoricul recent din TOATE rolurile, nu doar cel curent,
  // ca asistentul să aibă context indiferent din ce fereastră de rol i se scrie.
  interface HistoryRow {
    sender: string
    text: string
    role_id: string
    roles: { title: string } | { title: string }[] | null
  }
  const { data: recentRows } = await supabase
    .from('recruiter_chat_messages')
    .select('sender, text, role_id, created_at, roles(title)')
    .order('created_at', { ascending: false })
    .limit(HISTORY_ROW_LIMIT)

  const chronological = ((recentRows ?? []) as unknown as HistoryRow[]).slice().reverse()
  const crossRoleTurns: Anthropic.MessageParam[] = chronological.map(r => {
    const roleInfo = Array.isArray(r.roles) ? r.roles[0] : r.roles
    const prefix = r.role_id !== role_id && roleInfo?.title ? `[Rol: ${roleInfo.title}] ` : ''
    return { role: (r.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: `${prefix}${r.text}` }
  })

  // Siguranță: garantează alternanță strictă user/assistant chiar dacă mesaje
  // din 2 ferestre diferite s-au scris aproape simultan (merge rânduri consecutive de același rol).
  const priorTurns: Anthropic.MessageParam[] = []
  for (const turn of crossRoleTurns) {
    const last = priorTurns[priorTurns.length - 1]
    if (last && last.role === turn.role && typeof last.content === 'string' && typeof turn.content === 'string') {
      last.content = `${last.content}\n${turn.content}`
    } else {
      priorTurns.push({ ...turn })
    }
  }
  if (priorTurns[0]?.role === 'assistant') priorTurns.shift()

  const messages: Anthropic.MessageParam[] = [...priorTurns, { role: 'user', content: userContent }]

  const foundCandidates: MatchResult[] = []
  const discoveredToPersist: MatchResult[] = []
  const proposedCandidates: Record<string, unknown>[] = []
  let pipelineChanged = false

  async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'find_database_matches': {
        const minScore = typeof input.min_score === 'number' ? input.min_score : 50
        const result = await matchCandidatesForRole(supabase, role_id!)
        if ('error' in result) return { error: result.error }
        const filtered = result.discovered.filter(d => d.score >= minScore).map(d => ({ ...d, source: 'database' as const }))
        foundCandidates.push(...filtered)
        discoveredToPersist.push(...filtered)
        return {
          count: filtered.length,
          candidates: filtered.map(c => ({ candidate_id: c.candidate_id, name: c.candidate_name, score: Math.round(c.score) })),
        }
      }
      case 'search_candidates_by_keyword': {
        const query = String(input.query ?? '')
        const results = await searchCandidatesByKeyword(supabase, query)
        const mapped = results.map(r => ({
          candidate_id: r.candidate_id,
          candidate_name: r.candidate_name,
          score: r.score,
          matched_skills: r.matched_skills,
          missing_skills: [],
          summary: '',
          rate_min: r.rate_min,
          rate_wish: r.rate_wish,
          currency: r.currency,
          cv_file_path: null,
          source: 'database' as const,
        }))
        foundCandidates.push(...mapped)
        discoveredToPersist.push(...mapped)
        return {
          count: results.length,
          candidates: results.map(r => ({ candidate_id: r.candidate_id, name: r.candidate_name, matched_skills: r.matched_skills })),
        }
      }
      case 'list_pipeline_candidates': {
        const { data: subs } = await supabase
          .from('submissions')
          .select('id, status, ai_score, rubix_fit, ai_summary, candidate:candidates(id, first_name, last_name, rate_min, rate_wish, currency)')
          .eq('role_id', role_id)
          .is('deleted_at', null)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list = (subs ?? []).map((s: any) => ({
          submission_id: s.id,
          candidate_id: s.candidate?.id,
          candidate_name: s.candidate ? `${s.candidate.first_name} ${s.candidate.last_name}` : 'Unknown',
          score: s.rubix_fit ?? s.ai_score ?? 0,
          matched_skills: [],
          missing_skills: [],
          summary: s.ai_summary ?? '',
          rate_min: s.candidate?.rate_min ?? null,
          rate_wish: s.candidate?.rate_wish ?? null,
          currency: s.candidate?.currency ?? 'EUR',
          cv_file_path: null,
          status: s.status,
        }))
        foundCandidates.push(...list)
        return { count: list.length, candidates: list.map(l => ({ candidate_id: l.candidate_id, name: l.candidate_name, status: l.status })) }
      }
      case 'add_candidate_to_pipeline': {
        const candidateId = String(input.candidate_id ?? '')
        if (!candidateId) return { error: 'candidate_id is required' }
        const { data: existing } = await supabase
          .from('submissions')
          .select('id')
          .eq('candidate_id', candidateId)
          .eq('role_id', role_id)
          .maybeSingle()
        if (existing) return { ok: true, already_existed: true }
        const { error: insertError } = await supabase
          .from('submissions')
          .insert({ candidate_id: candidateId, role_id, status: 'pipeline' })
        if (insertError) return { error: insertError.message }
        pipelineChanged = true
        return { ok: true }
      }
      case 'propose_new_candidate': {
        const firstName = String(input.first_name ?? '').trim()
        const lastName = String(input.last_name ?? '').trim()
        if (!firstName || !lastName) return { error: 'first_name and last_name are required' }
        const proposal = {
          first_name: firstName,
          last_name: lastName,
          email: input.email ? String(input.email) : null,
          phone: input.phone ? String(input.phone) : null,
          linkedin_url: input.linkedin_url ? String(input.linkedin_url) : null,
          location: input.location ? String(input.location) : null,
          seniority: input.seniority ? String(input.seniority) : null,
          skills: Array.isArray(input.skills) ? input.skills.map(String) : [],
          summary: input.summary ? String(input.summary) : '',
          source: input.source === 'linkedin' ? 'linkedin' : 'manual',
        }
        proposedCandidates.push(proposal)
        return { ok: true, shown_to_user: true, note: 'A confirmation card was shown to the user. Do not repeat these details in your text reply — just acknowledge briefly.' }
      }
      case 'get_role_brief': {
        const { data: criteria } = await supabase
          .from('role_rubix_criteria')
          .select('criterion, weight')
          .eq('role_id', role_id)
          .order('order_index')
        return {
          title: roleTitle,
          client: clientName,
          description: (roleDescription ?? '').slice(0, 4000),
          rubric: criteria ?? [],
        }
      }
      default:
        return { error: `Unknown tool: ${name}` }
    }
  }

  let reply = ''
  try {
    for (let step = 0; step < MAX_TOOL_STEPS; step++) {
      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high' },
        system: systemPrompt(roleTitle, clientName),
        tools: [...HOSTED_TOOLS, ...TOOLS],
        messages,
      })

      messages.push({ role: 'assistant', content: resp.content })

      const toolUses = resp.content.filter(b => b.type === 'tool_use')
      if (toolUses.length === 0) {
        reply = resp.content
          .filter(b => b.type === 'text')
          .map(b => (b.type === 'text' ? b.text : ''))
          .join('\n')
          .trim()
        break
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        if (tu.type !== 'tool_use') continue
        const result = await executeTool(tu.name, tu.input as Record<string, unknown>)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        })
      }
      messages.push({ role: 'user', content: toolResults })

      if (step === MAX_TOOL_STEPS - 1) {
        reply = 'That request needed more steps than I could take right now — try breaking it into smaller asks.'
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'The recruiter assistant hit an error. Try again.' },
      { status: 500 }
    )
  }

  const finalReply = reply || 'Done.'

  await supabase.from('recruiter_chat_messages').insert([
    { role_id, sender: 'user', text: `${attachmentNote}${userMessageText}` },
    { role_id, sender: 'system', text: finalReply },
  ])

  if (discoveredToPersist.length > 0) {
    const dedup = new Map(discoveredToPersist.filter(c => c.candidate_id).map(c => [c.candidate_id, c]))
    await supabase.from('recruiter_discovered_candidates').upsert(
      [...dedup.values()].map(c => ({
        role_id,
        candidate_id: c.candidate_id,
        score: c.score,
        matched_skills: c.matched_skills,
        missing_skills: c.missing_skills,
        summary: c.summary,
        rate_min: c.rate_min,
        rate_wish: c.rate_wish,
        currency: c.currency,
        source: c.source ?? 'database',
      })),
      { onConflict: 'role_id,candidate_id' }
    )
  }

  return NextResponse.json({
    reply: finalReply,
    candidates: foundCandidates,
    proposedCandidates,
    pipelineChanged,
  })
}

export async function GET(request: NextRequest) {
  const roleId = new URL(request.url).searchParams.get('role_id')
  if (!roleId) return NextResponse.json({ error: 'role_id is required' }, { status: 400 })

  const supabase = await createClient()

  const [{ data: messages }, { data: discovered }] = await Promise.all([
    supabase
      .from('recruiter_chat_messages')
      .select('sender, text, created_at')
      .eq('role_id', roleId)
      .order('created_at', { ascending: true }),
    supabase
      .from('recruiter_discovered_candidates')
      .select('candidate_id, score, matched_skills, missing_skills, summary, rate_min, rate_wish, currency, source, candidate:candidates(first_name, last_name)')
      .eq('role_id', roleId)
      .order('score', { ascending: false }),
  ])

  return NextResponse.json({
    messages: (messages ?? []).map(m => ({
      from: m.sender as 'user' | 'system',
      text: m.text,
      time: new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    discovered: (discovered ?? []).map((d: any) => {
      const candidate = Array.isArray(d.candidate) ? d.candidate[0] : d.candidate
      return {
        candidate_id: d.candidate_id,
        candidate_name: candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Unknown candidate',
        score: d.score,
        matched_skills: d.matched_skills ?? [],
        missing_skills: d.missing_skills ?? [],
        summary: d.summary ?? '',
        rate_min: d.rate_min,
        rate_wish: d.rate_wish,
        currency: d.currency ?? 'EUR',
        cv_file_path: null,
        source: d.source ?? 'database',
      }
    }),
  })
}
