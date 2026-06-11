'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, Trash2 } from 'lucide-react'
import { ContractModal, type CandidateOption, type RoleOption, type PartnerOption } from '@/components/pipeline/ContractModal'

interface Contract {
  id: string
  start_date: string
  end_date: string | null
  pay_rate: number
  bill_rate: number
  rate_type: string
  currency: string
  partner_commission: number | null
  partner_commission_type: string | null
  partner_commission_2: number | null
  partner_commission_2_type: string | null
  notes: string | null
  role_id: string | null
  candidate: { first_name: string; last_name: string; profile: { name: string } | null } | null
  role: { id: string; title: string; client: { name: string } | null } | null
}

function formatRate(rate: number, currency: string, rateType: string) {
  return `${rate.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}/${rateType === 'daily' ? 'zi' : 'oră'}`
}

function calcMargin(c: Contract) {
  const units = c.rate_type === 'daily' ? 20 : 160
  const grossMonthly = (c.bill_rate - c.pay_rate) * units
  const grossUnit = c.bill_rate - c.pay_rate
  const monthlyComms =
    (c.partner_commission && c.partner_commission_type === 'monthly' ? c.partner_commission : 0) +
    (c.partner_commission_2 && c.partner_commission_2_type === 'monthly' ? c.partner_commission_2 : 0)
  const netMonthly = grossMonthly - monthlyComms
  const netUnit = units > 0 ? netMonthly / units : 0
  const netPct = c.bill_rate > 0 ? Math.round((netUnit / c.bill_rate) * 100) : 0
  const grossPct = c.bill_rate > 0 ? Math.round((grossUnit / c.bill_rate) * 100) : 0
  return { netMonthly, netUnit, netPct, grossMonthly, grossUnit, grossPct, monthlyComms, units }
}

function contractStatus(endDate: string | null) {
  if (!endDate) return { label: 'Activ', cls: 'bg-green-50 text-green-700 border-green-200' }
  const end = new Date(endDate)
  const now = new Date()
  if (end < now) return { label: 'Expirat', cls: 'bg-gray-100 text-gray-500 border-gray-200' }
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86_400_000)
  if (daysLeft <= 30) return { label: `${daysLeft} zile`, cls: 'bg-red-50 text-red-700 border-red-200' }
  if (daysLeft <= 60) return { label: `${daysLeft} zile`, cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'Activ', cls: 'bg-green-50 text-green-700 border-green-200' }
}

export function ContractsClient({ contracts, candidates, roles, partners }: {
  contracts: Contract[]
  candidates: CandidateOption[]
  roles: RoleOption[]
  partners: PartnerOption[]
}) {
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)
  const [editContract, setEditContract] = useState<{ contractId: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleSaved() {
    setShowNew(false)
    setEditContract(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Ștergi acest contract? Acțiunea nu poate fi anulată.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      alert('Eroare la ștergerea contractului.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{contracts.length} {contracts.length === 1 ? 'contract' : 'contracte'}</p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#0B1A33] text-white text-sm font-medium rounded-xl hover:bg-[#0B1A33]/90 transition-colors"
        >
          <Plus size={14} />
          Contract nou
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-gray-400 mb-2">Nu există contracte încă.</p>
          <p className="text-sm text-gray-300">
            Contractele se creează din pipeline-ul unui rol sau manual cu butonul de mai sus.
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/40 bg-white/30 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Candidat</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rol · Client</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Perioadă</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pay rate</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Bill rate</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Marjă/lună</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contracts.map(c => {
                const m = calcMargin(c)
                const st = contractStatus(c.end_date)
                const unitLabel = c.rate_type === 'daily' ? 'zi' : 'oră'
                return (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#0B1A33] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                          {c.candidate ? `${c.candidate.first_name[0]}${c.candidate.last_name[0]}`.toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {c.candidate ? `${c.candidate.first_name} ${c.candidate.last_name}` : '—'}
                          </p>
                          {c.candidate?.profile && (
                            <p className="text-[11px] text-gray-400">{c.candidate.profile.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.role_id ? (
                        <Link href={`/roles/${c.role_id}/pipeline`} className="text-sm font-medium text-gray-800 hover:text-[#2AA3FF] transition-colors">
                          {c.role?.title ?? '—'}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-gray-800">{c.role?.title ?? '—'}</span>
                      )}
                      {c.role?.client && <p className="text-[11px] text-gray-400">{c.role.client.name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar size={11} className="text-gray-300 flex-shrink-0" />
                        <span>{new Date(c.start_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {c.end_date && (
                        <p className="text-[11px] text-gray-400 mt-0.5 pl-4">
                          → {new Date(c.end_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatRate(c.pay_rate, c.currency, c.rate_type)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{formatRate(c.bill_rate, c.currency, c.rate_type)}</td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-bold ${m.netMonthly >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.netMonthly >= 0 ? '+' : ''}{m.netMonthly.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} {c.currency}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {m.netPct}% · {m.netUnit >= 0 ? '+' : ''}{m.netUnit.toFixed(2)}/{unitLabel}
                        {m.monthlyComms > 0 && (
                          <span className="ml-1 text-amber-500">−com.</span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditContract({ contractId: c.id })}
                          className="text-xs text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        >
                          Editează
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                          title="Șterge contract"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <ContractModal
          candidates={candidates}
          roles={roles}
          partners={partners}
          onClose={() => setShowNew(false)}
          onSaved={handleSaved}
        />
      )}

      {editContract && (
        <ContractModal
          contractId={editContract.contractId}
          onClose={() => setEditContract(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
