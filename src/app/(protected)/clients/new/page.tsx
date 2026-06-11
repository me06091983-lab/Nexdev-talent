import { ClientForm } from '@/components/clients/ClientForm'

export default function NewClientPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Client nou</h1>
        <p className="text-gray-500 mt-1">Adaugă un client nou în baza de date</p>
      </div>
      <div className="glass rounded-2xl p-8">
        <ClientForm />
      </div>
    </div>
  )
}
