import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { Hint } from '@/shared/ui/Menu'
import { Delta } from '@/shared/ui/Delta'
import { previousEqualPeriod } from '@/shared/lib/dates'
import { useMemo } from 'react'
import { formatMoneyShort, formatMoneyFull, formatNumber } from '@/shared/lib/format'
import type { Filter } from '@/shared/api/client'
import { useOverview } from '@/shared/api/hooks'
import { useI18n } from '@/app/providers/I18nProvider'

const CELLS = 'grid grid-cols-2 gap-px overflow-hidden bg-[var(--color-border)] md:grid-cols-3 xl:grid-cols-6'

function Cell({ label, value, color, full, delta }: { label: string; value: string; color: string; full?: string; delta?: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-surface)] px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink-tertiary)]">{label}</p>
      <Hint label={full}>
        <p className="tnum mt-1 w-fit text-[24px] font-bold" style={{ color }}>
          {value}
        </p>
      </Hint>
      <div className="mt-0.5 h-4">{delta}</div>
    </div>
  )
}

/** Six-cell KPI strip: receipts, turnover, bonus issued/spent, active clients, pending review. */
export function KpiStrip({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const { data, isLoading, error, mutate } = useOverview(filters)
  const prevRange = useMemo(() => previousEqualPeriod(filters.from, filters.to), [filters.from, filters.to])
  const { data: prev } = useOverview({ stationIds: filters.stationIds, ...prevRange })

  if (isLoading || !data) {
    return (
      <Card padded={false} className={CELLS}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[var(--color-surface)] px-4 py-3.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-24" />
            <div className="h-4" />
          </div>
        ))}
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="text-center">
        <p className="text-[13px] text-[var(--color-ink-secondary)]">{t('kpi.load_failed')}</p>
        <button onClick={() => mutate()} className="mt-1 text-[13px] font-semibold text-[var(--color-primary)]">
          {t('common.retry')}
        </button>
      </Card>
    )
  }

  return (
    <Card padded={false} className={CELLS}>
      <Cell label={t('kpi.receipts')} value={formatNumber(data.receipts.count)} color="var(--color-primary)" delta={<Delta now={data.receipts.count} before={prev?.receipts.count} />} />
      <Cell label={t('kpi.receipts_sum')} value={formatMoneyShort(data.receipts.sum)} color="var(--color-ink)" full={formatMoneyFull(data.receipts.sum)} delta={<Delta now={data.receipts.sum} before={prev?.receipts.sum} />} />
      <Cell label={t('kpi.bonus_issued')} value={formatMoneyShort(data.bonus.issued)} color="var(--color-lime)" full={formatMoneyFull(data.bonus.issued)} delta={<Delta now={data.bonus.issued} before={prev?.bonus.issued} />} />
      <Cell label={t('kpi.bonus_spent')} value={formatMoneyShort(data.spend.sum)} color="var(--color-ink)" full={formatMoneyFull(data.spend.sum)} delta={<Delta now={data.spend.sum} before={prev?.spend.sum} />} />
      <Cell label={t('kpi.active_clients')} value={formatNumber(data.activeClients)} color="var(--color-ink)" delta={<Delta now={data.activeClients} before={prev?.activeClients} />} />
      <Cell label={t('kpi.pending')} value={formatNumber(data.attention.pendingReview)} color="var(--color-amber)" />
    </Card>
  )
}
