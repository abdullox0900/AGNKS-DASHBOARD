import { useMemo } from 'react'
import useSWR from 'swr'
import { Download } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { PageTitle } from '@/shared/ui/PageTitle'
import { Rich } from '@/shared/ui/Rich'
import { Skeleton } from '@/shared/ui/Skeleton'
import { StatStrip } from '@/shared/ui/StatStrip'
import { TrendChart } from '@/shared/ui/charts/lazy'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { apiAnalyticsCashiers, apiAnalyticsSeries, apiAnalyticsStations, type SeriesPoint } from '@/shared/api/analytics'
import { apiClientsStats } from '@/shared/api/client'
import { formatDateShort } from '@/shared/lib/dates'
import { formatMoneyCompact, formatNumber } from '@/shared/lib/format'
import { useIsNetworkWide } from '@/shared/lib/permissions'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

type Gran = 'day' | 'week' | 'month'
const card = 'dt-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]'
const DAY = 86_400_000

const todayKey = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10)
const bucketKey = (b: string) => new Date(new Date(b).getTime() + 5 * 3_600_000).toISOString().slice(0, 10)

interface Row {
  key: string
  label: string
  count: number
  sum: number
  bonus: number
  /** today, not over yet */
  open: boolean
}

function CardHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[16px] font-semibold text-[var(--color-ink)]">{title}</h3>
        {sub && <p className="mt-0.5 text-[13px] text-[var(--color-ink-tertiary)]">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/** Small bar strip; the unfinished last bucket is drawn dim. */
function MiniBars({ rows, value }: { rows: Row[]; value: (r: Row) => number }) {
  const max = Math.max(1, ...rows.map(value))
  return (
    <div className="mt-3 flex h-[64px] items-end gap-[3px]">
      {rows.map((r) => (
        <span
          key={r.key}
          title={`${r.label}: ${formatNumber(value(r))}`}
          className={cn('min-w-[2px] flex-1 rounded-t-[3px]', r.open ? 'bg-[var(--color-ink-tertiary)]/40' : 'bg-[var(--chart-1)]')}
          style={{ height: `${Math.max(3, (value(r) / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono font-bold text-[var(--color-ink)]">{children}</span>
}

/** "Analitika": everything on one page — dynamics on the left, comparison and rules on the right. */
export function AnalyticsPage() {
  const { t } = useI18n()
  const { filters } = useGlobalFilters()
  const networkWide = useIsNetworkWide()
  const spanDays = Math.max(1, Math.round((filters.to.getTime() - filters.from.getTime()) / DAY))
  const gran: Gran = spanDays <= 62 ? 'day' : spanDays <= 400 ? 'week' : 'month'
  const fkey = [filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString(), gran]

  const receipts = useSWR(['an2-receipts', ...fkey], () => apiAnalyticsSeries('receipts', filters, gran), { keepPreviousData: true })
  const bonus = useSWR(['an2-bonus', ...fkey], () => apiAnalyticsSeries('bonus', filters, gran), { keepPreviousData: true })
  const stations = useSWR(networkWide ? ['an2-stations', ...fkey] : null, () => apiAnalyticsStations(filters), { keepPreviousData: true })
  const cashiers = useSWR(['an2-cashiers', ...fkey], () => apiAnalyticsCashiers(filters), { keepPreviousData: true })
  const clients = useSWR('/admin/clients/stats', apiClientsStats, { refreshInterval: 60_000 })

  const rows: Row[] = useMemo(() => {
    const bonusBy = new Map((bonus.data ?? []).map((b: SeriesPoint) => [bucketKey(b.bucket), b.sum]))
    const today = todayKey()
    return (receipts.data ?? []).map((r) => {
      const key = bucketKey(r.bucket)
      return { key, label: formatDateShort(r.bucket), count: r.count, sum: r.sum, bonus: bonusBy.get(key) ?? 0, open: gran === 'day' && key === today }
    })
  }, [receipts.data, bonus.data, gran])

  const full = rows.filter((r) => !r.open)
  const totalCount = rows.reduce((s, r) => s + r.count, 0)
  const totalSum = rows.reduce((s, r) => s + r.sum, 0)
  const totalBonus = (bonus.data ?? []).reduce((s, b) => s + b.sum, 0)
  const avg = (f: (r: Row) => number) => (full.length ? full.reduce((s, r) => s + f(r), 0) / full.length : 0)
  const peak = (f: (r: Row) => number) => Math.max(0, ...rows.map(f))
  const unitKey: Record<Gran, DictKey> = { day: 'an2.u_day', week: 'an2.u_week', month: 'an2.u_month' }
  const perKey: Record<Gran, DictKey> = { day: 'an2.per_day', week: 'an2.per_week', month: 'an2.per_month' }
  const byKey: Record<Gran, DictKey> = { day: 'an2.by_day', week: 'an2.by_week', month: 'an2.by_month' }
  const loading = receipts.isLoading && !receipts.data
  const openRow = rows.find((r) => r.open)

  const stationRows = [...(stations.data ?? [])].sort((a, b) => b.sum - a.sum)
  const stationTotal = stationRows.reduce((s, r) => s + r.sum, 0) || 1
  const cashierRows = [...(cashiers.data ?? [])].sort((a, b) => b.sum - a.sum).slice(0, 8)
  const cashierMax = Math.max(1, ...cashierRows.map((c) => c.sum))

  function exportCsv() {
    const head = [t('an2.c_date'), t('an2.c_count'), t('an2.c_sum'), t('an2.c_avg'), t('an2.c_bonus')]
    const lines = rows.map((r) => [r.key, r.count, Math.round(r.sum), r.count ? Math.round(r.sum / r.count) : 0, Math.round(r.bonus)].join(';'))
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `analitika_${rows[0]?.key ?? ''}_${rows.at(-1)?.key ?? ''}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const dayColumns: DataTableColumn<Row>[] = [
    { id: 'date', header: 'an2.c_date', accessor: (r) => r.key, cell: (r) => <span className={cn('font-medium', r.open && 'text-[var(--color-ink-tertiary)]')}>{r.label}</span> },
    { id: 'count', header: 'an2.c_count', numeric: true, accessor: (r) => r.count, cell: (r) => formatNumber(r.count) },
    { id: 'sum', header: 'an2.c_sum', numeric: true, accessor: (r) => r.sum, cell: (r) => formatNumber(r.sum) },
    { id: 'avg', header: 'an2.c_avg', numeric: true, accessor: (r) => (r.count ? r.sum / r.count : 0), cell: (r) => formatNumber(r.count ? r.sum / r.count : 0) },
    { id: 'bonus', header: 'an2.c_bonus', numeric: true, accessor: (r) => r.bonus, cell: (r) => formatNumber(r.bonus) },
  ]

  return (
    <div>
      <PageTitle title={t('nav.analytics')} sub={t('an2.subtitle')} />

      <StatStrip
        items={[
          {
            key: 'count',
            label: t('an2.receipts'),
            value: loading ? undefined : formatNumber(totalCount),
            hint: loading ? '' : t('an2.h_receipts', { n: rows.length, unit: t(unitKey[gran]), per: t(perKey[gran]), avg: formatNumber(avg((r) => r.count)) }),
          },
          { key: 'sum', label: t('an2.receipts_sum'), value: loading ? undefined : formatMoneyCompact(totalSum), hint: loading ? '' : t('an2.h_avg_check', { v: formatNumber(totalCount ? totalSum / totalCount : 0) }) },
          { key: 'bonus', label: t('an2.bonus'), value: bonus.data ? formatNumber(totalBonus) : undefined, hint: t('an2.h_som') },
          { key: 'clients', label: t('an2.clients'), value: clients.data && formatNumber(clients.data.total), hint: clients.data ? t('an2.h_clients', { today: clients.data.today, freq: formatNumber(clients.data.frequent) }) : '' },
        ]}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-5">
          <section className={cn(card, 'p-5')}>
            <CardHead title={t('an2.receipts_sum')} sub={t(byKey[gran])} />
            <div className="mt-4">
              {loading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <ErrorBoundary label={t('common.chart_load_failed')}>
                  <TrendChart data={rows.map((r) => ({ label: r.label, value: r.sum, title: r.label }))} seriesName={t('an2.receipts_sum')} format={(v) => `${formatNumber(v)} ${t('an2.h_som')}`} height={260} />
                </ErrorBoundary>
              )}
            </div>
            <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[var(--color-ink-tertiary)]">
              <span>
                {t('an2.peak')}: <Mono>{formatMoneyCompact(peak((r) => r.sum))}</Mono>
              </span>
              <span>
                {t('an2.avg')}: <Mono>{formatMoneyCompact(avg((r) => r.sum))}</Mono>
              </span>
              {openRow && <span>{t('an2.unfinished', { d: openRow.label })}</span>}
            </p>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            {(
              [
                { title: t('an2.c_count').replace(/,.*/, ''), f: (r: Row) => r.count, sub: t('an2.count_by') },
                { title: t('an2.bonus'), f: (r: Row) => r.bonus, sub: t(byKey[gran]) },
              ] as const
            ).map((c) => (
              <section key={c.title} className={cn(card, 'p-5')}>
                <CardHead title={c.title} sub={c.sub} />
                {loading ? <Skeleton className="mt-3 h-[64px] w-full" /> : <MiniBars rows={rows} value={c.f} />}
                <p className="mt-3 flex gap-5 text-[13px] text-[var(--color-ink-tertiary)]">
                  <span>
                    {t('an2.peak')} <Mono>{formatNumber(peak(c.f))}</Mono>
                  </span>
                  <span>
                    {t('an2.avg_short')} <Mono>{formatNumber(avg(c.f))}</Mono>
                  </span>
                </p>
              </section>
            ))}
          </div>

          <DataTable
            columns={dayColumns}
            data={[...rows].reverse()}
            loading={loading}
            getRowId={(r) => r.key}
            emptyMessage={t('common.no_data_period')}
            title={
              <div>
                <p className="text-[16px] font-semibold text-[var(--color-ink)]">{t('an2.days_title')}</p>
                <p className="text-[13px] text-[var(--color-ink-tertiary)]">{t('an2.days_sub')}</p>
              </div>
            }
            actions={
              <Button variant="secondary" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
                <Download size={14} /> {t('an2.export')}
              </Button>
            }
          />
        </div>

        <div className="space-y-5">
          {networkWide && (
            <section className={cn(card, 'p-5')}>
              <CardHead title={t('an2.stations')} sub={t('an2.stations_sub')} />
              <div className="mt-4 space-y-4">
                {stations.isLoading && !stations.data
                  ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
                  : stationRows.map((s) => (
                      <div key={s.stationId}>
                        <p className="flex items-baseline justify-between gap-3 text-[14px]">
                          <span className="truncate font-semibold text-[var(--color-ink)]">{s.name}</span>
                          <span className="shrink-0 font-mono text-[13px] text-[var(--color-ink-secondary)]">
                            {formatNumber(s.sum)} · {Math.round((s.sum / stationTotal) * 100)}%
                          </span>
                        </p>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[var(--color-track)]">
                          <span className="block h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${(s.sum / (stationRows[0]?.sum || 1)) * 100}%` }} />
                        </span>
                        <p className="mt-1 text-[12.5px] text-[var(--color-ink-tertiary)]">{t('an2.st_line', { n: formatNumber(s.count), avg: formatNumber(s.count ? s.sum / s.count : 0) })}</p>
                      </div>
                    ))}
              </div>
            </section>
          )}

          <section className={cn(card, 'p-5')}>
            <CardHead title={t('an2.cashiers')} sub={t('an2.cashiers_sub')} />
            <div className="mt-4 space-y-4">
              {cashiers.isLoading && !cashiers.data ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
              ) : cashierRows.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-[var(--color-ink-tertiary)]">{t('common.no_data_period')}</p>
              ) : (
                cashierRows.map((c) => (
                  <div key={c.cashierId}>
                    <p className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span className="truncate font-semibold text-[var(--color-ink)]">{c.firstName}</span>
                      <span className="shrink-0 font-mono text-[13px] text-[var(--color-ink-secondary)]">{formatNumber(c.sum)}</span>
                    </p>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[var(--color-track)]">
                      <span className="block h-full rounded-full bg-[var(--color-amber)]" style={{ width: `${(c.sum / cashierMax) * 100}%` }} />
                    </span>
                    <p className="mt-1 text-[12.5px] text-[var(--color-ink-tertiary)]">{t('an2.ca_line', { n: formatNumber(c.count), avg: formatNumber(c.count ? c.sum / c.count : 0) })}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={cn(card, 'p-5')}>
            <CardHead title={t('an2.rules')} sub={t('an2.rules_sub')} />
            <ul className="mt-3 list-disc space-y-2.5 pl-5 text-[13.5px] leading-relaxed text-[var(--color-ink-secondary)] marker:text-[var(--color-ink-tertiary)] [&_b]:font-semibold [&_b]:text-[var(--color-ink)]">
              {(['an2.r1', 'an2.r2', 'an2.r3', 'an2.r4', 'an2.r5', 'an2.r6'] as DictKey[]).map((k) => (
                <li key={k}>
                  <Rich text={t(k)} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

