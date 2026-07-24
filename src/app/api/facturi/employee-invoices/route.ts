import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: contractRows, error: contractsError } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_status,
      candidate_id,
      submission_id,
      direct_candidate:candidates!candidate_id(id, first_name, last_name),
      submission:submissions!submission_id(
        candidate:candidates(id, first_name, last_name)
      )
    `)

  if (contractsError) return NextResponse.json({ error: contractsError.message }, { status: 500 })

  type Candidate = { id: string; first_name: string | null; last_name: string | null }
  type CandidateAgg = { id: string; first_name: string | null; last_name: string | null; has_active_contract: boolean }

  const candidateMap = new Map<string, CandidateAgg>()
  const contractToCandidate = new Map<string, string>()

  for (const c of contractRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const directCand = Array.isArray((c as any).direct_candidate) ? (c as any).direct_candidate[0] : (c as any).direct_candidate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = Array.isArray((c as any).submission) ? (c as any).submission[0] : (c as any).submission
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subCand = sub ? (Array.isArray(sub.candidate) ? sub.candidate[0] : sub.candidate) : null
    const cand: Candidate | null = directCand ?? subCand
    if (!cand) continue

    contractToCandidate.set(c.id as string, cand.id)

    const isActive = c.contract_status === 'activ'
    const existing = candidateMap.get(cand.id)
    if (existing) {
      existing.has_active_contract = existing.has_active_contract || isActive
    } else {
      candidateMap.set(cand.id, {
        id: cand.id,
        first_name: cand.first_name,
        last_name: cand.last_name,
        has_active_contract: isActive,
      })
    }
  }

  const contractIds = [...contractToCandidate.keys()]

  const { data: invoiceRows, error: invoicesError } = contractIds.length > 0
    ? await supabase
        .from('manual_invoices')
        .select('id, valoare, valuta, data_emitere, luna_efectiva, incasata_platita, data_incasare_plata, numar_factura, contract_id')
        .eq('type', 'primita')
        .in('contract_id', contractIds)
    : { data: [], error: null }

  if (invoicesError) return NextResponse.json({ error: invoicesError.message }, { status: 500 })

  type InvoiceOut = {
    id: string
    valoare: number
    valuta: string
    data_emitere: string
    luna_efectiva: number | null
    incasata_platita: boolean
    data_incasare_plata: string | null
    numar_factura: string | null
  }

  const invoicesByCandidate = new Map<string, InvoiceOut[]>()
  for (const inv of invoiceRows ?? []) {
    const candidateId = contractToCandidate.get(inv.contract_id as string)
    if (!candidateId) continue
    const list = invoicesByCandidate.get(candidateId) ?? []
    list.push({
      id: inv.id,
      valoare: inv.valoare,
      valuta: inv.valuta,
      data_emitere: inv.data_emitere,
      luna_efectiva: inv.luna_efectiva,
      incasata_platita: inv.incasata_platita,
      data_incasare_plata: inv.data_incasare_plata,
      numar_factura: inv.numar_factura,
    })
    invoicesByCandidate.set(candidateId, list)
  }

  const result = [...candidateMap.values()]
    .map(cand => ({
      ...cand,
      invoices: (invoicesByCandidate.get(cand.id) ?? [])
        .sort((a, b) => b.data_emitere.localeCompare(a.data_emitere)),
    }))
    .sort((a, b) => {
      if (a.has_active_contract !== b.has_active_contract) return a.has_active_contract ? -1 : 1
      const an = `${a.last_name ?? ''} ${a.first_name ?? ''}`.trim().toLowerCase()
      const bn = `${b.last_name ?? ''} ${b.first_name ?? ''}`.trim().toLowerCase()
      return an.localeCompare(bn)
    })

  return NextResponse.json(result)
}
