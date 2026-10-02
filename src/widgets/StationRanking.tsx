import { useMemo } from 'react'
import useSWR from 'swr'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Delta } from '@/shared/ui/Delta'
import { Hint } from '@/shared/ui/Menu'
import { apiAnalyticsStations, type StationRow } from '@/shared/api/analytics'
import type { Filter } from '@/shared/api/client'
import { previousEqualPeriod } from '@/shared/lib/dates'
import { formatMoneyFull, formatMoneyShort, formatNumber } from '@/shared/lib/format'
import { useAnimatedValue } from '@/shared/lib/useAnimatedValue'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const keyOf = (name: string, f: Filter) => [name, f.stationIds?.join(',') ?? 'all', f.from.toISOString(), f.to.toISOString()]

function RankRow({ rank, row, topSum, total, before }: { rank: number; row: StationRow; topSum: number; total: number; before: number | undefined }) {
  const { t } = useI18n()
  const bar = useAnimatedValue(topSum > 0 ? (row.sum / topSum) * 100 : 0)
  const share = total > 0 ? Math.round((row.sum / total) * 100) : 0
  const avg = row.count > 0 ? Math.round(row.sum / row.count) : 0
  const empty = row.sum === 0

  return (
    <li className={cn('grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3.5 py-3', empty && 'opacity-55')}>
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[12px] font-bold',
          rank === 1 && !empty ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-ink-tertiary)]',
        )}
      >
        {rank}
      </span>

      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[13.5px] font-semibold text-[var(--color-ink)]" title={row.name}>
            {row.name}
          </p>
          <span className="shrink-0 font-mono text-[11.5px] text-[var(--color-ink-tertiary)]">{share}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full transition-[width] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)]"
            style={{ width: `${bar}%`, background: 'linear-gradient(90deg, color-mix(in srgb, var(--chart-1) 50%, transparent), var(--chart-1))' }}
          />
        </div>
        <p className="mt-1.5 font-mono text-[11.5px] text-[var(--color-ink-tertiary)]">
          {t('chart.receipts_n', { n: formatNumber(row.count) })}
          {avg > 0 && ` · ${t('rank.avg', { v: formatMoneyShort(avg) })}`}
        </p>
      </div>

      <div className="text-right">
        <Hint label={formatMoneyFull(row.sum)}>
          <p className="tnum w-fit text-[15px] font-bold text-[var(--color-ink)]">{formatMoneyShort(row.sum)}</p>
        </Hint>
        <Delta now={row.sum} before={before} className="mt-0.5" />
      </div>
    </li>
  )
}

/** Stations ranked by turnover for the selected period, with their share and growth vs the previous period. */
export function StationRanking({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const prevRange = useMemo(() => previousEqualPeriod(filters.from, filters.to), [filters.from, filters.to])
  const prevFilter: Filter = { stationIds: filters.stationIds, ...prevRange }

  const { data, isLoading } = useSWR(keyOf('station-rank', filters), () => apiAnalyticsStations(filters), { keepPreviousData: true })
  const { data: prev } = useSWR(keyOf('station-rank-prev', prevFilter), () => apiAnalyticsStations(prevFilter), { keepPreviousData: true })

  const rows = [...(data ?? [])].sort((a, b) => b.sum - a.sum)
  const prevById = new Map((prev ?? []).map((r) => [r.stationId, r.sum]))
  const total = rows.reduce((n, r) => n + r.sum, 0)

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-1">
        <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('rank.title')}</h3>
        <p className="text-[12px] text-[var(--color-ink-tertiary)]">{t('rank.subtitle')}</p>
      </div>
      {isLoading ? (
        <div className="space-y-3 pt-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState title={t('common.no_data_period')} />
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {rows.map((r, i) => (
            <RankRow key={r.stationId} rank={i + 1} row={r} topSum={rows[0].sum} total={total} before={prev ? prevById.get(r.stationId) ?? 0 : undefined} />
          ))}
        </ul>
      )}
    </Card>
  )
}
