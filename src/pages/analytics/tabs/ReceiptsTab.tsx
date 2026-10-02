import { useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/shared/ui/Card'
import { ComboChart } from '@/shared/ui/charts/lazy'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { ExportButton } from '@/features/export/ExportButton'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { apiAnalyticsSeries, type SeriesPoint } from '@/shared/api/analytics'
import { formatDateShort } from '@/shared/lib/dates'
import { formatMoneyFull, formatNumber } from '@/shared/lib/format'
import { GRANULARITY_KEYS, type Granularity } from '@/shared/lib/granularity'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const columns: DataTableColumn<SeriesPoint>[] = [
  { id: 'date', header: 'common.date', accessor: (r) => r.bucket, cell: (r) => formatDateShort(r.bucket), sticky: true },
  { id: 'count', header: 'common.count', accessor: (r) => r.count, numeric: true, cell: (r) => formatNumber(r.count) },
  { id: 'sum', header: 'common.amount', accessor: (r) => r.sum, numeric: true, cell: (r) => formatMoneyFull(r.sum) },
  { id: 'avg', header: 'analytics.avg_receipt', accessor: (r) => (r.count > 0 ? r.sum / r.count : 0), numeric: true, cell: (r) => formatMoneyFull(r.count > 0 ? Math.round(r.sum / r.count) : 0) },
]

export function ReceiptsTab() {
  const { t } = useI18n()
  const { filters } = useGlobalFilters()
  const [granularity, setGranularity] = useState<Granularity>('day')
  const key = ['analytics-receipts', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString(), granularity]
  const { data, isLoading, error, mutate } = useSWR(key, () => apiAnalyticsSeries('receipts', filters, granularity), { keepPreviousData: true })

  const series = data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
          {(['day', 'week', 'month'] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[12px] font-medium',
                granularity === g ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)]',
              )}
            >
              {t(GRANULARITY_KEYS[g])}
            </button>
          ))}
        </div>
      </div>

      <ErrorBoundary label={t('common.chart_load_failed')}>
        <Card>
          <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-ink)]">{t('analytics.receipts_chart')}</h3>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : error ? (
            <p className="py-8 text-center text-[13px] text-[var(--color-ink-secondary)]">{t('common.load_failed')}</p>
          ) : series.length === 0 ? (
            <EmptyState title={t('common.no_data_period')} />
          ) : (
            <ComboChart
              data={series.map((s) => ({ label: formatDateShort(s.bucket), count: s.count, sum: s.sum }))}
              countName={t('common.count')}
              sumName={t('common.amount')}
              formatSum={formatMoneyFull}
            />
          )}
        </Card>
      </ErrorBoundary>

      <ErrorBoundary label={t('common.table_load_failed')}>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{t('common.period_breakdown')}</h3>
            <ExportButton rows={series as unknown as Record<string, unknown>[]} filename="cheklar" />
          </div>
          <DataTable columns={columns} data={series} loading={isLoading} error={error ? t('common.table_load_failed') : undefined} onRetry={() => mutate()} />
        </div>
      </ErrorBoundary>
    </div>
  )
}
