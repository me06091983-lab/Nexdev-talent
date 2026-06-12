import { Clock } from 'lucide-react'

export default function TimesheetsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-[#2AA3FF]/10 flex items-center justify-center">
        <Clock size={32} className="text-[#2AA3FF]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Timesheeturi</h1>
      <p className="text-gray-500 max-w-sm">
        Modulul de timesheeturi este în pregătire. Aici vei putea înregistra și urmări orele lucrate per candidat și contract.
      </p>
    </div>
  )
}
