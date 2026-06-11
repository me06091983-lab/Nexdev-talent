export default function RolesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roluri</h1>
          <p className="text-gray-500 mt-1">Joburi deschise și pipeline de recrutare</p>
        </div>
        <button className="bg-[#2AA3FF] hover:bg-[#1a8fe0] text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20">
          + Rol nou
        </button>
      </div>
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-gray-400">Niciun rol creat încă.</p>
      </div>
    </div>
  )
}
