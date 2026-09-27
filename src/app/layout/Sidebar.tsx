import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  Fuel,
  Gauge,
  Megaphone,
  MessageSquareWarning,
  Percent,
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

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  permission?: Permission
  badgeKey?: 'review' | 'disputes'
  comingSoon?: boolean
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Ko'rish",
    items: [
      { to: '/', label: 'Bosh sahifa', icon: Gauge, permission: 'overview.view' },
      { to: '/analytics', label: 'Analitika', icon: BarChart3, permission: 'analytics.view' },
    ],
  },
  {
    title: 'Nazorat',
    items: [
      { to: '/review', label: 'Tekshiruv', icon: ClipboardList, permission: 'review.decide', badgeKey: 'review' },
      { to: '/disputes', label: 'Taklif va shikoyat', icon: MessageSquareWarning, permission: 'disputes.decide', badgeKey: 'disputes' },
    ],
  },
  {
    title: 'Boshqaruv',
    items: [
      { to: '/cashiers', label: 'Kassirlar', icon: Users2, permission: 'cashiers.manage' },
      { to: '/stations', label: 'Filiallar', icon: Store, permission: 'stations.manage' },
      { to: '/bonus', label: 'Bonus', icon: Percent, permission: 'bonus.view' },
      { to: '/broadcasts', label: 'Xabarnomalar', icon: Megaphone, permission: 'broadcasts.manage' },
      { to: '/admins', label: 'Adminlar', icon: ShieldCheck, permission: 'admins.manage' },
      { to: '/clients', label: 'Mijozlar', icon: Users, permission: 'clients.view' },
    ],
  },
  {
    title: 'Tizim',
    items: [
      { to: '/audit', label: 'Audit', icon: ScrollText, comingSoon: true },
      { to: '/settings', label: 'Sozlamalar', icon: Settings, comingSoon: true },
    ],
  },
]

export function Sidebar() {
  const role = useAuthStore((s) => s.role)
  const { data: reviewQueue } = useReviewQueue()
  const { data: disputes } = useDisputes('open')

  const badgeCounts = {
    review: reviewQueue?.length ?? 0,
    disputes: disputes?.length ?? 0,
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-soft)]">
          <Fuel size={18} className="text-[var(--color-primary)]" />
        </div>
        <span className="text-[15px] font-bold text-[var(--color-ink)]">AGNKS</span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => !item.permission || roleHasPermission(role, item.permission))
          if (visibleItems.length === 0) return null
          return (
            <div key={group.title}>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                        isActive
                          ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                          : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]',
                      )
                    }
                  >
                    <span className="flex items-center gap-2.5">
                      <item.icon size={16} />
                      {item.label}
                    </span>
                    {item.comingSoon && (
                      <span className="rounded-full bg-[var(--color-surface-alt)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-tertiary)]">
                        Tez orada
                      </span>
                    )}
                    {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                      <span className="rounded-full bg-[var(--color-danger)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {badgeCounts[item.badgeKey]}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
