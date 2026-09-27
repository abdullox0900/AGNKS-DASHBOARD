import { useState } from 'react'
import useSWR from 'swr'
import type { EChartsOption } from 'echarts'
import { Card } from '@/shared/ui/Card'
import { Chart } from '@/shared/ui/Chart'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { ExportButton } from '@/features/export/ExportButton'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { apiAnalyticsStations, type StationRow } from '@/shared/api/analytics'
import { formatMoneyFull, formatNumber } from '@/shared/lib/format'
import { stationColor } from '@/shared/lib/colors'
import { cn } from '@/shared/lib/cn'

const columns: DataTableColumn<StationRow>[] = [
  { id: 'station', header: 'Filial', accessor: (r) => r.name, sticky: true },
  { id: 'count', header: 'Cheklar', accessor: (r) => r.count, numeric: true, cell: (r) => formatNumber(r.count) },
  { id: 'sum', header: 'Summa', accessor: (r) => r.sum, numeric: true, cell: (r) => formatMoneyFull(r.sum) },
]

export function StationsTab() {
  const { filters } = useGlobalFilters()
  const [metric, setMetric] = useState<'count' | 'sum'>('sum')
  const key = ['analytics-stations', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString()]
  const { data, isLoading, error, mutate } = useSWR(key, () => apiAnalyticsStations(filters), { keepPreviousData: true })
  const rows = data ?? []

  const option: EChartsOption = {
    grid: { left: 130, right: 16, top: 10, bottom: 10 },
    tooltip: { valueFormatter: (v) => (metric === 'sum' ? formatMoneyFull(Number(v)) : formatNumber(Number(v))) },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: rows.map((s) => s.name), axisLine: { show: false }, axisTick: { show: false } },
    series: [
      {
        type: 'bar',
        data: rows.map((s) => s[metric]),
        barWidth: 20,
        itemStyle: { color: (p) => stationColor(p.dataIndex as number), borderRadius: 4 },
      },
    ],
  }

  return (
    <div className="space-y-4">
      <ErrorBoundary label="Grafikni yuklab bo'lmadi">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Filiallar solishtiruvi</h3>
            <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
              {(['sum', 'count'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={cn('rounded-md px-2.5 py-1 text-[12px] font-medium', metric === m ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-ink-secondary)]')}
                >
                  {m === 'sum' ? 'Cheklar summasi' : 'Cheklar soni'}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? <Skeleton className="h-56 w-full" /> : <Chart option={option} height={Math.max(160, rows.length * 42)} />}
        </Card>
      </ErrorBoundary>

      <ErrorBoundary label="Jadvalni yuklab bo'lmadi">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Filiallar bo'yicha</h3>
            <ExportButton rows={rows as unknown as Record<string, unknown>[]} filename="filiallar" />
          </div>
          <DataTable columns={columns} data={rows} loading={isLoading} error={error ? "Yuklab bo'lmadi" : undefined} onRetry={() => mutate()} getRowId={(r) => r.stationId} />
        </Card>
      </ErrorBoundary>
    </div>
  )
}
