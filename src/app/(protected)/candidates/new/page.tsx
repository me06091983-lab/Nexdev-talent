import { CandidateForm } from '@/components/candidates/CandidateForm'

export default function NewCandidatePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Candidat nou</h1>
        <p className="text-gray-500 mt-1">Completează datele sau încarcă un CV pentru precompletare automată</p>
      </div>
      <div className="glass rounded-2xl p-8">
        <CandidateForm />
      </div>
    </div>
  )
}
