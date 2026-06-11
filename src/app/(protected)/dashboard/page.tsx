import { Users, Briefcase, TrendingUp, Bell } from 'lucide-react'

const stats = [
  { label: 'Candidați noi (7 zile)', value: '0', icon: Users, color: 'text-blue-500', iconBg: 'bg-blue-500/10' },
  { label: 'Joburi active', value: '0', icon: Briefcase, color: 'text-emerald-500', iconBg: 'bg-emerald-500/10' },
  { label: 'Potriviri AI calitate', value: '0', icon: TrendingUp, color: 'text-violet-500', iconBg: 'bg-violet-500/10' },
  { label: 'De contactat', value: '0', icon: Bell, color: 'text-orange-500', iconBg: 'bg-orange-500/10' },
]

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Bun venit pe platforma NexDev Talent</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="glass rounded-2xl p-6">
              <div className={`${stat.iconBg} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={20} className={stat.color} />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Activitate recentă</h2>
          <p className="text-gray-400 text-sm">Nicio activitate încă. Adaugă primul candidat pentru a începe.</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Joburi cu potriviri</h2>
          <p className="text-gray-400 text-sm">Niciun job activ. Creează primul rol pentru a activa matching-ul AI.</p>
        </div>
      </div>
    </div>
  )
}
