import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  ChevronRight,
  ClipboardCheck,
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
  Sparkles,
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
import { useChangelogUnread } from '@/features/changelog/useChangelogUnread'
import { useI18n } from '@/app/providers/I18nProvider'
import { useUiStore } from '@/shared/config/uiStore'
import { Hint } from '@/shared/ui/Menu'
import { NewBadge } from '@/shared/ui/NewBadge'
import { isFresh } from '@/shared/lib/fresh'
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

interface NavGroup {
  /** stable id (remembers open/closed) */
  id: string
  title: DictKey
  icon: React.ComponentType<{ size?: number }>
  items: NavItem[]
}

/** Always visible, no header: the two screens people open most. */
const PINNED: NavItem[] = [
  { to: '/', label: 'nav.overview', icon: Gauge, permission: 'overview.view' },
  { to: '/analytics', label: 'nav.analytics', icon: BarChart3, permission: 'analytics.view' },
]

/** Everything else, grouped by what it is for. Each group folds away. */
const GROUPS: NavGroup[] = [
  {
    id: 'control',
    title: 'nav.group.control',
    icon: ClipboardCheck,
    items: [
      { to: '/review', label: 'nav.review', icon: ClipboardList, permission: 'review.view', badgeKey: 'review' },
      { to: '/disputes', label: 'nav.feedback', icon: MessageSquareWarning, permission: 'disputes.view', badgeKey: 'disputes' },
    ],
  },
  {
    id: 'network',
    title: 'nav.group.network',
    icon: Store,
    items: [
      { to: '/stations', label: 'nav.stations', icon: Store, permission: 'stations.view' },
      { to: '/cashiers', label: 'nav.cashiers', icon: Users2, permission: 'cashiers.view' },
      { to: '/clients', label: 'nav.clients', icon: Users, permission: 'clients.view' },
    ],
  },
  {
    id: 'bonus',
    title: 'nav.group.bonus',
    icon: Percent,
    items: [
      { to: '/bonus', label: 'nav.bonus', icon: Percent, permission: 'bonus.view', newSince: '2026-10-12' },
      { to: '/bonus-report', label: 'nav.bonus_report', icon: Coins, permission: 'bonusReport.view' },
      { to: '/broadcasts', label: 'nav.broadcasts', icon: Megaphone, permission: 'broadcasts.view' },
    ],
  },
  {
    id: 'admin',
    title: 'nav.group.admin',
    icon: ShieldCheck,
    items: [
      { to: '/admins', label: 'nav.admins', icon: ShieldCheck, permission: 'admins.manage' },
      { to: '/audit', label: 'nav.audit', icon: ScrollText, permission: 'audit.view' },
      { to: '/data-fix', label: 'nav.data_fix', icon: Eraser, permission: 'dataFix.manage' },
    ],
  },
  {
    id: 'system',
    title: 'nav.group.system',
    icon: Settings,
    items: [
      { to: '/changelog', label: 'nav.changelog', icon: Sparkles, permission: 'changelog.view', badgeKey: 'changelog', newSince: '2026-10-12' },
      { to: '/settings', label: 'nav.settings', icon: Settings, comingSoon: true },
    ],
  },
]

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
function railMetrics(windowHeight: number, items: number, groups: number) {
  const brand = windowHeight >= 720 ? 76 : windowHeight >= 560 ? 56 : 44
  const footer = 57
  const padBottom = windowHeight >= 560 ? 16 : 8
  const divider = (size: number) => (size >= 34 ? 8 : size >= 28 ? 5 : 3) // margin above and below the line
  for (let size = 40; size >= 22; size--) {
    const total = brand + footer + padBottom + items * (size + 2) + groups * (divider(size) * 2 + 1 + 4)
    if (total <= windowHeight || size === 22) {
      return { brand, padBottom, item: size, icon: size >= 34 ? 19 : size >= 28 ? 17 : 15, divider: divider(size) }
    }
  }
  return { brand, padBottom, item: 22, icon: 15, divider: 3 }
}

/** Does this nav item own the page at `path`? ('/' only matches exactly.) */
const owns = (item: NavItem, path: string) => (item.to === '/' ? path === '/' : path === item.to || path.startsWith(`${item.to}/`))

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
              'relative flex items-center rounded-lg border-l-2 py-2 text-[13px] font-medium transition-colors',
              collapsed ? 'h-[var(--rail-item,40px)] justify-center px-0' : 'justify-between px-2.5',
              indent && !collapsed && 'py-1.5',
              isActive
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]',
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

