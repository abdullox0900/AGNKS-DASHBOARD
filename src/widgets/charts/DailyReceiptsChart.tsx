import useSWR from 'swr'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { TrendChart } from '@/shared/ui/charts/lazy'
import { apiAnalyticsSeries } from '@/shared/api/analytics'
import type { Filter } from '@/shared/api/client'
import { formatDateShort } from '@/shared/lib/dates'
import { formatMoneyFull, formatMoneyShort } from '@/shared/lib/format'
import { useI18n } from '@/app/providers/I18nProvider'

export function DailyReceiptsChart({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const key = ['daily-receipts', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString()]
  const { data, isLoading } = useSWR(key, () => apiAnalyticsSeries('receipts', filters, 'day'), { keepPreviousData: true })
  const series = data ?? []
  const total = series.reduce((n, s) => n + s.sum, 0)

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('chart.daily_receipts')}</h3>
        {total > 0 && (
          <span className="tnum rounded-lg bg-[var(--color-surface-alt)] px-2.5 py-1 font-mono text-[12px] text-[var(--color-ink-secondary)]" title={formatMoneyFull(total)}>
            {t('chart.total')}: <b className="text-[var(--color-ink)]">{formatMoneyShort(total)}</b>
          </span>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="min-h-[290px] w-full flex-1" />
      ) : series.length === 0 ? (
        <EmptyState title={t('common.no_data_period')} />
      ) : (
        <div className="relative min-h-[290px] flex-1">
          <TrendChart
            data={series.map((s) => ({ label: formatDateShort(s.bucket), value: s.sum }))}
            seriesName={t('common.amount')}
            format={formatMoneyFull}
            height="fill"
          />
        </div>
      )}
    </Card>
  )
}
