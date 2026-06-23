import { createClient } from '@/lib/supabase/server'
import { PartnersClient } from '@/components/partners/PartnersClient'

export default async function PartnersPage() {
  const supabase = await createClient()
  const { data: partners } = await supabase
    .from('partners')
    .select('*')
    .order('last_name', { ascending: true })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0B1A33]">Partners</h1>
        <p className="text-gray-400 text-sm mt-0.5">{(partners ?? []).length} registered partners</p>
      </div>
      <PartnersClient partners={partners ?? []} />
    </div>
  )
}
