import { useState } from 'react'
import useSWR from 'swr'
import type { EChartsOption } from 'echarts'
import { Card } from '@/shared/ui/Card'
import { Chart } from '@/shared/ui/Chart'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { apiAnalyticsClientsSeries } from '@/shared/api/analytics'
import { formatDateShort } from '@/shared/lib/dates'
import { GRANULARITY_LABELS, type Granularity } from '@/shared/lib/granularity'
import { cn } from '@/shared/lib/cn'

export function ClientsTab() {
  const { filters } = useGlobalFilters()
  const [granularity, setGranularity] = useState<Granularity>('day')
  const key = ['analytics-clients', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString(), granularity]
  const { data, isLoading } = useSWR(key, () => apiAnalyticsClientsSeries(filters, granularity), { keepPreviousData: true })
  const series = data ?? []

  const option: EChartsOption = {
    grid: { left: 50, right: 16, top: 24, bottom: 32 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: series.map((s) => formatDateShort(s.bucket)) },
    yAxis: { type: 'value' },
    series: [{ name: 'Yangi mijozlar', type: 'bar', data: series.map((s) => s.count), itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] } }],
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
          <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-ink)]">Yangi mijozlar</h3>
          {isLoading ? <Skeleton className="h-72 w-full" /> : series.length === 0 ? <EmptyState title="Bu davrda ma'lumot yo'q" /> : <Chart option={option} height={300} />}
        </Card>
      </ErrorBoundary>
    </div>
  )
}
