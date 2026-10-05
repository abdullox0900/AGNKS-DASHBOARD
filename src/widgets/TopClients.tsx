import useSWR from 'swr'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { apiTopClients, type TopClient } from '@/shared/api/bonusReport'
import type { Filter } from '@/shared/api/client'
import { usePermission } from '@/shared/lib/permissions'
import { formatMoneyFull, formatMoneyShort, formatNumber } from '@/shared/lib/format'
import { formatPhone } from '@/shared/lib/phone'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

function List({ title, subtitle, rows, mode, loading }: { title: string; subtitle: string; rows: TopClient[]; mode: 'receipts' | 'balance'; loading: boolean }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const canOpen = usePermission('clients.detail')

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-1">
        <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{title}</h3>
        <p className="text-[12px] text-[var(--color-ink-tertiary)]">{subtitle}</p>
      </div>
      {loading ? (
        <div className="space-y-3 pt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={t('top.empty')} />
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {rows.map((r, i) => {
            const main = mode === 'receipts' ? t('top.receipts_n', { n: formatNumber(r.receiptsCount) }) : formatMoneyShort(r.balance)
            const sub = mode === 'receipts' ? `${formatMoneyShort(r.receiptsSum)} · ${t('top.balance')} ${formatMoneyShort(r.balance)}` : t('top.receipts_n', { n: formatNumber(r.receiptsCount) })
            return (
              <li key={r.userId}>
                <button
                  type="button"
                  disabled={!canOpen}
                  onClick={() => navigate(`/clients/${r.userId}`)}
                  className={cn('grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-left', canOpen && 'rounded-lg transition-colors hover:bg-[var(--color-surface-alt)]')}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[12px] font-bold',
                      i === 0 ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-ink-tertiary)]',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{r.name}</span>
                    <span className="block truncate font-mono text-[11.5px] text-[var(--color-ink-tertiary)]">{r.phone ? formatPhone(r.phone) : '—'}</span>
                  </span>
                  <span className="text-right">
                    <span className="tnum block text-[14px] font-bold text-[var(--color-ink)]" title={mode === 'balance' ? formatMoneyFull(r.balance) : undefined}>
                      {main}
                    </span>
                    <span className="tnum block text-[11.5px] text-[var(--color-ink-tertiary)]">{sub}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/** Five most active clients, two ways: receipts scanned in the selected period, and biggest bonus balance right now. */
export function TopClients({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const key = ['top-clients', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString()]
  const { data, isLoading } = useSWR(key, () => apiTopClients(filters), { keepPreviousData: true })

  return (
    <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))]">
      <List title={t('top.title_receipts')} subtitle={t('top.sub_receipts')} rows={data?.byReceipts ?? []} mode="receipts" loading={isLoading && !data} />
      <List title={t('top.title_balance')} subtitle={t('top.sub_balance')} rows={data?.byBalance ?? []} mode="balance" loading={isLoading && !data} />
    </div>
  )
}
