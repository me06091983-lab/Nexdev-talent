import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('roles')
    .select('*, client:clients(id, name), role_skills(skill:skills(id, name, category), skill_type)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({
    ...data,
    required_skills: data.role_skills?.filter((rs: { skill_type: string }) => rs.skill_type === 'required').map((rs: { skill: unknown }) => rs.skill) ?? [],
    preferred_skills: data.role_skills?.filter((rs: { skill_type: string }) => rs.skill_type === 'preferred').map((rs: { skill: unknown }) => rs.skill) ?? [],
  })
}

const TRACKED_FIELDS: Record<string, string> = {
  status: 'Status', title: 'Title', deadline: 'Submission deadline',
  positions_count: 'Role count', location: 'Location', seniority: 'Seniority',
}

const STATUS_LABELS_RO: Record<string, string> = {
  draft: 'Draft', active: 'Active', on_hold: 'On Hold', closed: 'Closed', filled: 'Filled',
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { required_skill_ids, preferred_skill_ids, ...roleData } = body

  // Fetch current values for history diff
  const { data: current } = await supabase
    .from('roles')
    .select('status, title, deadline, positions_count, location, seniority')
    .eq('id', id)
    .single()

  const { data: role, error } = await supabase
    .from('roles')
    .update(roleData)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log changed fields to role_history
  if (current) {
    const historyRows: { role_id: string; field: string; old_value: string | null; new_value: string | null }[] = []
    for (const [field] of Object.entries(TRACKED_FIELDS)) {
      const oldVal = String(current[field as keyof typeof current] ?? '')
      const newVal = String(roleData[field] ?? '')
      if (oldVal !== newVal && (oldVal || newVal)) {
        const fmt = (v: string, f: string) => f === 'status' ? (STATUS_LABELS_RO[v] ?? v) : v
        historyRows.push({ role_id: id, field: TRACKED_FIELDS[field], old_value: fmt(oldVal, field) || null, new_value: fmt(newVal, field) || null })
      }
    }
    if (historyRows.length) {
      await supabase.from('role_history').insert(historyRows)
    }
  }

  if (required_skill_ids !== undefined || preferred_skill_ids !== undefined) {
    await supabase.from('role_skills').delete().eq('role_id', id)
    const skillRows = [
      ...(required_skill_ids ?? []).map((sid: string) => ({ role_id: id, skill_id: sid, skill_type: 'required' })),
      ...(preferred_skill_ids ?? []).map((sid: string) => ({ role_id: id, skill_id: sid, skill_type: 'preferred' })),
    ]
    if (skillRows.length) await supabase.from('role_skills').insert(skillRows)
  }

  // Când rolul devine "Ocupat", marchează ca "Angajat" candidatul cu ofertă
  // DOAR dacă există exact 1 ofertă activă (caz fără ambiguitate).
  // Dacă sunt mai multe oferte, utilizatorul trebuie să marcheze manual.
  if (roleData.status === 'filled') {
    const admin = createAdminClient()
    const { data: offers } = await admin
      .from('submissions')
      .select('candidate_id')
      .eq('role_id', id)
      .eq('status', 'offer')
      .is('deleted_at', null)
    const candidateIds = (offers ?? []).map((s: { candidate_id: string }) => s.candidate_id).filter(Boolean)
    if (candidateIds.length === 1) {
      await admin
        .from('candidates')
        .update({ candidate_status: 'angajat', successful: true })
        .in('id', candidateIds)
    }
  }

  return NextResponse.json(role)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  // Get submission IDs for cascade
  const { data: subs } = await admin.from('submissions').select('id').eq('role_id', id)
  const subIds = (subs ?? []).map(s => s.id)

  if (subIds.length) {
    // Get contracts linked to these submissions
    const { data: contracts } = await admin.from('contracts').select('id').in('submission_id', subIds)
    const contractIds = (contracts ?? []).map(c => c.id)
    if (contractIds.length) {
      await admin.from('timesheets').delete().in('contract_id', contractIds)
      await admin.from('contract_history').delete().in('contract_id', contractIds)
      await admin.from('contracts').delete().in('id', contractIds)
    }
    await admin.from('stage_history').delete().in('submission_id', subIds)
    await admin.from('submissions').delete().in('id', subIds)
  }

  await admin.from('role_skills').delete().eq('role_id', id)
  await admin.from('role_stages').delete().eq('role_id', id)

  const { error } = await admin.from('roles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
