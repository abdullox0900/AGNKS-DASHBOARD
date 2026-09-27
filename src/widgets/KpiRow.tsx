import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { formatMoneyShort, formatMoneyFull, formatNumber } from '@/shared/lib/format'
import type { Filter } from '@/shared/api/client'
import { useOverview } from '@/shared/api/hooks'

function KpiCard({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex-1 px-5 py-4" title={title}>
      <p className="text-[12.5px] font-medium text-[var(--color-ink-secondary)]">{label}</p>
      <p className="tnum mt-1 text-[22px] font-bold text-[var(--color-ink)]">{value}</p>
    </div>
  )
}

export function KpiRow({ filters }: { filters: Filter }) {
  const { data, isLoading, error, mutate } = useOverview(filters)

  if (isLoading || !data) {
    return (
      <Card padded={false} className="grid grid-cols-2 divide-x divide-[var(--color-border)] md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-7 w-24" />
          </div>
        ))}
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="text-center">
        <p className="text-[13px] text-[var(--color-ink-secondary)]">KPI ma'lumotini yuklab bo'lmadi</p>
        <button onClick={() => mutate()} className="mt-1 text-[13px] font-semibold text-[var(--color-primary)]">
          Qayta urinish
        </button>
      </Card>
    )
  }

  return (
    <Card padded={false} className="grid grid-cols-2 divide-x divide-y divide-[var(--color-border)] md:grid-cols-4 md:divide-y-0">
      <KpiCard label="Cheklar" value={formatNumber(data.receipts.count)} />
      <KpiCard label="Cheklar summasi" value={formatMoneyShort(data.receipts.sum)} title={formatMoneyFull(data.receipts.sum)} />
      <KpiCard label="Faol mijozlar" value={formatNumber(data.activeClients)} />
      <KpiCard label="Tekshiruv kutilmoqda" value={formatNumber(data.attention.pendingReview)} />
    </Card>
  )
}

export function BonusRow({ filters }: { filters: Filter }) {
  const { data, isLoading } = useOverview(filters)

  if (isLoading || !data) {
    return (
      <Card padded={false} className="grid grid-cols-1 divide-y divide-[var(--color-border)] md:grid-cols-2 md:divide-x md:divide-y-0">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-7 w-28" />
          </div>
        ))}
      </Card>
    )
  }

  return (
    <Card padded={false} className="grid grid-cols-1 divide-y divide-[var(--color-border)] md:grid-cols-2 md:divide-x md:divide-y-0">
      <div className="p-5" title={formatMoneyFull(data.bonus.issued)}>
        <p className="text-[12.5px] font-medium text-[var(--color-ink-secondary)]">Berilgan bonus</p>
        <p className="tnum mt-1 text-[19px] font-bold text-[var(--color-amber)]">{formatMoneyShort(data.bonus.issued)}</p>
      </div>
      <div className="p-5" title={formatMoneyFull(data.spend.sum)}>
        <p className="text-[12.5px] font-medium text-[var(--color-ink-secondary)]">Yechilgan bonus</p>
        <p className="tnum mt-1 text-[19px] font-bold text-[var(--color-amber)]">{formatMoneyShort(data.spend.sum)}</p>
      </div>
    </Card>
  )
}
