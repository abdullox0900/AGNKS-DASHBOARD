import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { KpiStrip } from '@/widgets/KpiStrip'
import { BonusBudget } from '@/widgets/BonusBudget'
import { StationRanking } from '@/widgets/StationRanking'
import { CashierShareDonut, StationShareDonut } from '@/widgets/ShareDonuts'
import { AttentionBanner } from '@/widgets/AttentionBanner'
import { StationsMap } from '@/widgets/StationsMap'
import { SystemStatus } from '@/widgets/SystemStatus'
import { ActivePromotions } from '@/widgets/ActivePromotions'
import { DailyReceiptsChart } from '@/widgets/charts/DailyReceiptsChart'
import { HourlyLoadChart } from '@/widgets/charts/HourlyLoadChart'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { useIsNetworkWide } from '@/shared/lib/permissions'
import { useI18n } from '@/app/providers/I18nProvider'

export function OverviewPage() {
  const { t } = useI18n()
  const { filters } = useGlobalFilters()
  const isNetworkWide = useIsNetworkWide()
  const showRanking = isNetworkWide && (!filters.stationIds || filters.stationIds.length > 1)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-[24px] font-bold text-[var(--color-ink)]">{t('overview.title')}</h1>
        <SystemStatus filters={filters} />
      </header>

      <ErrorBoundary label={t('log.failed')}>
        <AttentionBanner filters={filters} />
      </ErrorBoundary>

      <ErrorBoundary label={t('kpi.load_failed')}>
        <KpiStrip filters={filters} />
      </ErrorBoundary>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <ErrorBoundary label={t('common.chart_load_failed')}>
          <DailyReceiptsChart filters={filters} />
        </ErrorBoundary>
        <ErrorBoundary label={t('budget.load_failed')}>
          <BonusBudget filters={filters} />
        </ErrorBoundary>
      </div>

      <div className={showRanking ? 'grid gap-5 xl:grid-cols-2' : 'grid gap-5'}>
        {showRanking && (
          <ErrorBoundary label={t('common.chart_load_failed')}>
            <StationRanking filters={filters} />
          </ErrorBoundary>
        )}
        <ErrorBoundary label={t('chart.heatmap_failed')}>
          <HourlyLoadChart filters={filters} />
        </ErrorBoundary>
      </div>

      <ErrorBoundary label={t('promos.failed')}>
        <ActivePromotions filters={filters} />
      </ErrorBoundary>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))]">
        {showRanking && (
          <ErrorBoundary label={t('common.chart_load_failed')}>
            <StationShareDonut filters={filters} />
          </ErrorBoundary>
        )}
        <ErrorBoundary label={t('common.chart_load_failed')}>
          <CashierShareDonut filters={filters} />
        </ErrorBoundary>
      </div>

      {isNetworkWide && (
        <ErrorBoundary label={t('common.chart_load_failed')}>
          <StationsMap filters={filters} />
        </ErrorBoundary>
      )}
    </div>
  )
}
