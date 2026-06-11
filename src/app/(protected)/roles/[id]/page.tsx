import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RoleForm } from '@/components/roles/RoleForm'

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: role } = await supabase
    .from('roles')
    .select('*, client:clients(id, name), role_skills(skill:skills(id, name, category), skill_type)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!role) notFound()

  const initial = {
    ...role,
    required_skills: role.role_skills?.filter((rs: { skill_type: string }) => rs.skill_type === 'required').map((rs: { skill: unknown }) => rs.skill) ?? [],
    preferred_skills: role.role_skills?.filter((rs: { skill_type: string }) => rs.skill_type === 'preferred').map((rs: { skill: unknown }) => rs.skill) ?? [],
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Editează: {role.title}
        </h1>
        {role.fieldglass_id && (
          <p className="text-gray-500 mt-1 font-mono text-sm">{role.fieldglass_id}</p>
        )}
      </div>
      <div className="glass rounded-2xl p-8">
        <RoleForm initial={initial} roleId={id} />
      </div>
    </div>
  )
}
