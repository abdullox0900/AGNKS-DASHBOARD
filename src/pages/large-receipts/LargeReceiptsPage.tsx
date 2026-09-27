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

/** Receipts at/above the large-amount threshold that nobody has looked at yet. */
export function LargeReceiptsPage() {
  const { data, isLoading, error, mutate } = useSWR('/admin/receipts/large', apiGetLargeReceipts)
  const { show } = useToast()

  async function ack(r: LargeReceipt) {
    await apiAckLargeReceipt(r.id)
    show('Ko\'rib chiqildi deb belgilandi')
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
  if (error) return <ErrorState message="Yuklab bo'lmadi" onRetry={() => mutate()} />

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">
        Summasi {data ? formatMoneyFull(data.threshold) : '…'} va undan ko'p bo'lgan cheklar (oxirgi 30 kun). «Ko'rib chiqildi»
        deb belgilangan chek bu ro'yxatdan va bosh sahifadagi ogohlantirishdan chiqadi.
      </p>

      {!data?.items.length ? (
        <Card>
          <EmptyState title="Ko'rib chiqilmagan katta chek yo'q" />
        </Card>
      ) : (
        data.items.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="tnum text-[22px] font-bold text-[var(--color-ink)]">{formatMoneyFull(r.amount)}</p>
                <p className="text-[12.5px] text-[var(--color-ink-secondary)]">
                  {r.stationName} · {formatDateTime(r.receiptAt)} · bonus {formatMoneyFull(r.bonus)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.taxSource === 'client' ? (
                  <Badge tone="warning">
                    <Smartphone size={12} className="mr-1" /> Telefon orqali
                  </Badge>
                ) : r.taxSource === 'server' ? (
                  <Badge tone="success">
                    <Server size={12} className="mr-1" /> Server tekshirgan
                  </Badge>
                ) : (
                  <Badge>Ma'lumot yo'q</Badge>
                )}
                <Button size="sm" onClick={() => ack(r)}>
                  <CheckCheck size={14} /> Ko'rib chiqildi
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
              <div>
                <p className="text-[11.5px] text-[var(--color-ink-tertiary)]">Mijoz</p>
                <p className="text-[var(--color-ink)]">
                  {r.clientName} {r.clientPhone ? `· ${formatPhone(r.clientPhone)}` : ''}
                </p>
              </div>
              <div>
                <p className="text-[11.5px] text-[var(--color-ink-tertiary)]">Sotuvchi (soliq.uz)</p>
                <p className="text-[var(--color-ink)]">
                  {r.companyName ?? '—'} {r.tin ? `· STIR ${r.tin}` : ''}
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
              soliq.uz'da ochish <ExternalLink size={12} />
            </a>
          </Card>
        ))
      )}
    </div>
  )
}
