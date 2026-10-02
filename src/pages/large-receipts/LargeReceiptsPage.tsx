import useSWR from 'swr'
import { CheckCheck, ExternalLink, Smartphone, Server } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ErrorState } from '@/shared/ui/ErrorState'
import { EmptyState } from '@/shared/ui/EmptyState'
import { useToast } from '@/shared/ui/Toast'
import { apiAckLargeReceipt, apiGetLargeReceipts, type LargeReceipt } from '@/shared/api/client'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import { formatPhone } from '@/shared/lib/phone'
import { useI18n } from '@/app/providers/I18nProvider'

/** Receipts at/above the large-amount threshold that nobody has looked at yet. */
export function LargeReceiptsPage() {
  const { t } = useI18n()
  const { data, isLoading, error, mutate } = useSWR('/admin/receipts/large', apiGetLargeReceipts)
  const { show } = useToast()

  async function ack(r: LargeReceipt) {
    await apiAckLargeReceipt(r.id)
    show(t('large.acked'))
    mutate()
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (error) return <ErrorState message={t('common.load_failed')} onRetry={() => mutate()} />

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">
        {t('large.info', { v: data ? formatMoneyFull(data.threshold) : '…' })}
      </p>

      {!data?.items.length ? (
        <Card>
          <EmptyState title={t('large.empty')} />
        </Card>
      ) : (
        data.items.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="tnum text-[22px] font-bold text-[var(--color-ink)]">{formatMoneyFull(r.amount)}</p>
                <p className="text-[12.5px] text-[var(--color-ink-secondary)]">
                  {r.stationName} · {formatDateTime(r.receiptAt)} · {t('large.bonus')} {formatMoneyFull(r.bonus)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.taxSource === 'client' ? (
                  <Badge tone="warning">
                    <Smartphone size={12} className="mr-1" /> {t('large.via_phone')}
                  </Badge>
                ) : r.taxSource === 'server' ? (
                  <Badge tone="success">
                    <Server size={12} className="mr-1" /> {t('large.server_checked')}
                  </Badge>
                ) : (
                  <Badge>{t('large.no_info')}</Badge>
                )}
                <Button size="sm" onClick={() => ack(r)}>
                  <CheckCheck size={14} /> {t('large.reviewed_btn')}
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
              <div>
                <p className="text-[11.5px] text-[var(--color-ink-tertiary)]">{t('common.client')}</p>
                <p className="text-[var(--color-ink)]">
                  {r.clientName} {r.clientPhone ? `· ${formatPhone(r.clientPhone)}` : ''}
                </p>
              </div>
              <div>
                <p className="text-[11.5px] text-[var(--color-ink-tertiary)]">{t('large.seller')}</p>
                <p className="text-[var(--color-ink)]">
                  {r.companyName ?? '—'} {r.tin ? `· ${t('large.tin')} ${r.tin}` : ''}
                </p>
              </div>
            </div>

            {r.items.length > 0 && (
              <div className="mt-3 rounded-lg border border-[var(--color-border)]">
                {r.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2 text-[12.5px] last:border-b-0">
                    <span className="text-[var(--color-ink)]">{it.name}</span>
                    <span className="tnum shrink-0 text-[var(--color-ink-secondary)]">
                      {it.quantity} {it.unit ?? ''} · {formatMoneyFull(it.price)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <a
              href={r.soliqUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-primary)]"
            >
              {t('large.open_soliq')} <ExternalLink size={12} />
            </a>
          </Card>
        ))
      )}
    </div>
  )
}
