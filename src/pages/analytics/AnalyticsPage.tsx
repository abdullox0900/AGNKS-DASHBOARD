import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useIsNetworkWide } from '@/shared/lib/permissions'
import { ReceiptsTab } from './tabs/ReceiptsTab'
import { BonusTab } from './tabs/BonusTab'
import { ClientsTab } from './tabs/ClientsTab'
import { StationsTab } from './tabs/StationsTab'
import { CashiersTab } from './tabs/CashiersTab'

const TABS = [
  { to: '/analytics', label: 'Cheklar' },
  { to: '/analytics/bonus', label: 'Bonus' },
  { to: '/analytics/clients', label: 'Mijozlar' },
  { to: '/analytics/stations', label: 'Filiallar', networkOnly: true },
  { to: '/analytics/cashiers', label: 'Kassirlar' },
]

export function AnalyticsPage() {
  const isNetworkWide = useIsNetworkWide()
  const tabs = TABS.filter((t) => !t.networkOnly || isNetworkWide)

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/analytics'}
            className={({ isActive }) =>
              cn(
                'border-b-2 px-3 pb-2.5 text-[13.5px] font-medium',
                isActive ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<ReceiptsTab />} />
        <Route path="bonus" element={<BonusTab />} />
        <Route path="clients" element={<ClientsTab />} />
        <Route path="stations" element={isNetworkWide ? <StationsTab /> : <Navigate to=".." replace />} />
        <Route path="cashiers" element={<CashiersTab />} />
      </Routes>
    </div>
  )
}
