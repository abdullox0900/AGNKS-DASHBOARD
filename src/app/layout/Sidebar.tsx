import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  Fuel,
  Gauge,
  PanelLeftClose,
  PanelLeftOpen,
  Megaphone,
  MessageSquareWarning,
  Percent,
  Coins,
  Eraser,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Users,
  Users2,
} from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { roleHasPermission, type Permission } from '@/shared/lib/permissions'
import { useAuthStore } from '@/shared/config/authStore'
import { useReviewQueue, useDisputes } from '@/shared/api/hooks'
import { useI18n } from '@/app/providers/I18nProvider'
import { useUiStore } from '@/shared/config/uiStore'
import { Hint } from '@/shared/ui/Menu'
import type { DictKey } from '@/shared/config/dictionaries'

interface NavItem {
  to: string
  label: DictKey
  icon: React.ComponentType<{ size?: number }>
  permission?: Permission
  badgeKey?: 'review' | 'disputes'
  comingSoon?: boolean
}

const GROUPS: { title: DictKey; items: NavItem[] }[] = [
  {
    title: 'nav.group.view',
    items: [
      { to: '/', label: 'nav.overview', icon: Gauge, permission: 'overview.view' },
      { to: '/analytics', label: 'nav.analytics', icon: BarChart3, permission: 'analytics.view' },
    ],
  },
  {
    title: 'nav.group.control',
    items: [
      { to: '/review', label: 'nav.review', icon: ClipboardList, permission: 'review.view', badgeKey: 'review' },
      { to: '/disputes', label: 'nav.feedback', icon: MessageSquareWarning, permission: 'disputes.view', badgeKey: 'disputes' },
    ],
  },
  {
    title: 'nav.group.manage',
    items: [
      { to: '/cashiers', label: 'nav.cashiers', icon: Users2, permission: 'cashiers.view' },
      { to: '/stations', label: 'nav.stations', icon: Store, permission: 'stations.view' },
      { to: '/bonus', label: 'nav.bonus', icon: Percent, permission: 'bonus.view' },
      { to: '/bonus-report', label: 'nav.bonus_report', icon: Coins, permission: 'bonusReport.view' },
      { to: '/broadcasts', label: 'nav.broadcasts', icon: Megaphone, permission: 'broadcasts.view' },
      { to: '/admins', label: 'nav.admins', icon: ShieldCheck, permission: 'admins.manage' },
      { to: '/data-fix', label: 'nav.data_fix', icon: Eraser, permission: 'dataFix.manage' },
      { to: '/clients', label: 'nav.clients', icon: Users, permission: 'clients.view' },
    ],
  },
  {
    title: 'nav.group.system',
    items: [
      { to: '/audit', label: 'nav.audit', icon: ScrollText, comingSoon: true },
      { to: '/settings', label: 'nav.settings', icon: Settings, comingSoon: true },
    ],
  },
]

export function Sidebar() {
  const { t } = useI18n()
  const role = useAuthStore((s) => s.role)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const { data: reviewQueue } = useReviewQueue()
  const { data: disputes } = useDisputes('open')

  const badgeCounts = {
    review: reviewQueue?.length ?? 0,
    disputes: disputes?.length ?? 0,
  }
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-[230px]',
      )}
    >
      <div className={cn('flex h-[76px] shrink-0 items-center', collapsed ? 'justify-center' : 'px-5')}>
        {collapsed ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Fuel size={19} />
          </span>
        ) : (
          <div className="min-w-0 whitespace-nowrap">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-lime)]">AGNKS · CMG</p>
            <p className="text-[17px] font-bold text-[var(--color-ink)]">{t('nav.brand')}</p>
          </div>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto overflow-x-hidden pb-4', collapsed ? 'space-y-1 px-2' : 'space-y-4 px-3')}>
        {GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter((item) => !item.permission || roleHasPermission(role, item.permission))
          if (visibleItems.length === 0) return null
          return (
            <div key={group.title}>
              {collapsed ? (
                gi > 0 && <div className="mx-2 my-2 h-px bg-[var(--color-border)]" />
              ) : (
                <p className="mb-1 px-2 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-tertiary)]">
                  {t(group.title)}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const badge = item.badgeKey ? badgeCounts[item.badgeKey] : 0
                  return (
                    <Hint key={item.to} label={collapsed ? t(item.label) : undefined} side="right">
                      <span className="block">
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        aria-label={t(item.label)}
                        className={({ isActive }) =>
                          cn(
                            'relative flex items-center rounded-lg border-l-2 py-2 text-[13px] font-medium transition-colors',
                            collapsed ? 'h-10 justify-center px-0' : 'justify-between px-2.5',
                            isActive
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                              : 'border-transparent text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]',
                          )
                        }
                      >
                        <span className="flex items-center gap-2.5 whitespace-nowrap">
                          <item.icon size={collapsed ? 19 : 17} />
                          {!collapsed && t(item.label)}
                        </span>
                        {!collapsed && item.comingSoon && (
                          <span className="rounded-full bg-[var(--color-surface-alt)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-tertiary)]">
                            {t('nav.soon')}
                          </span>
                        )}
                        {badge > 0 &&
                          (collapsed ? (
                            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-amber)] px-1 font-mono text-[9px] font-bold text-[var(--color-bg)]">
                              {badge}
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] font-semibold text-[var(--color-amber)]">{badge}</span>
                          ))}
                      </NavLink>
                      </span>
                    </Hint>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className={cn('shrink-0 border-t border-[var(--color-border)] p-2')}>
        <Hint label={collapsed ? t('nav.expand') : undefined} side="right">
          <button
            onClick={toggle}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            className={cn(
              'flex h-10 w-full items-center rounded-lg text-[13px] font-medium text-[var(--color-ink-tertiary)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-ink)]',
              collapsed ? 'justify-center' : 'gap-2.5 px-2.5',
            )}
          >
            <ToggleIcon size={18} />
            {!collapsed && <span className="whitespace-nowrap">{t('nav.collapse')}</span>}
          </button>
        </Hint>
      </div>
    </aside>
  )
}
