import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  Fuel,
  Gauge,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquareWarning,
  Percent,
  Coins,
  Settings,
  Users,
  Users2,
  ScanFace,
} from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { roleHasPermission, type Permission } from '@/shared/lib/permissions'
import { useAuthStore } from '@/shared/config/authStore'
import { useReviewQueue, useFeedbackUnread } from '@/shared/api/hooks'
import { useChangelogUnread } from '@/features/changelog/useChangelogUnread'
import { useI18n } from '@/app/providers/I18nProvider'
import { useUiStore } from '@/shared/config/uiStore'
import { Hint } from '@/shared/ui/Menu'
import { NewBadge } from '@/shared/ui/NewBadge'
import type { DictKey } from '@/shared/config/dictionaries'

interface NavItem {
  to: string
  label: DictKey
  icon: React.ComponentType<{ size?: number }>
  permission?: Permission
  badgeKey?: 'review' | 'disputes' | 'changelog'
  comingSoon?: boolean
  /** release date (YYYY-MM-DD) of something new inside this section — shows a "Yangi" badge for 3 days */
  newSince?: string
}

/** The whole menu, one flat list. Pages people open rarely live in Sozlamalar (see SETTINGS_SECTIONS). */
const MENU: NavItem[] = [
  { to: '/', label: 'nav.overview', icon: Gauge, permission: 'overview.view' },
  { to: '/analytics', label: 'nav.analytics', icon: BarChart3, permission: 'analytics.view' },
  { to: '/review', label: 'nav.review', icon: ClipboardList, permission: 'review.view', badgeKey: 'review' },
  { to: '/disputes', label: 'nav.feedback', icon: MessageSquareWarning, permission: 'disputes.view', badgeKey: 'disputes' },
  // "Filiallar" lives in Sozlamalar (rarely opened)
  { to: '/cashiers', label: 'nav.cashiers', icon: Users2, permission: 'cashiers.view' },
  { to: '/clients', label: 'nav.clients', icon: Users, permission: 'clients.view' },
  // "Zapravkachilar" (/attendants) is hidden from the menu for now — the page and its route stay.
  { to: '/faceid', label: 'nav.faceid', icon: ScanFace, permission: 'faceid.view', newSince: '2026-11-13' },
  { to: '/bonus', label: 'nav.bonus', icon: Percent, permission: 'bonus.view' },
  { to: '/bonus-report', label: 'nav.bonus_report', icon: Coins, permission: 'bonusReport.view' },
]
const SETTINGS_ITEM: NavItem = { to: '/settings', label: 'nav.settings', icon: Settings, badgeKey: 'changelog' }

type Counts = Record<NonNullable<NavItem['badgeKey']>, number>

/** The window's inner height, kept current while it is resized. */
function useWindowHeight(): number {
  const [h, setH] = useState(() => window.innerHeight)
  useEffect(() => {
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setH(window.innerHeight))
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
    }
  }, [])
  return h
}

/**
 * Sizes of the icon-only rail so every page fits the window height without a scrollbar: the rows shrink
 * (40 → 22 px) together with their icons, the dividers and the logo block as the window gets shorter.
 */
function railMetrics(windowHeight: number, items: number) {
  const brand = windowHeight >= 720 ? 76 : windowHeight >= 560 ? 56 : 44
  const footer = 57
  const padBottom = windowHeight >= 560 ? 16 : 8
  const divider = (size: number) => (size >= 34 ? 8 : size >= 28 ? 5 : 3) // margin above and below the line
  for (let size = 40; size >= 22; size--) {
    const total = brand + footer + 44 + padBottom + items * (size + 2)
    if (total <= windowHeight || size === 22) {
      return { brand, padBottom, item: size, icon: size >= 34 ? 19 : size >= 28 ? 17 : 15, divider: divider(size) }
    }
  }
  return { brand, padBottom, item: 22, icon: 15, divider: 3 }
}

function ItemLink({ item, collapsed, counts, indent, railIcon }: { item: NavItem; collapsed: boolean; counts: Counts; indent?: boolean; railIcon?: number }) {
  const { t } = useI18n()
  const badge = item.badgeKey ? counts[item.badgeKey] : 0
  return (
    <Hint label={collapsed ? t(item.label) : undefined} side="right">
      <span className="block">
        <NavLink
          to={item.to}
          end={item.to === '/'}
          aria-label={t(item.label)}
          className={({ isActive }) =>
            cn(
              'relative flex items-center rounded-lg py-2 text-[13px] font-medium transition-colors',
              collapsed ? 'h-[var(--rail-item,40px)] justify-center px-0' : 'justify-between px-2.5',
              indent && !collapsed && 'py-1.5',
              isActive
                ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]',
            )
          }
        >
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            <item.icon size={collapsed ? (railIcon ?? 19) : indent ? 16 : 17} />
            {!collapsed && t(item.label)}
          </span>
          {item.newSince && <NewBadge since={item.newSince} dot={collapsed} />}
          {!collapsed && item.comingSoon && (
            <span className="rounded-full bg-[var(--color-surface-alt)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-tertiary)]">{t('nav.soon')}</span>
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
}

export function Sidebar() {
  const { t } = useI18n()
  const role = useAuthStore((s) => s.role)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const { data: reviewQueue } = useReviewQueue()
  const { data: feedbackUnread } = useFeedbackUnread()
  const changelogUnread = useChangelogUnread()

  const counts: Counts = {
    review: reviewQueue?.length ?? 0,
    // conversations where the client wrote and nobody has opened it yet
    disputes: feedbackUnread ?? 0,
    changelog: changelogUnread,
  }
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  const allowed = (items: NavItem[]) => items.filter((item) => !item.permission || roleHasPermission(role, item.permission))
  const menu = allowed(MENU)

  const windowHeight = useWindowHeight()
  const rail = railMetrics(windowHeight, menu.length)
  const railStyle = { '--rail-item': `${rail.item}px`, paddingBottom: rail.padBottom } as React.CSSProperties

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-[256px]',
      )}
    >
      <div style={collapsed ? { height: rail.brand } : undefined} className={cn('flex shrink-0 items-center', collapsed ? 'justify-center' : 'h-[76px] px-5')}>
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

      <nav style={collapsed ? railStyle : undefined} className={cn('flex-1 overflow-y-auto overflow-x-hidden', collapsed ? 'space-y-1 px-2' : 'space-y-1.5 px-3 pb-4')}>
        <div className="space-y-0.5">
          {menu.map((item) => (
            <ItemLink key={item.to} item={item} collapsed={collapsed} counts={counts} railIcon={collapsed ? rail.icon : undefined} />
          ))}
        </div>
      </nav>

      <div className={cn('shrink-0 border-t border-[var(--color-border)] pt-2', collapsed ? 'px-2' : 'px-3')}>
        <ItemLink item={SETTINGS_ITEM} collapsed={collapsed} counts={counts} railIcon={collapsed ? rail.icon : undefined} />
      </div>
      <div className="shrink-0 p-2">
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
