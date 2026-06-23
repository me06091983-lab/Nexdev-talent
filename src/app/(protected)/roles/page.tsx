import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RolesClient } from '@/components/roles/RolesClient'

export default async function RolesPage() {
  const supabase = await createClient()

  const [{ data: rolesRaw }, { data: clients }] = await Promise.all([
    supabase
      .from('roles')
      .select('*, client:clients(id, name), role_skills(skill:skills(id, name, category), skill_type)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name').order('name'),
  ])

  const roles = (rolesRaw ?? []).map(r => ({
    ...r,
    required_skills: r.role_skills?.filter((rs: { skill_type: string }) => rs.skill_type === 'required').map((rs: { skill: unknown }) => rs.skill) ?? [],
    preferred_skills: r.role_skills?.filter((rs: { skill_type: string }) => rs.skill_type === 'preferred').map((rs: { skill: unknown }) => rs.skill) ?? [],
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-500 mt-1">{roles.length} roles in the database</p>
        </div>
        <Link
          href="/roles/new"
          className="bg-[#2AA3FF] hover:bg-[#1a8fe0] text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20"
        >
          + New role
        </Link>
      </div>

      <RolesClient roles={roles} clients={clients ?? []} />
    </div>
  )
}
