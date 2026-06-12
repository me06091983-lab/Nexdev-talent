'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Radar,
  ScrollText,
  Clock,
  Receipt,
  Settings,
  LogOut,
  Handshake,
} from 'lucide-react'

const navGroups = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/pipeline', label: 'Radar', icon: Radar },
      { href: '/candidates', label: 'Candidați', icon: Users },
      { href: '/roles', label: 'Roluri', icon: Briefcase },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/clients', label: 'Clienți', icon: Building2 },
      { href: '/partners', label: 'Parteneri', icon: Handshake },
    ],
  },
  {
    label: 'Financiar',
    items: [
      { href: '/contracts', label: 'Contracte', icon: ScrollText },
      { href: '/timesheets', label: 'Timesheeturi', icon: Clock },
      { href: '/invoices', label: 'Facturi', icon: Receipt },
    ],
  },
]

const bottomItems = [
  { href: '/settings', label: 'Setări', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 glass-dark flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <span className="text-white font-bold text-xl tracking-tight">
          <span className="text-[#2AA3FF]">Nex</span>Dev Talent
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'pt-3' : ''}>
            {group.label && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      active
                        ? 'bg-[#2AA3FF]/90 text-white shadow-lg shadow-blue-500/20 backdrop-blur-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-[#2AA3FF]/90 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <LogOut size={18} />
            Ieșire
          </button>
        </form>
      </div>
    </aside>
  )
}
