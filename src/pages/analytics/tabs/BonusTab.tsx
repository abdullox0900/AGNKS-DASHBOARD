import { useState } from 'react'
import useSWR from 'swr'
import type { EChartsOption } from 'echarts'
import { Card } from '@/shared/ui/Card'
import { Chart } from '@/shared/ui/Chart'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { ExportButton } from '@/features/export/ExportButton'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { apiAnalyticsSeries, type SeriesPoint } from '@/shared/api/analytics'
import { formatDateShort } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import { GRANULARITY_LABELS, type Granularity } from '@/shared/lib/granularity'
import { cn } from '@/shared/lib/cn'

const columns: DataTableColumn<SeriesPoint>[] = [
  { id: 'date', header: 'Sana', accessor: (r) => r.bucket, cell: (r) => formatDateShort(r.bucket), sticky: true },
  { id: 'count', header: 'Cheklar soni', accessor: (r) => r.count, numeric: true },
  { id: 'given', header: 'Berilgan bonus', accessor: (r) => r.sum, numeric: true, cell: (r) => formatMoneyFull(r.sum) },
]

export function BonusTab() {
  const { filters } = useGlobalFilters()
  const [granularity, setGranularity] = useState<Granularity>('day')
  const key = ['analytics-bonus', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString(), granularity]
  const { data, isLoading, error, mutate } = useSWR(key, () => apiAnalyticsSeries('bonus', filters, granularity), { keepPreviousData: true })
  const series = data ?? []

  const option: EChartsOption = {
    grid: { left: 60, right: 16, top: 30, bottom: 32 },
    tooltip: { trigger: 'axis', valueFormatter: (v) => formatMoneyFull(Number(v)) },
    xAxis: { type: 'category', data: series.map((s) => formatDateShort(s.bucket)) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => (v >= 1_000_000 ? `${v / 1_000_000}mln` : String(v)) } },
    series: [{ name: 'Berilgan bonus', type: 'bar', data: series.map((s) => s.sum), itemStyle: { color: '#b45309', borderRadius: [4, 4, 0, 0] } }],
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
          {(['day', 'week', 'month'] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={cn('rounded-md px-2.5 py-1 text-[12px] font-medium', granularity === g ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-ink-secondary)]')}
            >
              {GRANULARITY_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <ErrorBoundary label="Grafikni yuklab bo'lmadi">
        <Card>
          <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-ink)]">Berilgan bonus</h3>
          {isLoading ? <Skeleton className="h-72 w-full" /> : series.length === 0 ? <EmptyState title="Bu davrda ma'lumot yo'q" /> : <Chart option={option} height={300} />}
        </Card>
      </ErrorBoundary>

      <ErrorBoundary label="Jadvalni yuklab bo'lmadi">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Davr kesimi</h3>
            <ExportButton rows={series as unknown as Record<string, unknown>[]} filename="bonus" />
          </div>
          <DataTable columns={columns} data={series} loading={isLoading} error={error ? "Yuklab bo'lmadi" : undefined} onRetry={() => mutate()} />
        </Card>
      </ErrorBoundary>
    </div>
  )
}
