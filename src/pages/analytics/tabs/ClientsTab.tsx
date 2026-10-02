import { useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/shared/ui/Card'
import { TrendChart } from '@/shared/ui/charts/lazy'
import { formatNumber } from '@/shared/lib/format'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { apiAnalyticsClientsSeries } from '@/shared/api/analytics'
import { formatDateShort } from '@/shared/lib/dates'
import { GRANULARITY_KEYS, type Granularity } from '@/shared/lib/granularity'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

export function ClientsTab() {
  const { t } = useI18n()
  const { filters } = useGlobalFilters()
  const [granularity, setGranularity] = useState<Granularity>('day')
  const key = ['analytics-clients', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString(), granularity]
  const { data, isLoading } = useSWR(key, () => apiAnalyticsClientsSeries(filters, granularity), { keepPreviousData: true })
  const series = data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
          {(['day', 'week', 'month'] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={cn('rounded-md px-2.5 py-1 text-[12px] font-medium', granularity === g ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)]')}
            >
              {t(GRANULARITY_KEYS[g])}
            </button>
          ))}
        </div>
      </div>

      <ErrorBoundary label={t('common.chart_load_failed')}>
        <Card>
          <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-ink)]">{t('analytics.new_clients')}</h3>
          {isLoading ? <Skeleton className="h-72 w-full" /> : series.length === 0 ? <EmptyState title={t('common.no_data_period')} /> : <TrendChart
            data={series.map((s) => ({ label: formatDateShort(s.bucket), value: s.count }))}
            seriesName={t('analytics.new_clients')}
            format={formatNumber}
            bars
          />}
        </Card>
      </ErrorBoundary>
    </div>
  )
}
