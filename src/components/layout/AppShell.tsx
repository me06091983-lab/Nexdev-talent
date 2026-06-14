import { Sidebar } from './Sidebar'
import { CronBootstrap } from './CronBootstrap'

export function AppShell({
  children,
  role,
  email,
}: {
  children: React.ReactNode
  role: string
  email: string
}) {
  return (
    <div className="min-h-screen">
      <CronBootstrap />
      <Sidebar role={role} email={email} />
      <main className="ml-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
