import { Receipt } from 'lucide-react'

export default function InvoicesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-[#2AA3FF]/10 flex items-center justify-center">
        <Receipt size={32} className="text-[#2AA3FF]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Facturi</h1>
      <p className="text-gray-500 max-w-sm">
        Modulul de facturare este în pregătire. Aici vei putea genera și gestiona facturile către clienți și plățile către parteneri.
      </p>
    </div>
  )
}
