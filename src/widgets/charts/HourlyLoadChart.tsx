import useSWR from 'swr'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { TrendChart } from '@/shared/ui/charts/lazy'
import { apiAnalyticsHours } from '@/shared/api/analytics'
import type { Filter } from '@/shared/api/client'
import { formatNumber } from '@/shared/lib/format'
import { useI18n } from '@/app/providers/I18nProvider'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

/** Receipts per hour of day — the tallest hour is highlighted. */
export function HourlyLoadChart({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const key = ['hourly-load', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString()]
  const { data, isLoading } = useSWR(key, () => apiAnalyticsHours(filters), { keepPreviousData: true })

  const byHour = new Map((data ?? []).map((r) => [r.hour, r.count]))
  const counts = HOURS.map((_, h) => byHour.get(h) ?? 0)
  const max = Math.max(...counts)
  const peak = counts.indexOf(max)

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('chart.hourly')}</h3>
        {max > 0 && (
          <span className="rounded-lg bg-[var(--color-surface-alt)] px-2.5 py-1 font-mono text-[12px] text-[var(--color-ink-secondary)]">
            {t('chart.hourly_peak')}: <b className="text-[var(--color-ink)]">{HOURS[peak]}:00</b>
          </span>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="min-h-[260px] w-full flex-1" />
      ) : max === 0 ? (
        <EmptyState title={t('common.no_data_period')} />
      ) : (
        <div className="relative min-h-[260px] flex-1">
          <TrendChart
            data={counts.map((c, h) => ({ label: HOURS[h], value: c, title: `${HOURS[h]}:00` }))}
            seriesName={t('common.count')}
            format={(v) => t('chart.receipts_n', { n: formatNumber(v) })}
            height="fill"
            bars
            highlightMax
          />
        </div>
      )}
    </Card>
  )
}
