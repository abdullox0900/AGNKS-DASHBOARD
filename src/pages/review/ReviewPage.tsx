import { useEffect, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Bot, Check, ExternalLink, X } from 'lucide-react'
import { NewBadge } from '@/shared/ui/NewBadge'
import { PageTitle } from '@/shared/ui/PageTitle'
import { ClientAvatar } from '@/shared/ui/ClientAvatar'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { useReviewQueue } from '@/shared/api/hooks'
import { usePermission } from '@/shared/lib/permissions'
import { apiApproveReceipt, apiAutoReviewSettings, apiRejectReceipt, apiSaveAutoReviewSettings } from '@/shared/api/client'
import { useToast } from '@/shared/ui/Toast'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull, formatNumber } from '@/shared/lib/format'
import { formatPhone } from '@/shared/lib/phone'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import { ReviewHistory } from './ReviewHistory'
import type { DictKey } from '@/shared/config/dictionaries'

const REASON_LABELS: Record<string, DictKey> = {
  tax_unverified: 'review.reason.tax_unverified',
}

const REJECT_REASONS: DictKey[] = ['review.reject.wrong_amount', 'review.reject.fake', 'review.reject.other']

function ReviewQueue() {
  const { t } = useI18n()
  const { data: queue, isLoading, mutate } = useReviewQueue()
  const { mutate: globalMutate } = useSWRConfig()
  const { show } = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const canDecide = usePermission('review.decide') // root_admin may look, not decide
  const canOpenClient = usePermission('clients.detail')

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

  const card = 'dt-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]'

  if (isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
        <Skeleton className="h-[600px] w-full rounded-2xl" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    )
  }

  if (!queue || queue.length === 0) {
    return (
      <div className={card}>
        <EmptyState title={t('review.empty')} />
      </div>
    )
  }

  const reasonText = (r: { reviewReasons: string[] }) => r.reviewReasons.map((reason) => (REASON_LABELS[reason] ? t(REASON_LABELS[reason]) : reason)).join(', ')

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
      <section className={cn(card, 'overflow-hidden lg:sticky lg:top-4')}>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-[17px] font-semibold text-[var(--color-ink)]">{t('review.queue')}</h2>
          <span className="font-mono text-[13px] text-[var(--color-ink-tertiary)]">{queue.length}</span>
        </div>
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto border-t border-[var(--color-border)]">
          {queue.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={cn(
                'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-b border-[var(--color-border)] px-5 py-3 text-left transition-colors last:border-0',
                r.id === selectedId ? 'bg-[var(--color-primary-soft)]' : 'hover:bg-[var(--color-surface-alt)]',
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <ClientAvatar name={r.clientName} src={r.clientPhotoUrl} size={26} />
                <span className="truncate text-[15px] font-semibold text-[var(--color-ink)]">{r.clientName || t('common.client')}</span>
              </span>
              <span className="text-right font-mono text-[13px] text-[var(--color-ink-tertiary)]">{r.checkNumber ? `№ ${r.checkNumber}` : ''}</span>
              <span className="truncate pl-[36px] text-[13px] text-[var(--color-ink-tertiary)]">{r.stationName}</span>
              <span className="text-right text-[13px] text-[var(--color-ink-tertiary)]">{formatDateTime(r.receiptAt)}</span>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <section className={cn(card, 'p-6')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
              <ClientAvatar name={selected.clientName} src={selected.clientPhotoUrl} size={52} />
              <div className="min-w-0">
                {selected.clientId && canOpenClient ? (
                  <Link to={`/clients/${selected.clientId}`} className="block truncate text-[24px] font-bold text-[var(--color-primary)] hover:underline">
                    {selected.clientName || t('common.client')}
                  </Link>
                ) : (
                  <h2 className="truncate text-[24px] font-bold text-[var(--color-primary)]">{selected.clientName || t('common.client')}</h2>
                )}
                {selected.clientPhone && <p className="mt-0.5 font-mono text-[14px] text-[var(--color-ink-tertiary)]">{formatPhone(selected.clientPhone)}</p>}
              </div>
            </div>
            {selected.reviewReasons.length > 0 && (
              <span className="flex items-center gap-2 text-[14px] font-medium text-[var(--color-danger)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" />
                {reasonText(selected)}
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
            <Field label={t('common.station')} value={selected.stationName} />
            <Field label={t('review.f_check')} value={selected.checkNumber ? `№ ${selected.checkNumber}` : '—'} />
            <Field label={t('review.f_check_time')} value={formatDateTime(selected.receiptAt)} />
            <Field label={t('review.f_terminal').replace(/ \(.*\)$/, '')} value={selected.terminalCode ?? '—'} />
            <Field label={t('review.f_balance')} value={selected.clientBalance === undefined ? '—' : formatMoneyFull(selected.clientBalance)} tone="text-[var(--color-success)] font-mono font-semibold" />
            <Field label={t('review.rate')} value={`${(selected.rateBps / 100).toFixed(1)}%`} />
            <Field label={t('review.f_scanned_at')} value={selected.createdAt ? formatDateTime(selected.createdAt) : '—'} />
          </div>

          <div className="my-6 h-px bg-[var(--color-border)]" />

          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[16px] font-semibold text-[var(--color-ink)]">{t('review.sum_title')}</h3>
            {selected.soliqLink && (
              <a href={selected.soliqLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--color-primary)] hover:underline">
                {t('review.open_soliq_short')} <ExternalLink size={14} />
              </a>
            )}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label className={cn('flex h-16 items-center gap-3 rounded-xl border bg-[var(--color-bg)] px-5 transition-colors focus-within:border-[var(--color-primary)]', 'border-[var(--color-border)]')}>
              <input
                inputMode="numeric"
                disabled={!canDecide}
                value={manualAmount ? formatNumber(Number(manualAmount)) : ''}
                onChange={(e) => setManualAmount(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder={t('review.sum_title')}
                className="min-w-0 flex-1 bg-transparent font-mono text-[24px] font-bold text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)]/60 disabled:cursor-not-allowed"
              />
              <span className="text-[14px] text-[var(--color-ink-tertiary)]">so‘m</span>
            </label>
            <div className={cn('flex min-h-16 flex-col justify-center rounded-xl border px-5 py-2', bonus > 0 ? 'border-[var(--color-success)]/40 bg-[var(--color-success-soft)]' : 'border-dashed border-[var(--color-border-strong)]')}>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-tertiary)]">{t('review.client_bonus')}</p>
              <p className="font-mono text-[20px] font-bold text-[var(--color-success)]">{bonus > 0 ? `+${formatMoneyFull(bonus)}` : '—'}</p>
              {bonus > 0 && selected.clientBalance !== undefined && <p className="text-[12px] text-[var(--color-ink-secondary)]">{t('review.after_balance', { v: formatMoneyFull(selected.clientBalance + bonus) })}</p>}
            </div>
          </div>

          {canDecide && (
            <>
              {!rejecting ? (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="hidden text-[12px] text-[var(--color-ink-tertiary)] md:block">{t('review.keys')}</p>
                  <div className="ml-auto flex gap-3">
                    <Button variant="secondary" className="h-11 px-6 text-[14.5px]" onClick={() => setRejecting(true)}>
                      {t('review.reject')}
                    </Button>
                    <Button className="h-11 px-6 text-[14.5px]" onClick={handleApprove} disabled={bonus <= 0} title={bonus <= 0 ? t('review.need_amount') : undefined}>
                      <Check size={16} /> {t('review.approve')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-3 rounded-xl border border-[var(--color-border)] p-4">
                  <p className="text-[14px] font-medium text-[var(--color-ink)]">{t('review.reject_reason')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {REJECT_REASONS.map((key) => {
                      const reason = t(key)
                      return (
                        <button
                          key={key}
                          onClick={() => setRejectNote(reason)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-[13px]',
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
                    className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-transparent px-3 py-2 text-[13.5px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setRejecting(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button variant="danger" disabled={!rejectNote} onClick={() => handleRejectConfirm(rejectNote)}>
                      <X size={15} /> {t('review.confirm_reject')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}

function Field({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-tertiary)]">{label}</p>
      <p className={cn('mt-1 break-words text-[15px] font-medium text-[var(--color-ink)]', tone)}>{value}</p>
    </div>
  )
}

const AUTO_DELAYS = [5, 10, 30, 60]

/** "Avto-tekshiruv": the program re-checks receipts soliq.uz couldn't confirm and credits the bonus itself. */
export function AutoReviewCard() {
  const { t } = useI18n()
  const { show } = useToast()
  const { mutate: globalMutate } = useSWRConfig()
  const canEdit = usePermission('review.auto')
  const { data, mutate } = useSWR('/admin/review/auto', apiAutoReviewSettings)
  const [busy, setBusy] = useState(false)

  async function save(patch: { enabled?: boolean; delayMin?: number }) {
    setBusy(true)
    try {
      await apiSaveAutoReviewSettings(patch)
      await mutate()
      void globalMutate('/admin/overview')
      show(t('review.auto_saved'))
    } catch {
      show(t('common.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  // one slim line: the switch is touched once in a blue moon, so it must not take room from the queue
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2"
      title={data?.enabled ? t('review.auto_on_hint', { n: data.delayMin }) : t('review.auto_off_hint')}
    >
      <button
        type="button"
        role="switch"
        aria-checked={!!data?.enabled}
        aria-label={t('review.auto_title')}
        disabled={!canEdit || !data || busy}
        onClick={() => data && void save({ enabled: !data.enabled })}
        className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50', data?.enabled ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border-strong)]')}
      >
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', data?.enabled ? 'left-[18px]' : 'left-0.5')} />
      </button>
      <p className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[var(--color-ink)]">
        <Bot size={15} className="text-[var(--color-primary)]" /> {t('review.auto_title')} <NewBadge since="2026-10-17" />
      </p>
      <p className="hidden min-w-0 flex-1 truncate text-[12px] text-[var(--color-ink-tertiary)] sm:block">
        {data?.enabled ? t('review.auto_on_short', { n: data.delayMin }) : t('review.auto_off_short')}
      </p>
      {data?.enabled && (
        <select
          value={data.delayMin}
          disabled={!canEdit || busy}
          onChange={(e) => void save({ delayMin: Number(e.target.value) })}
          aria-label={t('review.auto_delay')}
          className="ml-auto h-7 shrink-0 rounded-md border border-[var(--color-border)] bg-transparent px-1.5 text-[12px] text-[var(--color-ink-secondary)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60 sm:ml-0"
        >
          {AUTO_DELAYS.map((n) => (
            <option key={n} value={n}>
              {t('review.auto_min', { n })}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

/** Tekshiruv: the open queue plus the history of everything a reviewer already decided. */
export function ReviewPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<'queue' | 'history'>('queue')
  return (
    <div>
      <PageTitle
        title={t('nav.review')}
        sub={t('review.subtitle')}
        right={
          <div className="inline-flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            {(['queue', 'history'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn('rounded-lg px-4 py-1.5 text-[13.5px] font-medium', tab === key ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]')}
              >
                {t(key === 'queue' ? 'review.tab_queue' : 'review.tab_history')}
              </button>
            ))}
          </div>
        }
      />
      {tab === 'queue' ? <ReviewQueue /> : <ReviewHistory />}
    </div>
  )
}
