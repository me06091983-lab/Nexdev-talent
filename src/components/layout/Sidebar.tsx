'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { GlobalSearch } from './GlobalSearch'
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Radar,
  ScrollText,
  Clock,
  Receipt,
  FileText,
  LogOut,
  Handshake,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

const mainNavGroups = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/pipeline', label: 'Radar', icon: Radar },
      { href: '/candidates', label: 'Candidates', icon: Users },
      { href: '/roles', label: 'Roles', icon: Briefcase },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/clients', label: 'Clients', icon: Building2 },
      { href: '/partners', label: 'Partners', icon: Handshake },
    ],
  },
  {
    label: 'Financial',
    items: [
      { href: '/contracts', label: 'Contracts', icon: ScrollText },
      { href: '/timesheets', label: 'Timesheets', icon: Clock },
      { href: '/invoices', label: 'Invoices', icon: Receipt },
      { href: '/facturare', label: 'Billing', icon: FileText },
    ],
  },
]

const adminNavGroup = {
  label: 'Admin',
  items: [
    { href: '/admin/users', label: 'Users', icon: Users },
  ],
}

export function Sidebar({ role, email }: { role: string; email: string }) {
  const pathname = usePathname()
  const isAdmin = role === 'admin'

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 glass-dark flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <span className="text-white font-bold text-xl tracking-tight">
          <span className="text-[#2AA3FF]">Nex</span>Dev Talent
        </span>
      </div>

      {/* Search */}
      <div className="pt-3 pb-1">
        <GlobalSearch />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
        {mainNavGroups.map((group, gi) => (
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

        {/* Admin section — visible only for admins */}
        {isAdmin && (
          <div className="pt-3">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              {adminNavGroup.label}
            </p>
            <div className="space-y-0.5">
              {adminNavGroup.items.map((item) => {
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
        )}
      </nav>

      {/* Bottom — user info + logout */}
      <div className="px-3 py-4 border-t border-white/10">
        {/* User info */}
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-xl bg-white/5">
          <div className="w-7 h-7 rounded-full bg-[#2AA3FF]/20 flex items-center justify-center flex-shrink-0">
            {isAdmin
              ? <ShieldCheck size={14} className="text-[#2AA3FF]" />
              : <UserRound size={14} className="text-white/60" />}
          </div>
          <div className="min-w-0">
            <p className="text-white/80 text-xs font-medium truncate leading-tight">{email}</p>
            <p className="text-white/30 text-[10px] leading-tight mt-0.5">
              {isAdmin ? 'Administrator' : 'Recruiter'}
            </p>

          </div>
        </div>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
