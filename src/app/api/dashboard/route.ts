import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Last 30 days
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  // Last 2 years for timesheets
  const twoYearsAgo = today.getFullYear() - 1

  // Next 14 days (from start of today)
  const weekStart = new Date(today)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 30)
  weekEnd.setHours(23, 59, 59, 999)

  const [
    candidatesRes,
    rolesRes,
    submissionsRes,
    recentActivityRes,
    contractsRes,
    timesheetsRes,
    allActiveSubsRes,
    interviewSubsRes,
    topAiRes,
  ] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, candidate_status, source_type, created_at')
      .is('deleted_at', null),

    supabase
      .from('roles')
      .select('id, title, status, positions_count, client:clients!client_id(name)')
      .is('deleted_at', null),

    supabase
      .from('submissions')
      .select('id, status')
      .is('deleted_at', null),

    supabase
      .from('submissions')
      .select(`
        id, status, updated_at,
        candidate:candidates!candidate_id(id, first_name, last_name),
        role:roles!role_id(id, title, client:clients!client_id(name))
      `)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(10),

    supabase
      .from('contracts')
      .select(`
        id, start_date, end_date, pay_rate, bill_rate, rate_type, currency,
        partner_commission, partner_commission_type,
        partner_commission_2, partner_commission_2_type,
        contract_status,
        candidate:candidates!candidate_id(id, first_name, last_name),
        role:roles!role_id(id, title, client:clients!client_id(name))
      `),

    supabase
      .from('timesheets')
      .select('contract_id, year, month, hours')
      .gte('year', twoYearsAgo),

    supabase
      .from('submissions')
      .select(`
        id, status, updated_at,
        candidate:candidates!candidate_id(first_name, last_name),
        role:roles!role_id(id, title, client:clients!client_id(name))
      `)
      .is('deleted_at', null)
      .neq('status', 'rejected')
      .order('updated_at', { ascending: false }),

    supabase
      .from('submissions')
      .select(`
        id, interviews,
        candidate:candidates!candidate_id(first_name, last_name),
        role:roles!role_id(id, title, client:clients!client_id(name))
      `)
      .not('interviews', 'is', null)
      .is('deleted_at', null),

    supabase
      .from('submissions')
      .select(`
        id, ai_score, status, updated_at,
        candidate:candidates!candidate_id(id, first_name, last_name),
        role:roles!role_id(id, title, client:clients!client_id(name))
      `)
      .gte('ai_score', 90)
      .is('deleted_at', null)
      .neq('status', 'rejected')
      .order('ai_score', { ascending: false })
      .limit(10),
  ])

  // ── Candidates ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCandidates: any[] = candidatesRes.data ?? []
  const candidateTotal = allCandidates.length
  const byStatus = {
    pasiv: allCandidates.filter(c => c.candidate_status === 'pasiv').length,
    activ: allCandidates.filter(c => c.candidate_status === 'activ').length,
    angajat: allCandidates.filter(c => c.candidate_status === 'angajat').length,
  }
  const bySource = {
    own: allCandidates.filter(c => c.source_type === 'own').length,
    recruiter: allCandidates.filter(c => c.source_type === 'recruiter').length,
    partner: allCandidates.filter(c => c.source_type === 'partner').length,
  }
  const recentlyAdded = allCandidates.filter(c => c.created_at >= thirtyDaysAgoStr + 'T00:00:00').length

  // ── Roles ──────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRoles: any[] = rolesRes.data ?? []
  const roles = {
    total: allRoles.length,
    active: allRoles.filter(r => r.status === 'active').length,
    onHold: allRoles.filter(r => r.status === 'on_hold').length,
    closed: allRoles.filter(r => r.status === 'closed').length,
  }

  // ── Submissions ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allSubmissions: any[] = submissionsRes.data ?? []
  const submissionsByStatus: Record<string, number> = {}
  for (const s of allSubmissions) {
    submissionsByStatus[s.status] = (submissionsByStatus[s.status] ?? 0) + 1
  }

  // ── Recent Activity ────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawActivity: any[] = recentActivityRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentActivity = rawActivity.map((s: any) => {
    const candidate = Array.isArray(s.candidate) ? s.candidate[0] : s.candidate
    const role = Array.isArray(s.role) ? s.role[0] : s.role
    const client = role ? (Array.isArray(role.client) ? role.client[0] : role.client) : null
    return {
      id: s.id,
      status: s.status,
      updated_at: s.updated_at,
      candidate: candidate ? { id: candidate.id, first_name: candidate.first_name, last_name: candidate.last_name } : null,
      role: role ? { id: role.id, title: role.title } : null,
      client: client ? { name: client.name } : null,
    }
  })

  // ── Contracts ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allContracts: any[] = (contractsRes.data ?? []).map((c: any) => {
    const candidate = Array.isArray(c.candidate) ? c.candidate[0] : c.candidate
    const role = Array.isArray(c.role) ? c.role[0] : c.role
    const client = role ? (Array.isArray(role.client) ? role.client[0] : role.client) : null
    return { ...c, candidate, role: role ? { ...role, client } : null }
  })

  const activeContracts = allContracts.filter(c => c.contract_status === 'activ')
  const terminatedContracts = allContracts.filter(c => c.contract_status === 'terminat')

  // Expiring within 60 days
  const sixtyDaysFromNow = new Date(today)
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)
  const sixtyDaysStr = sixtyDaysFromNow.toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expiringContracts = activeContracts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => c.end_date && c.end_date >= todayStr && c.end_date <= sixtyDaysStr)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => ({
      id: c.id,
      candidate: c.candidate ? { first_name: c.candidate.first_name, last_name: c.candidate.last_name } : null,
      role: c.role ? { title: c.role.title } : null,
      client: c.role?.client ? { name: c.role.client.name } : null,
      end_date: c.end_date,
      daysLeft: Math.ceil((new Date(c.end_date).getTime() - today.getTime()) / 86400000),
      currency: c.currency,
      bill_rate: c.bill_rate,
      rate_type: c.rate_type,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.daysLeft - b.daysLeft)

  // Revenue + cost lunar per currency — active contracts
  const currencyMap: Record<string, { revenue: number; cost: number; count: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of activeContracts as any[]) {
    const cur: string = c.currency ?? 'EUR'
    const units = c.rate_type === 'daily' ? 20 : 160
    if (!currencyMap[cur]) currencyMap[cur] = { revenue: 0, cost: 0, count: 0 }
    currencyMap[cur].revenue += c.bill_rate * units
    currencyMap[cur].cost    += c.pay_rate  * units
    currencyMap[cur].count   += 1
  }
  const byCurrency = Object.entries(currencyMap)
    .map(([currency, v]) => ({
      currency,
      revenue: Math.round(v.revenue),
      cost: Math.round(v.cost),
      margin: Math.round(v.revenue - v.cost),
      marginPct: v.revenue > 0 ? Math.round(((v.revenue - v.cost) / v.revenue) * 100) : 0,
      count: v.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // By client — from active contracts
  const clientMap: Record<string, { count: number; monthlyRevenue: number; currency: string }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of activeContracts as any[]) {
    const clientName = c.role?.client?.name ?? 'Necunoscut'
    const units = c.rate_type === 'daily' ? 20 : 160
    const monthlyRevenue = c.bill_rate * units
    if (!clientMap[clientName]) clientMap[clientName] = { count: 0, monthlyRevenue: 0, currency: c.currency ?? 'EUR' }
    clientMap[clientName].count += 1
    clientMap[clientName].monthlyRevenue += monthlyRevenue
  }
  const byClient = Object.entries(clientMap)
    .map(([client, v]) => ({ client, count: v.count, monthlyRevenue: v.monthlyRevenue, currency: v.currency }))
    .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)

  // Contracte emise în ultima lună (start_date în ultimele 30 zile)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentContracts = allContracts
    .filter((c: any) => c.start_date >= thirtyDaysAgoStr)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => ({
      id: c.id,
      candidateName: c.candidate ? `${c.candidate.first_name} ${c.candidate.last_name}` : '—',
      roleTitle: c.role?.title ?? null,
      clientName: c.role?.client?.name ?? null,
      start_date: c.start_date,
      end_date: c.end_date ?? null,
      bill_rate: c.bill_rate,
      pay_rate: c.pay_rate,
      rate_type: c.rate_type ?? 'daily',
      currency: c.currency ?? 'EUR',
      contract_status: c.contract_status,
    }))
    .sort((a: { start_date: string }, b: { start_date: string }) => b.start_date.localeCompare(a.start_date))

  // ── Recrutare — candidați per rol, roluri deschise, interviuri ─────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allActiveSubs = (allActiveSubsRes.data ?? []).map((s: any) => {
    const candidate = Array.isArray(s.candidate) ? s.candidate[0] : s.candidate
    const role = Array.isArray(s.role) ? s.role[0] : s.role
    const client = role ? (Array.isArray(role.client) ? role.client[0] : role.client) : null
    return {
      id: s.id,
      status: s.status,
      updated_at: s.updated_at,
      candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : '—',
      roleId: role?.id ?? null,
      roleTitle: role?.title ?? null,
      clientName: client?.name ?? null,
    }
  })

  // Count active submissions per role
  const roleCandidateCount: Record<string, number> = {}
  for (const s of allActiveSubs) {
    if (s.roleId) roleCandidateCount[s.roleId] = (roleCandidateCount[s.roleId] ?? 0) + 1
  }

  const openRoles = (rolesRes.data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((r: any) => r.status === 'active' || r.status === 'on_hold')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => {
      const client = Array.isArray(r.client) ? r.client[0] : r.client
      return {
        id: r.id,
        title: r.title,
        status: r.status,
        positionsCount: r.positions_count ?? 1,
        clientName: client?.name ?? null,
        candidatesCount: roleCandidateCount[r.id] ?? 0,
      }
    })

  // Group candidates by role
  const roleGroupMap: Record<string, {
    roleTitle: string
    clientName: string
    candidates: Array<{ submissionId: string; candidateName: string; status: string; updated_at: string }>
  }> = {}
  for (const s of allActiveSubs) {
    if (!s.roleId) continue
    if (!roleGroupMap[s.roleId]) {
      roleGroupMap[s.roleId] = { roleTitle: s.roleTitle ?? '—', clientName: s.clientName ?? '—', candidates: [] }
    }
    roleGroupMap[s.roleId].candidates.push({
      submissionId: s.id,
      candidateName: s.candidateName,
      status: s.status,
      updated_at: s.updated_at,
    })
  }
  const candidatesByRole = Object.entries(roleGroupMap).map(([roleId, group]) => ({ roleId, ...group }))

  // Candidates in interview stages
  const interviewCandidates = allActiveSubs
    .filter(s => s.status === 'screening_scheduled' || s.status === 'screening_done')

  // ── Weekly interviews ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weeklyInterviews: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const sub of (interviewSubsRes.data ?? []) as any[]) {
    const candidate = Array.isArray(sub.candidate) ? sub.candidate[0] : sub.candidate
    const role = Array.isArray(sub.role) ? sub.role[0] : sub.role
    const client = role ? (Array.isArray(role.client) ? role.client[0] : role.client) : null
    const slots: { label: string; enabled: boolean; datetime: string; status: string; candidate_accepted?: boolean }[] = sub.interviews ?? []
    for (const slot of slots) {
      if (!slot.enabled || !slot.datetime) continue
      const slotDate = new Date(slot.datetime)
      if (slotDate < weekStart || slotDate > weekEnd) continue
      weeklyInterviews.push({
        submissionId: sub.id,
        candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : '—',
        roleTitle: role?.title ?? null,
        clientName: client?.name ?? null,
        roleId: role?.id ?? null,
        interviewLabel: slot.label,
        datetime: slot.datetime,
        interviewStatus: slot.status,
        candidateAccepted: slot.candidate_accepted ?? false,
        isToday: slotDate.toDateString() === today.toDateString(),
      })
    }
  }
  weeklyInterviews.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())

  // ── Pending feedback interviews ────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingFeedbackInterviews: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const interviewHistory: any[] = []
  const thirtyDaysAgoDate = new Date(today)
  thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const sub of (interviewSubsRes.data ?? []) as any[]) {
    const candidate = Array.isArray(sub.candidate) ? sub.candidate[0] : sub.candidate
    const role = Array.isArray(sub.role) ? sub.role[0] : sub.role
    const client = role ? (Array.isArray(role.client) ? role.client[0] : role.client) : null
    const slots: { label: string; enabled: boolean; datetime: string; status: string; candidate_accepted?: boolean }[] = sub.interviews ?? []
    for (const slot of slots) {
      if (!slot.enabled || !slot.datetime) continue
      const item = {
        submissionId: sub.id,
        candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : '—',
        roleTitle: role?.title ?? null,
        clientName: client?.name ?? null,
        roleId: role?.id ?? null,
        interviewLabel: slot.label,
        datetime: slot.datetime,
        interviewStatus: slot.status,
        candidateAccepted: slot.candidate_accepted ?? false,
      }
      if (slot.status === 'pending_feedback') {
        pendingFeedbackInterviews.push(item)
      } else if (slot.status === 'passed' || slot.status === 'rejected') {
        const slotDate = new Date(slot.datetime)
        if (slotDate >= thirtyDaysAgoDate) {
          interviewHistory.push(item)
        }
      }
    }
  }
  pendingFeedbackInterviews.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
  interviewHistory.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())

  // ── Top AI matches (score >= 90) ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topAiMatches = (topAiRes.data ?? []).map((s: any) => {
    const candidate = Array.isArray(s.candidate) ? s.candidate[0] : s.candidate
    const role = Array.isArray(s.role) ? s.role[0] : s.role
    const client = role ? (Array.isArray(role.client) ? role.client[0] : role.client) : null
    return {
      id: s.id,
      candidateId: candidate?.id ?? null,
      candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : '—',
      roleTitle: role?.title ?? null,
      clientName: client?.name ?? null,
      aiScore: Math.round(s.ai_score),
      status: s.status,
    }
  })

  // ── Financials ─────────────────────────────────────────────────────────────
  // Build contract lookup for timesheets
  const contractLookup: Record<string, {
    bill_rate: number; pay_rate: number; currency: string; rate_type: string;
    partner_commission: number | null; partner_commission_type: string | null;
    partner_commission_2: number | null; partner_commission_2_type: string | null;
  }> = {}
  for (const c of allContracts) {
    contractLookup[c.id] = {
      bill_rate: c.bill_rate,
      pay_rate: c.pay_rate,
      currency: c.currency ?? 'EUR',
      rate_type: c.rate_type ?? 'daily',
      partner_commission: c.partner_commission,
      partner_commission_type: c.partner_commission_type,
      partner_commission_2: c.partner_commission_2,
      partner_commission_2_type: c.partner_commission_2_type,
    }
  }

  // Build 12-month window ending at current month
  const months: { label: string; year: number; month: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    months.push({
      label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timesheets: any[] = timesheetsRes.data ?? []
  const financialMap: Record<string, { revenue: number; cost: number; comms: number; profit: number }> = {}
  for (const m of months) {
    financialMap[`${m.year}-${m.month}`] = { revenue: 0, cost: 0, comms: 0, profit: 0 }
  }
  const ytdCurrencyMap: Record<string, { revenue: number; cost: number; comms: number; profit: number }> = {}

  for (const ts of timesheets) {
    const key = `${ts.year}-${ts.month}`
    if (!financialMap[key]) continue
    const contract = contractLookup[ts.contract_id]
    if (!contract) continue
    const hours = Number(ts.hours) || 0
    const isHourly   = contract.rate_type === 'hourly'
    const billHourly = isHourly ? contract.bill_rate : contract.bill_rate / 8
    const payHourly  = isHourly ? contract.pay_rate  : contract.pay_rate  / 8
    const revenue    = hours * billHourly
    const cost       = hours * payHourly
    const monthlyComms =
      (contract.partner_commission && contract.partner_commission_type === 'monthly' ? Number(contract.partner_commission) : 0) +
      (contract.partner_commission_2 && contract.partner_commission_2_type === 'monthly' ? Number(contract.partner_commission_2) : 0)
    financialMap[key].revenue += revenue
    financialMap[key].cost += cost
    financialMap[key].comms += monthlyComms
    financialMap[key].profit += revenue - cost - monthlyComms

    if (ts.year === currentYear) {
      const cur = contract.currency
      if (!ytdCurrencyMap[cur]) ytdCurrencyMap[cur] = { revenue: 0, cost: 0, comms: 0, profit: 0 }
      ytdCurrencyMap[cur].revenue += revenue
      ytdCurrencyMap[cur].cost += cost
      ytdCurrencyMap[cur].comms += monthlyComms
      ytdCurrencyMap[cur].profit += revenue - cost - monthlyComms
    }
  }

  const ytdByCurrency = Object.entries(ytdCurrencyMap)
    .map(([currency, v]) => ({ currency, ...v }))
    .sort((a, b) => b.revenue - a.revenue)

  const monthly = months.map(m => ({
    label: m.label,
    year: m.year,
    month: m.month,
    revenue: financialMap[`${m.year}-${m.month}`].revenue,
    cost: financialMap[`${m.year}-${m.month}`].cost,
    comms: financialMap[`${m.year}-${m.month}`].comms,
    profit: financialMap[`${m.year}-${m.month}`].profit,
  }))

  // YTD = current year months
  const currentYear = today.getFullYear()
  const ytdMonths = monthly.filter(m => m.year === currentYear)
  const ytd = {
    revenue: ytdMonths.reduce((s, m) => s + m.revenue, 0),
    cost: ytdMonths.reduce((s, m) => s + m.cost, 0),
    comms: ytdMonths.reduce((s, m) => s + m.comms, 0),
    profit: ytdMonths.reduce((s, m) => s + m.profit, 0),
  }

  return NextResponse.json({
    candidates: {
      total: candidateTotal,
      byStatus,
      bySource,
      recentlyAdded,
    },
    roles,
    submissionsByStatus,
    recentActivity,
    openRoles,
    candidatesByRole,
    interviewCandidates,
    weeklyInterviews,
    pendingFeedbackInterviews,
    interviewHistory,
    topAiMatches,
    contracts: {
      active: activeContracts.length,
      terminated: terminatedContracts.length,
      expiringContracts,
      byClient,
      recentContracts,
      byCurrency,
    },
    financials: {
      monthly,
      ytd,
      ytdByCurrency,
    },
  })
}