/**
 * One branch of a group's tree: the trunk runs down the left edge and a short branch reaches into every item;
 * the last item gets a rounded elbow instead, so the line visibly ends there.
 */
function TreeRow({ last, children }: { last: boolean; children: React.ReactNode }) {
  return (
    <div className="relative pl-4">
      {last ? (
        <span aria-hidden className="absolute left-0 top-0 h-1/2 w-3 rounded-bl-[9px] border-b border-l border-[var(--color-border-strong)]" />
      ) : (
        <>
          <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-[var(--color-border-strong)]" />
          <span aria-hidden className="absolute left-0 top-1/2 h-px w-3 bg-[var(--color-border-strong)]" />
        </>
      )}
      {children}
    </div>
  )
}

/** A folding group: icon + title + chevron. Folded, it still tells you if something inside needs attention. */
function Group({ group, items, counts, now }: { group: NavGroup; items: NavItem[]; counts: Counts; now: number }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const stored = useUiStore((s) => s.navOpen[group.id])
  const setNavOpen = useUiStore((s) => s.setNavOpen)
  const holdsPage = items.some((i) => owns(i, pathname))
  const open = stored ?? holdsPage

  // landing on a page inside a folded group (a link, the back button…) unfolds it
  useEffect(() => {
    if (holdsPage && stored === false) setNavOpen(group.id, true)
  }, [holdsPage, pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const pending = items.reduce((sum, i) => sum + (i.badgeKey ? counts[i.badgeKey] : 0), 0)
  const fresh = items.some((i) => i.newSince && isFresh(i.newSince, now))

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setNavOpen(group.id, !open)}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)]',
          holdsPage && !open ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]',
        )}
      >
        <group.icon size={17} />
        <span className="flex-1 truncate text-[13px] font-semibold">{t(group.title)}</span>
        {!open && fresh && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-lime)]" />}
        {!open && pending > 0 && <span className="font-mono text-[11px] font-semibold text-[var(--color-amber)]">{pending}</span>}
        <ChevronRight size={14} className={cn('shrink-0 text-[var(--color-ink-tertiary)] transition-transform duration-200', open && 'rotate-90')} />
      </button>
      <div className={cn('grid transition-[grid-template-rows] duration-200 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="ml-[18px] space-y-0.5 py-0.5" inert={!open}>
            {items.map((item, i) => (
              <TreeRow key={item.to} last={i === items.length - 1}>
                <ItemLink item={item} collapsed={false} counts={counts} indent />
              </TreeRow>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { t } = useI18n()
  const role = useAuthStore((s) => s.role)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const { data: reviewQueue } = useReviewQueue()
  const { data: disputes } = useDisputes('open')
  const changelogUnread = useChangelogUnread()
  const [now] = useState(() => Date.now())

  const counts: Counts = {
    review: reviewQueue?.length ?? 0,
    disputes: disputes?.length ?? 0,
    changelog: changelogUnread,
  }
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  const allowed = (items: NavItem[]) => items.filter((item) => !item.permission || roleHasPermission(role, item.permission))
  const pinned = allowed(PINNED)
  const groups = GROUPS.map((g) => ({ group: g, items: allowed(g.items) })).filter((g) => g.items.length > 0)

  const windowHeight = useWindowHeight()
  const rail = railMetrics(windowHeight, pinned.length + groups.reduce((n, g) => n + g.items.length, 0), groups.length)
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
        {collapsed ? (
          // icon-only rail: every page stays one click away, groups are just separated by a line
          <>
            <div className="space-y-0.5">
              {pinned.map((item) => (
                <ItemLink key={item.to} item={item} collapsed counts={counts} railIcon={rail.icon} />
              ))}
            </div>
            {groups.map(({ group, items }) => (
              <div key={group.id}>
                <div style={{ margin: `${rail.divider}px 8px` }} className="h-px bg-[var(--color-border)]" />
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <ItemLink key={item.to} item={item} collapsed counts={counts} railIcon={rail.icon} />
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="space-y-0.5 pb-1">
              {pinned.map((item) => (
                <ItemLink key={item.to} item={item} collapsed={false} counts={counts} />
              ))}
            </div>
            {groups.map(({ group, items }) => (
              <Group key={group.id} group={group} items={items} counts={counts} now={now} />
            ))}
          </>
        )}
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
