import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { useI18n } from '@/app/providers/I18nProvider'

export function AppLayout() {
  const { t, locale } = useI18n()
  return (
    <div className="app-enter flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
          {/* keyed by locale so pages using non-hook formatters (money, dates) re-render in the new language */}
          <ErrorBoundary key={locale} label={t('common.data_load_failed')}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
