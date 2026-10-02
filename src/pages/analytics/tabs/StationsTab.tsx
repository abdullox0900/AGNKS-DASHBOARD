import { useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/shared/ui/Card'
import { HBarChart } from '@/shared/ui/charts/lazy'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { ExportButton } from '@/features/export/ExportButton'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { apiAnalyticsStations, type StationRow } from '@/shared/api/analytics'
import { formatMoneyFull, formatNumber } from '@/shared/lib/format'
import { useI18n } from '@/app/providers/I18nProvider'
import { cn } from '@/shared/lib/cn'

const columns: DataTableColumn<StationRow>[] = [
  { id: 'station', header: 'common.station', accessor: (r) => r.name, sticky: true },
  { id: 'count', header: 'common.receipts', accessor: (r) => r.count, numeric: true, cell: (r) => formatNumber(r.count) },
  { id: 'sum', header: 'common.amount', accessor: (r) => r.sum, numeric: true, cell: (r) => formatMoneyFull(r.sum) },
]

export function StationsTab() {
  const { t } = useI18n()
  const { filters } = useGlobalFilters()
  const [metric, setMetric] = useState<'count' | 'sum'>('sum')
  const key = ['analytics-stations', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString()]
  const { data, isLoading, error, mutate } = useSWR(key, () => apiAnalyticsStations(filters), { keepPreviousData: true })
  const rows = data ?? []

  return (
    <div className="space-y-4">
      <ErrorBoundary label={t('common.chart_load_failed')}>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{t('analytics.compare_stations')}</h3>
            <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
              {(['sum', 'count'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={cn('rounded-md px-2.5 py-1 text-[12px] font-medium', metric === m ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)]')}
                >
                  {m === 'sum' ? t('analytics.receipts_sum') : t('analytics.receipts_count')}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? <Skeleton className="h-56 w-full" /> : <HBarChart
              data={rows.map((s) => ({ name: s.name, value: s[metric] }))}
              seriesName={metric === 'sum' ? t('analytics.receipts_sum') : t('analytics.receipts_count')}
              format={metric === 'sum' ? formatMoneyFull : formatNumber}
              multicolor
            />}
        </Card>
      </ErrorBoundary>

      <ErrorBoundary label={t('common.table_load_failed')}>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{t('analytics.by_stations')}</h3>
            <ExportButton rows={rows as unknown as Record<string, unknown>[]} filename="filiallar" />
          </div>
          <DataTable columns={columns} data={rows} loading={isLoading} error={error ? t('common.load_failed') : undefined} onRetry={() => mutate()} getRowId={(r) => r.stationId} />
        </div>
      </ErrorBoundary>
    </div>
  )
}
