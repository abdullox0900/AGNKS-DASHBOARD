import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { Hint } from '@/shared/ui/Menu'
import { useAnimatedValue } from '@/shared/lib/useAnimatedValue'
import { formatMoneyShort, formatMoneyFull } from '@/shared/lib/format'
import { useOverview } from '@/shared/api/hooks'
import type { Filter } from '@/shared/api/client'
import { useI18n } from '@/app/providers/I18nProvider'

const R = 80
const ARC = Math.PI * R

function Tile({ label, value, full, color }: { label: string; value: string; full?: string; color: string }) {
  return (
    <Hint label={full}>
      <div className="rounded-xl bg-[var(--color-surface-alt)] px-3.5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink-tertiary)]">{label}</p>
        <p className="tnum mt-1 text-[17px] font-bold leading-tight" style={{ color }}>
          {value}
        </p>
      </div>
    </Hint>
  )
}

/** "Bonus byudjeti" — how much of the issued bonus was spent, plus the balance and the average bonus per receipt. */
export function BonusBudget({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const { data, isLoading } = useOverview(filters)
  const ratio = data && data.bonus.issued > 0 ? Math.min(1, data.spend.sum / data.bonus.issued) : 0
  const shown = useAnimatedValue(ratio, !!data)
  const net = data ? data.bonus.issued - data.spend.sum : 0
  const avg = data && data.receipts.count > 0 ? Math.round(data.bonus.issued / data.receipts.count) : 0

  return (
    <Card className="flex h-full flex-col">
      <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('budget.title')}</h2>
      {isLoading || !data ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="mx-auto h-[110px] w-[200px]" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-5">
          <div className="mx-auto mt-3 w-full max-w-[250px]">
            <div className="relative">
              <svg viewBox="0 0 200 112" className="w-full">
                <defs>
                  <linearGradient id="budgetArc" x1="0" x2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" />
                    <stop offset="100%" stopColor="var(--chart-2)" />
                  </linearGradient>
                </defs>
                <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--color-border)" strokeWidth="14" strokeLinecap="round" />
                <path
                  d="M20 100 A80 80 0 0 1 180 100"
                  fill="none"
                  stroke="url(#budgetArc)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(ARC * shown, 0.01)} ${ARC}`}
                  style={{ transition: 'stroke-dasharray 900ms cubic-bezier(.22,1,.36,1)' }}
                />
              </svg>
              <p className="tnum absolute inset-x-0 bottom-[14%] text-center text-[32px] font-bold leading-none text-[var(--color-ink)]">{Math.round(ratio * 100)}%</p>
            </div>
            <p className="mt-2.5 text-center text-[12.5px] text-[var(--color-ink-tertiary)]">{t('budget.spent_of_issued')}</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Tile label={t('budget.issued_short')} value={formatMoneyShort(data.bonus.issued)} full={formatMoneyFull(data.bonus.issued)} color="var(--color-lime)" />
            <Tile label={t('budget.spent_short')} value={formatMoneyShort(data.spend.sum)} full={formatMoneyFull(data.spend.sum)} color="var(--color-ink)" />
            <Tile label={t('budget.net')} value={formatMoneyShort(net)} full={formatMoneyFull(net)} color="var(--color-primary)" />
            <Tile label={t('budget.avg_receipt')} value={formatMoneyShort(avg)} full={formatMoneyFull(avg)} color="var(--color-amber)" />
          </div>
        </div>
      )}
    </Card>
  )
}
