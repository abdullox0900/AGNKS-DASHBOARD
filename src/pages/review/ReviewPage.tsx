import { useEffect, useState } from 'react'
import { useSWRConfig } from 'swr'
import { Check, ExternalLink, X } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { useReviewQueue } from '@/shared/api/hooks'
import { usePermission } from '@/shared/lib/permissions'
import { apiApproveReceipt, apiRejectReceipt } from '@/shared/api/client'
import { useToast } from '@/shared/ui/Toast'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull, formatNumber } from '@/shared/lib/format'
import { formatPhone } from '@/shared/lib/phone'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const REASON_LABELS: Record<string, DictKey> = {
  tax_unverified: 'review.reason.tax_unverified',
}

const REJECT_REASONS: DictKey[] = ['review.reject.wrong_amount', 'review.reject.fake', 'review.reject.other']

export function ReviewPage() {
  const { t } = useI18n()
  const { data: queue, isLoading, mutate } = useReviewQueue()
  const { mutate: globalMutate } = useSWRConfig()
  const { show } = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const canDecide = usePermission('review.decide') // root_admin may look, not decide

  useEffect(() => {
    if (queue && queue.length > 0 && !selectedId) setSelectedId(queue[0].id)
    if (queue && selectedId && !queue.find((r) => r.id === selectedId)) {
      setSelectedId(queue[0]?.id ?? null)
    }
  }, [queue, selectedId])

  const selected = queue?.find((r) => r.id === selectedId) ?? null
  const amountNum = manualAmount ? Number(manualAmount) : 0
  const bonus = selected && amountNum > 0 ? Math.floor((amountNum * selected.rateBps) / 10_000) : 0

  async function handleApprove() {
    if (!selected || !manualAmount || Number(manualAmount) <= 0) return
    await apiApproveReceipt(selected.id, undefined, manualAmount ? Number(manualAmount) : undefined)
    show(t('review.approved'))
    setManualAmount('')
    mutate()
    globalMutate('/admin/overview')
  }

  async function handleRejectConfirm(note: string) {
    if (!selected || !note) return
    await apiRejectReceipt(selected.id, note)
    show(t('review.rejected'))
    setRejecting(false)
    setRejectNote('')
    mutate()
    globalMutate('/admin/overview')
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!queue || queue.length === 0) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (rejecting) return
      const idx = queue.findIndex((r) => r.id === selectedId)
      if (canDecide && (e.key === 'a' || e.key === 'A')) void handleApprove()
      else if (canDecide && (e.key === 'r' || e.key === 'R')) setRejecting(true)
      else if (e.key === 'ArrowDown') setSelectedId(queue[Math.min(queue.length - 1, idx + 1)]?.id)
      else if (e.key === 'ArrowUp') setSelectedId(queue[Math.max(0, idx - 1)]?.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, selectedId, rejecting, canDecide])

  if (isLoading) {
    return (
      <div className="grid grid-cols-[360px_1fr] gap-4">
        <Skeleton className="h-[600px] w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (!queue || queue.length === 0) {
    return (
      <Card>
        <EmptyState title={t('review.empty')} />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      <Card padded={false} className="max-h-[calc(100vh-140px)] overflow-y-auto">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-[14px] font-semibold text-[var(--color-ink)]">{t('review.queue_title', { n: queue.length })}</h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {queue.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={cn(
                'flex w-full flex-col gap-0.5 px-4 py-3 text-left',
                r.id === selectedId ? 'bg-[var(--color-primary-soft)]' : 'hover:bg-[var(--color-surface-alt)]',
              )}
            >
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-ink)]">
                <span className={cn('h-1.5 w-1.5 rounded-full', r.id === selectedId ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-ink-tertiary)]')} />
                {r.clientName || t('common.client')} · {r.stationName}
              </span>
              <span className="tnum text-[13px] text-[var(--color-ink-secondary)]">
                {r.checkNumber ? `№ ${r.checkNumber} · ` : ''}
                {formatDateTime(r.receiptAt)}
              </span>
              <span className="text-[12px] text-[var(--color-amber)]">
                {r.reviewReasons.map((reason) => (REASON_LABELS[reason] ? t(REASON_LABELS[reason]) : reason)).join(', ')}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {selected && (
        <Card>
          <p className="mb-4 rounded-xl bg-[var(--color-warning-soft)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--color-ink)]">{t('review.explain')}</p>

          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">{t('review.sec_scanned')}</p>
          <div className="mb-5 grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-[var(--color-border)] p-4 text-[13px] sm:grid-cols-2">
            <Row label={t('review.f_client')} value={`${selected.clientName || '—'}${selected.clientPhone ? ` · ${formatPhone(selected.clientPhone)}` : ''}`} />
            <Row label={t('review.f_balance')} value={selected.clientBalance === undefined ? '—' : formatMoneyFull(selected.clientBalance)} />
            <Row label={t('common.station')} value={selected.stationName} />
            <Row label={t('review.f_terminal')} value={selected.terminalCode ?? '—'} mono />
            <Row label={t('review.f_check_no')} value={selected.checkNumber ? `№ ${selected.checkNumber}` : '—'} mono />
            <Row label={t('review.f_check_time')} value={formatDateTime(selected.receiptAt)} />
            <Row label={t('review.f_scanned_at')} value={selected.createdAt ? formatDateTime(selected.createdAt) : '—'} />
            <Row label={t('review.rate')} value={`${(selected.rateBps / 100).toFixed(1)}%`} />
          </div>

          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">{t('review.sec_amount')}</p>
          {selected.soliqLink && (
            <a
              href={selected.soliqLink}
              target="_blank"
              rel="noreferrer"
              className="mb-1.5 inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--color-primary)] px-4 text-[13.5px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-soft)]"
            >
              {t('review.open_soliq')} <ExternalLink size={15} />
            </a>
          )}
          <p className="mb-4 text-[12px] text-[var(--color-ink-tertiary)]">{t('review.open_hint')}</p>

          {canDecide && (<>
          <div className="mb-3">
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('review.amount_label')}</label>
            <input
              inputMode="numeric"
              value={manualAmount ? formatNumber(Number(manualAmount)) : ''}
              onChange={(e) => setManualAmount(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="0"
              className="tnum h-12 w-full max-w-[260px] rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[18px] font-semibold text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className={cn('mb-5 rounded-xl border px-4 py-3', bonus > 0 ? 'border-[var(--color-success)]/40 bg-[var(--color-success-soft)]' : 'border-dashed border-[var(--color-border-strong)]')}>
            {bonus > 0 ? (
              <>
                <p className="tnum text-[12.5px] text-[var(--color-ink-secondary)]">{t('review.calc', { amount: formatMoneyFull(amountNum), rate: (selected.rateBps / 100).toFixed(1) })}</p>
                <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-secondary)]">{t('review.you_give')}</p>
                <p className="tnum text-[24px] font-bold text-[var(--color-success)]">+{formatMoneyFull(bonus)}</p>
                {selected.clientBalance !== undefined && (
                  <p className="tnum mt-0.5 text-[12.5px] text-[var(--color-ink-secondary)]">
                    {t('review.balance_after', { before: formatMoneyFull(selected.clientBalance), after: formatMoneyFull(selected.clientBalance + bonus) })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">{t('review.calc_empty')}</p>
            )}
          </div>

          {!rejecting ? (
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => setRejecting(true)}>
                <X size={15} /> {t('review.reject')} <span className="ml-1 opacity-70">(R)</span>
              </Button>
              <Button onClick={handleApprove} disabled={bonus <= 0} title={bonus <= 0 ? t('review.need_amount') : undefined}>
                <Check size={15} /> {bonus > 0 ? t('review.approve_give', { bonus: formatMoneyFull(bonus) }) : t('review.approve')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-[var(--color-border)] p-3">
              <p className="text-[13px] font-medium text-[var(--color-ink)]">{t('review.reject_reason')}</p>
              <div className="flex flex-wrap gap-1.5">
                {REJECT_REASONS.map((key) => {
                  const reason = t(key)
                  return (
                  <button
                    key={key}
                    onClick={() => setRejectNote(reason)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[12px]',
                      rejectNote === reason ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-ink-secondary)]',
                    )}
                  >
                    {reason}
                  </button>
                  )
                })}
              </div>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={t('review.free_text')}
                rows={2}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]"
              />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="danger" size="sm" disabled={!rejectNote} onClick={() => handleRejectConfirm(rejectNote)}>
                  {t('review.confirm_reject')}
                </Button>
              </div>
            </div>
          )}
          </>)}
        </Card>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-[var(--color-ink-tertiary)]">{label}</p>
      <p className={cn('break-words text-[13px] text-[var(--color-ink)]', mono && 'font-mono')}>{value}</p>
    </div>
  )
}
