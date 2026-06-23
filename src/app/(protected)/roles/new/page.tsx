import { RoleForm } from '@/components/roles/RoleForm'

export default function NewRolePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New role</h1>
        <p className="text-gray-500 mt-1">Fill in the role details and paste the JD from Fieldglass</p>
      </div>
      <div className="glass rounded-2xl p-8">
        <RoleForm />
      </div>
    </div>
  )
}
