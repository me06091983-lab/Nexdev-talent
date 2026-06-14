import { CandidateForm } from '@/components/candidates/CandidateForm'

export default function NewCandidatePage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidat nou</h1>
          <p className="text-gray-500 mt-1">Completează datele sau încarcă un CV pentru precompletare automată</p>
        </div>
        <button
          type="submit"
          form="candidate-form"
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          Salvează candidat
        </button>
      </div>
      <div className="glass rounded-2xl p-8">
        <CandidateForm />
      </div>
    </div>
  )
}
