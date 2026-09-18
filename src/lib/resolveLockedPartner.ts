export interface LockedPartner {
  id: string
  label: string
}

interface PartnerRow {
  id: string
  name?: string | null
  first_name?: string | null
  last_name?: string | null
}

function partnerLabel(p: PartnerRow) {
  return p.name?.trim() || [p.first_name, p.last_name].filter(Boolean).join(' ')
}

/** For recruiter accounts linked to a partner (set by an admin in Users), returns
 *  that partner so the candidate form can lock Source/Partner to it. */
export async function resolveLockedPartner(): Promise<LockedPartner | undefined> {
  try {
    const meRes = await fetch('/api/auth/me')
    if (!meRes.ok) return undefined
    const me = await meRes.json()
    const partnerId = me.partner_id as string | null
    if (!partnerId) return undefined

    const listRes = await fetch('/api/partners')
    if (!listRes.ok) return undefined
    const partners: PartnerRow[] = await listRes.json()
    const match = partners.find(p => p.id === partnerId)
    if (!match) return undefined

    return { id: match.id, label: partnerLabel(match) }
  } catch {
    return undefined
  }
}
