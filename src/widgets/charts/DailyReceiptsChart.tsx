import useSWR from 'swr'
import type { EChartsOption } from 'echarts'
import { Card } from '@/shared/ui/Card'
import { Chart } from '@/shared/ui/Chart'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { apiAnalyticsSeries } from '@/shared/api/analytics'
import type { Filter } from '@/shared/api/client'
import { formatDateShort } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'

export function DailyReceiptsChart({ filters }: { filters: Filter }) {
  const key = ['daily-receipts', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString()]
  const { data, isLoading } = useSWR(key, () => apiAnalyticsSeries('receipts', filters, 'day'), { keepPreviousData: true })
  const series = data ?? []

  const option: EChartsOption = {
    grid: { left: 56, right: 16, top: 20, bottom: 32 },
    tooltip: { trigger: 'axis', valueFormatter: (v) => formatMoneyFull(Number(v)) },
    xAxis: { type: 'category', data: series.map((s) => formatDateShort(s.bucket)) },
    yAxis: { type: 'value', name: "so'm", axisLabel: { formatter: (v: number) => (v >= 1_000_000 ? `${v / 1_000_000}mln` : String(v)) } },
    series: [{ type: 'bar', data: series.map((s) => s.sum), itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] } }],
  }

  return (
    <Card>
      <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-ink)]">Kunlik cheklar summasi</h3>
      {isLoading ? <Skeleton className="h-72 w-full" /> : series.length === 0 ? <EmptyState title="Bu davrda ma'lumot yo'q" /> : <Chart option={option} height={280} />}
    </Card>
  )
}
