import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClientForm } from '@/components/clients/ClientForm'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editează: {client.name}</h1>
      </div>
      <div className="glass rounded-2xl p-8">
        <ClientForm initial={client} clientId={id} />
      </div>
    </div>
  )
}
