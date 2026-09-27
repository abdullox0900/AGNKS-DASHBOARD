import useSWR from 'swr'
import type { EChartsOption } from 'echarts'
import { Card } from '@/shared/ui/Card'
import { Chart } from '@/shared/ui/Chart'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { apiAnalyticsStations } from '@/shared/api/analytics'
import type { Filter } from '@/shared/api/client'
import { stationColor } from '@/shared/lib/colors'
import { formatMoneyFull } from '@/shared/lib/format'

export function StationShareChart({ filters }: { filters: Filter }) {
  const key = ['station-share', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString()]
  const { data, isLoading } = useSWR(key, () => apiAnalyticsStations(filters), { keepPreviousData: true })
  const rows = data ?? []

  const total = rows.reduce((s, r) => s + r.sum, 0)
  const sorted = [...rows].sort((a, b) => b.sum - a.sum)

  const option: EChartsOption = {
    grid: { left: 130, right: 40, top: 10, bottom: 10 },
    tooltip: { trigger: 'axis', valueFormatter: (v) => formatMoneyFull(Number(v)) },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: sorted.map((s) => s.name).reverse(), axisLine: { show: false }, axisTick: { show: false } },
    series: [
      {
        type: 'bar',
        data: sorted.map((s) => s.sum).reverse(),
        barWidth: 18,
        itemStyle: { color: (p) => stationColor(sorted.length - 1 - (p.dataIndex as number)), borderRadius: 4 },
        label: {
          show: true,
          position: 'right',
          formatter: (p) => (total > 0 ? `${Math.round(((p.value as number) / total) * 100)}%` : '0%'),
          fontSize: 12,
        },
      },
    ],
  }

  return (
    <Card>
      <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-ink)]">Filiallar ulushi</h3>
      {isLoading ? <Skeleton className="h-56 w-full" /> : sorted.length === 0 ? <EmptyState title="Bu davrda ma'lumot yo'q" /> : <Chart option={option} height={Math.max(160, sorted.length * 42)} />}
    </Card>
  )
}
