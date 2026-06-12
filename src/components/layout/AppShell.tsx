import { Sidebar } from './Sidebar'
import { CronBootstrap } from './CronBootstrap'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <CronBootstrap />
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
