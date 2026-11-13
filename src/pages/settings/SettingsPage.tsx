import { NavLink, Navigate, Outlet, useParams } from 'react-router-dom'
import { PageTitle } from '@/shared/ui/PageTitle'
import { useChangelogUnread } from '@/features/changelog/useChangelogUnread'
import { roleHasPermission, type Permission } from '@/shared/lib/permissions'
import { useAuthStore } from '@/shared/config/authStore'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

interface Section {
  to: string
  label: DictKey
  permission?: Permission
  badge?: 'changelog'
}

/** Pages people open rarely live here instead of the main menu. */
export const SETTINGS_SECTIONS: Section[] = [
  { to: 'profile', label: 'settings.profile' },
  { to: 'appearance', label: 'settings.appearance' },
  { to: 'stations', label: 'nav.stations', permission: 'stations.view' },
  { to: 'auto-review', label: 'settings.auto_review', permission: 'review.view' },
  { to: 'admins', label: 'nav.admins', permission: 'admins.manage' },
  { to: 'audit', label: 'nav.audit', permission: 'audit.view' },
  { to: 'data-fix', label: 'nav.data_fix', permission: 'dataFix.manage' },
  { to: 'changelog', label: 'nav.changelog', permission: 'changelog.view', badge: 'changelog' },
  { to: 'broadcasts', label: 'nav.broadcasts', permission: 'broadcasts.view' },
]

/** Sozlamalar: section list on the left, the chosen section on the right. */
export function SettingsLayout() {
  const { t } = useI18n()
  const role = useAuthStore((s) => s.role)
  const unread = useChangelogUnread()
  const sections = SETTINGS_SECTIONS.filter((s) => !s.permission || roleHasPermission(role, s.permission))

  return (
    <div className="w-full">
      <PageTitle title={t('nav.settings')} sub={t('settings.subtitle')} />
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={`/settings/${s.to}`}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-[14.5px] font-medium transition-colors',
                  isActive
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]',
                )
              }
            >
              {t(s.label)}
              {s.badge === 'changelog' && unread > 0 && <span className="font-mono text-[12px] font-bold text-[var(--color-amber)]">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

/** Old addresses (bookmarks, links in messages) keep working. */
export function ToSettings({ to }: { to: string }) {
  const { id } = useParams()
  return <Navigate to={`/settings/${to}${id ? `/${id}` : ''}`} replace />
}
