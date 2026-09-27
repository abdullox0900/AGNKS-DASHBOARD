import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { KpiRow, BonusRow } from '@/widgets/KpiRow'
import { AlertsBlock } from '@/widgets/AlertsBlock'
import { ActivePromotions } from '@/widgets/ActivePromotions'
import { DailyReceiptsChart } from '@/widgets/charts/DailyReceiptsChart'
import { StationShareChart } from '@/widgets/charts/StationShareChart'
import { HourlyHeatmap } from '@/widgets/charts/HourlyHeatmap'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { useIsNetworkWide } from '@/shared/lib/permissions'

export function OverviewPage() {
  const { filters } = useGlobalFilters()
  const isNetworkWide = useIsNetworkWide()
  const showStationShare = isNetworkWide && (!filters.stationIds || filters.stationIds.length > 1)

  return (
    <div className="space-y-4">
      <ErrorBoundary label="KPI ko'rsatkichlarini yuklab bo'lmadi">
        <KpiRow filters={filters} />
      </ErrorBoundary>

      <ErrorBoundary label="Bonus ko'rsatkichlarini yuklab bo'lmadi">
        <BonusRow filters={filters} />
      </ErrorBoundary>

      <ErrorBoundary label="Diqqat blokini yuklab bo'lmadi">
        <AlertsBlock filters={filters} />
      </ErrorBoundary>

      <ErrorBoundary label="Aksiyalarni yuklab bo'lmadi">
        <ActivePromotions filters={filters} />
      </ErrorBoundary>

      <div className={showStationShare ? 'grid grid-cols-1 gap-4 lg:grid-cols-2' : 'grid grid-cols-1 gap-4'}>
        <ErrorBoundary label="Grafikni yuklab bo'lmadi">
          <DailyReceiptsChart filters={filters} />
        </ErrorBoundary>
        {showStationShare && (
          <ErrorBoundary label="Grafikni yuklab bo'lmadi">
            <StationShareChart filters={filters} />
          </ErrorBoundary>
        )}
      </div>

      <ErrorBoundary label="Issiqlik xaritasini yuklab bo'lmadi">
        <HourlyHeatmap filters={filters} />
      </ErrorBoundary>
    </div>
  )
}
