import useSWR from 'swr'
import type { EChartsOption } from 'echarts'
import { Card } from '@/shared/ui/Card'
import { Chart } from '@/shared/ui/Chart'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { apiAnalyticsHours } from '@/shared/api/analytics'
import type { Filter } from '@/shared/api/client'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

export function HourlyHeatmap({ filters }: { filters: Filter }) {
  const key = ['hourly-load', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString()]
  const { data, isLoading } = useSWR(key, () => apiAnalyticsHours(filters), { keepPreviousData: true })

  const byHour = new Map((data ?? []).map((r) => [r.hour, r.count]))
  const counts = Array.from({ length: 24 }, (_, h) => byHour.get(h) ?? 0)

  const option: EChartsOption = {
    grid: { left: 40, right: 16, top: 10, bottom: 30 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: HOURS, axisLabel: { fontSize: 10, interval: 1 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: counts, itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] } }],
  }

  return (
    <Card>
      <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-ink)]">Soatlik yuk</h3>
      {isLoading ? <Skeleton className="h-64 w-full" /> : counts.every((c) => c === 0) ? <EmptyState title="Bu davrda ma'lumot yo'q" /> : <Chart option={option} height={260} />}
    </Card>
  )
}
