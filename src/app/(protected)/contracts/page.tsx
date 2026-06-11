import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Users, DollarSign } from 'lucide-react'
import { ContractsClient } from '@/components/contracts/ContractsClient'
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
  const active = contracts.filter((c: any) => !c.end_date || new Date(c.end_date) >= new Date())
  const currency = active[0]?.currency ?? 'EUR'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalMonthlyRevenue = active.reduce((sum: number, c: any) => sum + c.bill_rate * (c.rate_type === 'daily' ? 20 : 160), 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalMonthlyCost = active.reduce((sum: number, c: any) => sum + c.pay_rate * (c.rate_type === 'daily' ? 20 : 160), 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalMonthlyComms = active.reduce((sum: number, c: any) => {
    return sum +
      (c.partner_commission && c.partner_commission_type === 'monthly' ? c.partner_commission : 0) +
      (c.partner_commission_2 && c.partner_commission_2_type === 'monthly' ? c.partner_commission_2 : 0)
  }, 0)
  const totalMonthlyMargin = totalMonthlyRevenue - totalMonthlyCost - totalMonthlyComms

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1A33]">Contracte</h1>
          <p className="text-gray-400 text-sm mt-0.5">{contracts.length} contracte totale · {active.length} active</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={15} className="text-[#2AA3FF]" />
            <span className="text-xs font-medium text-gray-500">Contracte active</span>
          </div>
          <p className="text-2xl font-bold text-[#0B1A33]">{active.length}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={15} className="text-indigo-500" />
            <span className="text-xs font-medium text-gray-500">Revenue lunar est.</span>
          </div>
          <p className="text-2xl font-bold text-[#0B1A33]">
            {totalMonthlyRevenue.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
            <span className="text-sm font-normal text-gray-400 ml-1">{currency}</span>
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={15} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Cost lunar est.</span>
          </div>
          <p className="text-2xl font-bold text-[#0B1A33]">
            {totalMonthlyCost.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
            <span className="text-sm font-normal text-gray-400 ml-1">{currency}</span>
          </p>
        </div>
        <div className="glass rounded-2xl p-4 border border-green-100 bg-green-50/30">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-green-500" />
            <span className="text-xs font-medium text-gray-500">Marjă lunară est.</span>
          </div>
          <p className="text-2xl font-bold text-green-700">
            {totalMonthlyMargin.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
            <span className="text-sm font-normal text-green-500 ml-1">{currency}</span>
          </p>
        </div>
      </div>

      <ContractsClient contracts={contracts} candidates={candidates} roles={roles} partners={partners} />
    </div>
  )
}
