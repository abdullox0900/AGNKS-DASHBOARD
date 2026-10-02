import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'
import { useIsNetworkWide } from '@/shared/lib/permissions'
import { ReceiptsTab } from './tabs/ReceiptsTab'
import { BonusTab } from './tabs/BonusTab'
import { ClientsTab } from './tabs/ClientsTab'
import { StationsTab } from './tabs/StationsTab'
import { CashiersTab } from './tabs/CashiersTab'

const TABS: { to: string; label: DictKey; networkOnly?: boolean }[] = [
  { to: '/analytics', label: 'common.receipts' },
  { to: '/analytics/bonus', label: 'common.bonus' },
  { to: '/analytics/clients', label: 'common.clients' },
  { to: '/analytics/stations', label: 'common.stations', networkOnly: true },
  { to: '/analytics/cashiers', label: 'common.cashiers' },
]

export function AnalyticsPage() {
  const { t } = useI18n()
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
            {t(tab.label)}
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
