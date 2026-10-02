import { useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/shared/ui/Card'
import { TrendChart } from '@/shared/ui/charts/lazy'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { ExportButton } from '@/features/export/ExportButton'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { apiAnalyticsSeries, type SeriesPoint } from '@/shared/api/analytics'
import { formatDateShort } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import { GRANULARITY_KEYS, type Granularity } from '@/shared/lib/granularity'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const columns: DataTableColumn<SeriesPoint>[] = [
  { id: 'date', header: 'common.date', accessor: (r) => r.bucket, cell: (r) => formatDateShort(r.bucket), sticky: true },
  { id: 'count', header: 'analytics.receipts_count', accessor: (r) => r.count, numeric: true },
  { id: 'given', header: 'analytics.bonus_given', accessor: (r) => r.sum, numeric: true, cell: (r) => formatMoneyFull(r.sum) },
]

export function BonusTab() {
  const { t } = useI18n()
  const { filters } = useGlobalFilters()
  const [granularity, setGranularity] = useState<Granularity>('day')
  const key = ['analytics-bonus', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString(), granularity]
  const { data, isLoading, error, mutate } = useSWR(key, () => apiAnalyticsSeries('bonus', filters, granularity), { keepPreviousData: true })
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
          <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-ink)]">{t('analytics.bonus_given')}</h3>
          {isLoading ? <Skeleton className="h-72 w-full" /> : series.length === 0 ? <EmptyState title={t('common.no_data_period')} /> : <TrendChart
            data={series.map((s) => ({ label: formatDateShort(s.bucket), value: s.sum }))}
            seriesName={t('analytics.bonus_given')}
            format={formatMoneyFull}
            color="var(--chart-3)"
            bars
          />}
        </Card>
      </ErrorBoundary>

      <ErrorBoundary label={t('common.table_load_failed')}>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{t('common.period_breakdown')}</h3>
            <ExportButton rows={series as unknown as Record<string, unknown>[]} filename="bonus" />
          </div>
          <DataTable columns={columns} data={series} loading={isLoading} error={error ? t('common.load_failed') : undefined} onRetry={() => mutate()} />
        </div>
      </ErrorBoundary>
    </div>
  )
}
