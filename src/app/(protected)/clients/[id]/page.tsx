import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClientForm } from '@/components/clients/ClientForm'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: rawRoles }] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('roles')
      .select('id, title, status, fieldglass_id, created_at, submissions(id)')
      .eq('client_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  if (!client) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles = (rawRoles ?? []).map((r: any) => ({
    id: r.id as string,
    title: r.title as string,
    status: r.status as string | null,
    fieldglass_id: r.fieldglass_id as string | null,
    created_at: r.created_at as string,
    submissions_count: Array.isArray(r.submissions) ? r.submissions.length : 0,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editează: {client.name}</h1>
      </div>
      <div className="glass rounded-2xl p-8">
        <ClientForm initial={client} clientId={id} roles={roles} />
      </div>
    </div>
  )
}
