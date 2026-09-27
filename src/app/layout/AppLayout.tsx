import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
          <ErrorBoundary label="Sahifani yuklab bo'lmadi">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
