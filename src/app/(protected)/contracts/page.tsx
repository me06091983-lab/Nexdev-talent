import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Users, DollarSign } from 'lucide-react'
import { ContractsClient } from '@/components/contracts/ContractsClient'
import { ContractsCharts, type ChartMonth } from '@/components/contracts/ContractsCharts'
import type { CandidateOption, RoleOption, PartnerOption } from '@/components/pipeline/ContractModal'

export default async function ContractsPage() {
  const supabase = await createClient()

  const [{ data: rawContracts }, { data: rawCandidates }, { data: rawRoles }, { data: rawPartners }] = await Promise.all([
    supabase
      .from('contracts')
      .select(`
        id, start_date, end_date, pay_rate, bill_rate, rate_type, currency,
        partner_commission, partner_commission_type,
        partner_commission_2, partner_commission_2_type,
        notes, created_at, candidate_id, role_id,
        contract_status, termination_reason,
        submission:submissions(
          id, role_id,
          candidate:candidates(id, first_name, last_name, profile:profiles(name)),
          role:roles(id, title, client:clients(name))
        ),
        direct_candidate:candidates!candidate_id(id, first_name, last_name, profile:profiles(name)),
        direct_role:roles!role_id(id, title, client:clients(name))
      `)
      .order('created_at', { ascending: false }),

    supabase
      .from('candidates')
      .select('id, first_name, last_name, profile:profiles(name)')
      .is('deleted_at', null)
      .order('last_name', { ascending: true }),

    supabase
      .from('roles')
      .select('id, title, client:clients(name)')
      .in('status', ['active', 'on_hold'])
      .is('deleted_at', null)
      .order('title', { ascending: true }),

    supabase
      .from('partners')
      .select('id, first_name, last_name, name')
      .order('last_name', { ascending: true }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts = (rawContracts ?? []).map((c: any) => {
    const sub = Array.isArray(c.submission) ? c.submission[0] : c.submission

    const directCand = Array.isArray(c.direct_candidate) ? c.direct_candidate[0] : c.direct_candidate
    const directRole = Array.isArray(c.direct_role) ? c.direct_role[0] : c.direct_role
    const directClient = directRole ? (Array.isArray(directRole.client) ? directRole.client[0] : directRole.client) : null

    const subCand = sub ? (Array.isArray(sub.candidate) ? sub.candidate[0] : sub.candidate) : null
    const subRole = sub ? (Array.isArray(sub.role) ? sub.role[0] : sub.role) : null
    const subClient = subRole ? (Array.isArray(subRole.client) ? subRole.client[0] : subRole.client) : null

    const cand = directCand ?? subCand
    const role = directRole ?? subRole
    const client = directClient ?? subClient
    const profile = cand ? (Array.isArray(cand.profile) ? cand.profile[0] : cand.profile) : null

    return {
      ...c,
      candidate: cand ? { ...cand, profile } : null,
      role: role ? { ...role, client } : null,
      role_id: c.role_id ?? sub?.role_id ?? null,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates: CandidateOption[] = (rawCandidates ?? []).map((c: any) => {
    const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile
    return {
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      profile: profile?.name ?? null,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles: RoleOption[] = (rawRoles ?? []).map((r: any) => {
    const client = Array.isArray(r.client) ? r.client[0] : r.client
    return {
      id: r.id,
      title: r.title,
      clientName: client?.name ?? '',
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partners: PartnerOption[] = (rawPartners ?? []).map((p: any) => ({
    id: p.id,
    label: [p.first_name, p.last_name].filter(Boolean).join(' ') + (p.name ? ` (${p.name})` : ''),
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = contracts.filter((c: any) => c.contract_status === 'activ')

  // Group by currency — daily = 20 zile/lună, hourly = 160 ore/lună
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currencyMap: Record<string, { revenue: number; cost: number; comms: number; count: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of active as any[]) {
    const units = c.rate_type === 'daily' ? 20 : 160
    const cur: string = c.currency ?? 'EUR'
    if (!currencyMap[cur]) currencyMap[cur] = { revenue: 0, cost: 0, comms: 0, count: 0 }
    currencyMap[cur].revenue += c.bill_rate * units
    currencyMap[cur].cost    += c.pay_rate  * units
    currencyMap[cur].count   += 1
    currencyMap[cur].comms   +=
      (c.partner_commission  && c.partner_commission_type  === 'hourly' ? Number(c.partner_commission)  * 160 : 0) +
      (c.partner_commission_2 && c.partner_commission_2_type === 'hourly' ? Number(c.partner_commission_2) * 160 : 0)
  }
  const currencySummaries = Object.entries(currencyMap)
    .map(([cur, g]) => ({
      currency: cur,
      count: g.count,
      revenue: g.revenue,
      cost: g.cost,
      margin: g.revenue - g.cost - g.comms,
      marginPct: g.revenue > 0 ? Math.round(((g.revenue - g.cost - g.comms) / g.revenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Chart data: last 12 months ──────────────────────────────────────────────
  const now = new Date()
  const chartData: ChartMonth[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
    const lastDay  = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' })

    // nr contracte NOUL PORNITE în luna asta (după start_date)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = (contracts as any[]).filter(c =>
      c.start_date?.substring(0, 7) === monthKey
    ).length

    // profit net lunar din contractele ACTIVE în luna asta (EUR)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profit = (contracts as any[]).reduce((sum: number, c: any) => {
      if (c.currency !== 'EUR') return sum
      const start = new Date(c.start_date)
      const end   = c.end_date ? new Date(c.end_date) : null
      if (start > lastDay) return sum
      if (end && end < firstDay) return sum
      const units = c.rate_type === 'daily' ? 20 : 160
      const gross = (c.bill_rate - c.pay_rate) * units
      const comms =
        (c.partner_commission     && c.partner_commission_type     === 'hourly' ? Number(c.partner_commission)     * 160 : 0) +
        (c.partner_commission_2   && c.partner_commission_2_type   === 'hourly' ? Number(c.partner_commission_2)   * 160 : 0)
      return sum + gross - comms
    }, 0)

    chartData.push({ label, count, profit: Math.round(profit) })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1A33]">Contracte</h1>
          <p className="text-gray-400 text-sm mt-0.5">{contracts.length} contracte totale · {active.length} active</p>
        </div>
      </div>

      {/* Summary cards — per monedă */}
      <div className="space-y-2 mb-5">
        {/* Rândul 1: count + prima monedă */}
        <div className="grid grid-cols-4 gap-2">
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-3">
            <Users size={13} className="text-[#2AA3FF] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-gray-400 leading-none mb-1">Contracte active</p>
              {currencySummaries.length === 0 ? (
                <p className="text-lg font-bold text-[#0B1A33] leading-none">0</p>
              ) : (
                <div className="space-y-0.5">
                  {currencySummaries.map(s => (
                    <div key={s.currency} className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-[#0B1A33] leading-none">{s.count}</span>
                      <span className="text-[10px] text-gray-400">{s.currency}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {currencySummaries[0] && (
            <>
              <div className="glass rounded-xl px-3 py-2 flex items-center gap-3">
                <DollarSign size={13} className="text-indigo-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">Revenue lunar est.</p>
                  <p className="text-lg font-bold text-[#0B1A33] leading-none">
                    {currencySummaries[0].revenue.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                    <span className="text-xs font-normal text-gray-400 ml-1">{currencySummaries[0].currency}</span>
                  </p>
                </div>
              </div>
              <div className="glass rounded-xl px-3 py-2 flex items-center gap-3">
                <DollarSign size={13} className="text-gray-300 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">Cost lunar est.</p>
                  <p className="text-lg font-bold text-[#0B1A33] leading-none">
                    {currencySummaries[0].cost.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                    <span className="text-xs font-normal text-gray-400 ml-1">{currencySummaries[0].currency}</span>
                  </p>
                </div>
              </div>
              <div className="glass rounded-xl px-3 py-2 flex items-center gap-3 border border-green-100 bg-green-50/30">
                <TrendingUp size={13} className="text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">
                    Marjă lunară est. <span className="text-green-500">{currencySummaries[0].marginPct}%</span>
                  </p>
                  <p className="text-lg font-bold text-green-700 leading-none">
                    {currencySummaries[0].margin.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                    <span className="text-xs font-normal text-green-500 ml-1">{currencySummaries[0].currency}</span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rânduri suplimentare pentru alte monede */}
        {currencySummaries.slice(1).map(s => (
          <div key={s.currency} className="grid grid-cols-4 gap-2">
            <div />
            <div className="glass rounded-xl px-3 py-2 flex items-center gap-3">
              <DollarSign size={13} className="text-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">Revenue lunar est.</p>
                <p className="text-lg font-bold text-[#0B1A33] leading-none">
                  {s.revenue.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                  <span className="text-xs font-normal text-gray-400 ml-1">{s.currency}</span>
                </p>
              </div>
            </div>
            <div className="glass rounded-xl px-3 py-2 flex items-center gap-3">
              <DollarSign size={13} className="text-gray-300 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">Cost lunar est.</p>
                <p className="text-lg font-bold text-[#0B1A33] leading-none">
                  {s.cost.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                  <span className="text-xs font-normal text-gray-400 ml-1">{s.currency}</span>
                </p>
              </div>
            </div>
            <div className="glass rounded-xl px-3 py-2 flex items-center gap-3 border border-green-100 bg-green-50/30">
              <TrendingUp size={13} className="text-green-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-medium text-gray-400 leading-none mb-0.5">
                  Marjă lunară est. <span className="text-green-500">{s.marginPct}%</span>
                </p>
                <p className="text-lg font-bold text-green-700 leading-none">
                  {s.margin.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                  <span className="text-xs font-normal text-green-500 ml-1">{s.currency}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ContractsCharts data={chartData} />

      <ContractsClient contracts={contracts} candidates={candidates} roles={roles} partners={partners} />
    </div>
  )
}
