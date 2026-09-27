import { useState } from 'react'
import useSWR from 'swr'
import type { EChartsOption } from 'echarts'
import { Card } from '@/shared/ui/Card'
import { Chart } from '@/shared/ui/Chart'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { Drawer } from '@/shared/ui/Drawer'
import { Badge } from '@/shared/ui/Badge'
import { ExportButton } from '@/features/export/ExportButton'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { apiAnalyticsCashiers, type CashierRow } from '@/shared/api/analytics'
import { apiGetShifts } from '@/shared/api/client'
import { formatMoneyFull, formatNumber } from '@/shared/lib/format'
import { formatDateTime } from '@/shared/lib/dates'

const columns: DataTableColumn<CashierRow>[] = [
  { id: 'name', header: 'Kassir', accessor: (r) => r.firstName, sticky: true },
  { id: 'ops', header: 'Yechimlar', accessor: (r) => r.count, numeric: true, cell: (r) => formatNumber(r.count) },
  { id: 'sum', header: 'Yechilgan summa', accessor: (r) => r.sum, numeric: true, cell: (r) => formatMoneyFull(r.sum) },
  { id: 'avg', header: "O'rtacha yechim", accessor: (r) => (r.count > 0 ? r.sum / r.count : 0), numeric: true, cell: (r) => formatMoneyFull(r.count > 0 ? Math.round(r.sum / r.count) : 0) },
]

export function CashiersTab() {
  const { filters } = useGlobalFilters()
  const key = ['analytics-cashiers', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString()]
  const { data, isLoading, error, mutate } = useSWR(key, () => apiAnalyticsCashiers(filters), { keepPreviousData: true })
  const [selected, setSelected] = useState<CashierRow | null>(null)
  const rows = data ?? []

  const sorted = [...rows].sort((a, b) => b.sum - a.sum).slice(0, 15)
  const option: EChartsOption = {
    grid: { left: 100, right: 16, top: 10, bottom: 10 },
    tooltip: { valueFormatter: (v) => formatMoneyFull(Number(v)) },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: sorted.map((s) => s.firstName).reverse(), axisLine: { show: false }, axisTick: { show: false } },
    series: [{ type: 'bar', data: sorted.map((s) => s.sum).reverse(), barWidth: 16, itemStyle: { color: '#b45309', borderRadius: 4 } }],
  }

  return (
    <div className="space-y-4">
      <ErrorBoundary label="Grafikni yuklab bo'lmadi">
        <Card>
          <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-ink)]">Kassirlar bo'yicha yechilgan bonus</h3>
          {isLoading ? <Skeleton className="h-64 w-full" /> : <Chart option={option} height={Math.max(160, sorted.length * 28)} />}
        </Card>
      </ErrorBoundary>

      <ErrorBoundary label="Jadvalni yuklab bo'lmadi">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Kassirlar bo'yicha</h3>
            <ExportButton rows={rows as unknown as Record<string, unknown>[]} filename="kassirlar" />
          </div>
          <DataTable columns={columns} data={rows} loading={isLoading} error={error ? "Yuklab bo'lmadi" : undefined} onRetry={() => mutate()} getRowId={(r) => r.cashierId} onRowClick={(r) => setSelected(r)} />
        </Card>
      </ErrorBoundary>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.firstName}>
        {selected && <CashierDetail row={selected} />}
      </Drawer>
    </div>
  )
}

function CashierDetail({ row }: { row: CashierRow }) {
  const { data: shifts, isLoading } = useSWR(['cashier-shifts', row.cashierId], () => apiGetShifts({}))
  const ownShifts = (shifts ?? []).filter((s) => s.cashierId === row.cashierId).slice(0, 15)

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
        <p className="text-[11px] text-[var(--color-ink-tertiary)]">Yechilgan summa</p>
        <p className="tnum text-[16px] font-bold text-[var(--color-amber)]">{formatMoneyFull(row.sum)}</p>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">Smenalar</p>
        {isLoading ? (
          <p className="text-[13px] text-[var(--color-ink-tertiary)]">Yuklanmoqda…</p>
        ) : (
          <div className="space-y-1.5">
            {ownShifts.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-[12.5px]">
                <span className="text-[var(--color-ink-secondary)]">{formatDateTime(s.openedAt)}</span>
                <Badge tone={s.status === 'open' ? 'primary' : 'neutral'}>{s.status === 'open' ? 'Ochiq' : 'Yopilgan'}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
