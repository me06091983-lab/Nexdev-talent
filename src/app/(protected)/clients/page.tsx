import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClientsClient } from '@/components/clients/ClientsClient'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">{(clients ?? []).length} clients in the database</p>
        </div>
        <Link
          href="/clients/new"
          className="bg-[#2AA3FF] hover:bg-[#1a8fe0] text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20"
        >
          + New client
        </Link>
      </div>

      <ClientsClient clients={clients ?? []} />
    </div>
  )
}
