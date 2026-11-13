import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useSWRInfinite from 'swr/infinite'
import { useSWRConfig } from 'swr'
import { Check, ChevronLeft } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ErrorState } from '@/shared/ui/ErrorState'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { ClientAvatar } from '@/shared/ui/ClientAvatar'
import { StatStrip } from '@/shared/ui/StatStrip'
import { useClientProfile } from '@/shared/api/hooks'
import { apiGetClientHistory, type ClientHistoryItem, type ClientHistoryKind } from '@/shared/api/client'
import { usePermission } from '@/shared/lib/permissions'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyCompact, formatNumber } from '@/shared/lib/format'
import { formatPhone } from '@/shared/lib/phone'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'
import { ClientActions } from './ClientActions'
import { ReceiptDetailDrawer } from './ReceiptDetailDrawer'

const KIND_KEY: Record<ClientHistoryKind, DictKey> = { receipt: 'cd.kind.receipt', spend: 'cd.kind.spend', adjust: 'cd.kind.adjust' }
const STATUS_KEY: Record<ClientHistoryItem['status'], DictKey> = {
  applied: 'cd.st.applied',
  pending_review: 'cd.st.pending_review',
  rejected: 'cd.st.rejected',
  reversed: 'cd.st.reversed',
}

const card = 'dt-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]'

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--color-border)] py-3 last:border-b-0">
      <span className="text-[14px] text-[var(--color-ink-tertiary)]">{label}</span>
      <span className="text-right text-[14px] font-medium text-[var(--color-ink)]">{children}</span>
    </div>
  )
}

export function ClientDetailPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const canEdit = usePermission('clients.edit')
  const { mutate: globalMutate } = useSWRConfig()
  const { data: profile, isLoading, error, mutate: mutateProfile } = useClientProfile(id)
  const [kind, setKind] = useState<ClientHistoryKind | undefined>(undefined)
  const [receiptId, setReceiptId] = useState<string | null>(null)

  const history = useSWRInfinite(
    (_index, prev: { nextCursor: string | null } | null) =>
      id && !(prev && !prev.nextCursor) ? ['/admin/clients', id, 'history', kind ?? 'all', prev?.nextCursor ?? ''] : null,
    (key) => apiGetClientHistory(id!, { cursor: (key[4] as string) || undefined, type: kind }),
    { revalidateFirstPage: true },
  )
  const items = useMemo(() => history.data?.flatMap((page) => page.items) ?? [], [history.data])
  const hasMore = !!history.data?.[history.data.length - 1]?.nextCursor

  const columns: DataTableColumn<ClientHistoryItem>[] = [
    { id: 'date', header: 'common.date', accessor: (r) => r.createdAt, cell: (r) => <span className="font-mono text-[13.5px] text-[var(--color-ink-secondary)]">{formatDateTime(r.createdAt)}</span> },
    { id: 'station', header: 'common.station', accessor: (r) => r.stationName ?? '—', cell: (r) => <span className="font-medium">{r.stationName ?? (r.kind === 'adjust' ? t('cd.kind.adjust') : '—')}</span> },
    { id: 'amount', header: 'cd.c_amount', accessor: (r) => r.amount, numeric: true, cell: (r) => (r.kind === 'receipt' ? formatNumber(r.amount) : '—') },
    {
      id: 'bonus',
      header: 'cd.c_bonus',
      accessor: (r) => r.bonus,
      numeric: true,
      cell: (r) => (
        <span className={r.status === 'rejected' ? 'text-[var(--color-ink-tertiary)] line-through' : r.bonus < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}>
          {r.bonus > 0 ? '+' : r.bonus < 0 ? '−' : ''}
          {formatNumber(Math.abs(r.bonus))}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'common.status',
      accessor: (r) => r.status,
      sortable: false,
      cell: (r) => {
        const who = r.kind === 'spend' && r.actorName ? `${t('common.cashier')}: ${r.actorName}` : r.kind === 'adjust' && r.actorName ? `${t('cd.by_admin')}: ${r.actorName}` : r.note ?? undefined
        if (r.kind === 'receipt' && r.status === 'applied' && r.taxVerified)
          return (
            <span title={who} className="inline-flex items-center gap-1.5 text-[13.5px] text-[var(--color-success)]">
              <Check size={15} /> {t('cd.tax_verified')}
            </span>
          )
        const tone = r.status === 'applied' ? 'text-[var(--color-success)]' : r.status === 'pending_review' ? 'text-[var(--color-amber)]' : r.status === 'rejected' ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink-tertiary)]'
        return (
          <span title={who} className={`text-[13.5px] ${tone}`}>
            {r.kind !== 'receipt' ? `${t(KIND_KEY[r.kind])} · ` : ''}
            {t(STATUS_KEY[r.status])}
          </span>
        )
      },
    },
  ]

  function refreshAll() {
    void mutateProfile()
    void history.mutate()
    void globalMutate((key) => Array.isArray(key) && key[0] === '/admin/clients' && key.length === 2)
  }

  const back = (
    <Link to="/clients" aria-label={t('cd.back')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-ink-secondary)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-ink)]">
      <ChevronLeft size={18} />
    </Link>
  )

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          {back}
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }
  if (error || !profile) {
    return (
      <div className="space-y-5">
        {back}
        <div className={card}>
          <ErrorState message={t('clients.empty')} onRetry={() => mutateProfile()} />
        </div>
      </div>
    )
  }

  const { user, card: c, stats } = profile
  const som = t('cd.som')

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-4">
        {back}
        <ClientAvatar name={user.firstName} src={user.photoUrl} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-3 text-[28px] font-bold leading-tight text-[var(--color-ink)]">
            {user.firstName}
            <span className={`flex items-center gap-1.5 text-[14px] font-medium ${c.blocked ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
              <span className={`h-2 w-2 rounded-full ${c.blocked ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-success)]'}`} />
              {c.blocked ? t('common.blocked') : t('common.active')}
            </span>
          </h1>
          <p className="mt-0.5 font-mono text-[14px] text-[var(--color-ink-tertiary)]">
            {formatPhone(user.phone) || '—'} · {c.number}
          </p>
        </div>
      </header>
      {c.blocked && c.blockedReason && <p className="rounded-xl bg-[var(--color-danger-soft)] px-4 py-2.5 text-[13.5px] text-[var(--color-ink)]">{t('clients.blocked_reason_line', { reason: c.blockedReason })}</p>}

      <StatStrip
        items={[
          { key: 'bal', label: t('cd.s_balance'), value: formatNumber(c.balance), hint: som },
          { key: 'pend', label: t('cd.s_pending'), value: formatNumber(c.pending), hint: som },
          {
            key: 'rc',
            label: t('cd.s_receipts'),
            value: formatNumber(stats.receiptsTotal),
            hint: stats.receiptsPending + stats.receiptsRejected === 0 ? t('cd.s_receipts_all_ok') : t('cd.receipts_breakdown', { applied: stats.receiptsApplied, pending: stats.receiptsPending, rejected: stats.receiptsRejected }),
          },
          { key: 'sum', label: t('cd.s_sum'), value: formatMoneyCompact(stats.receiptsSum), hint: som },
          { key: 'earn', label: t('cd.s_earned'), value: formatNumber(stats.bonusEarned), hint: som },
          { key: 'spent', label: t('cd.s_spent'), value: formatNumber(stats.spendSum), hint: t('cd.spend_ops', { n: stats.spendCount }) },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <DataTable
          columns={columns}
          data={items}
          loading={history.isLoading}
          error={history.error ? t('common.load_failed') : undefined}
          onRetry={() => history.mutate()}
          getRowId={(r) => `${r.kind}-${r.id}`}
          onRowClick={(r) => r.kind === 'receipt' && setReceiptId(r.id)}
          emptyMessage={t('cd.history_empty')}
          index={false}
          title={
            <span className="text-[17px] font-semibold text-[var(--color-ink)]">
              {t('cd.history_title')} <span className="font-mono text-[13px] font-normal text-[var(--color-ink-tertiary)]">{items.length}</span>
            </span>
          }
          actions={
            <div className="inline-flex gap-1 rounded-xl border border-[var(--color-border)] p-1">
              {([undefined, 'receipt', 'spend', 'adjust'] as const).map((k) => (
                <button
                  key={k ?? 'all'}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-lg px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${kind === k ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]'}`}
                >
                  {k ? t(KIND_KEY[k]) : t('common.all')}
                </button>
              ))}
            </div>
          }
          bottom={
            hasMore ? (
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" loading={history.isValidating} onClick={() => history.setSize(history.size + 1)}>
                  {t('cd.load_more')}
                </Button>
              </div>
            ) : undefined
          }
        />

        <div className="space-y-5">
          <section className={`${card} px-6 py-5`}>
            <h2 className="mb-1 text-[17px] font-semibold text-[var(--color-ink)]">{t('cd.info_title')}</h2>
            <InfoRow label={t('clients.registered')}>{user.registeredAt ? formatDateTime(user.registeredAt) : '—'}</InfoRow>
            <InfoRow label={t('cd.last_activity')}>{c.lastActivityAt ? formatDateTime(c.lastActivityAt) : '—'}</InfoRow>
            <InfoRow label={t('cd.first_receipt')}>{stats.firstReceiptAt ? formatDateTime(stats.firstReceiptAt) : '—'}</InfoRow>
            <InfoRow label={t('cd.last_receipt')}>{stats.lastReceiptAt ? formatDateTime(stats.lastReceiptAt) : '—'}</InfoRow>
            <InfoRow label={t('cd.lang')}>{user.lang === 'ru' ? t('lang.ru') : t('lang.uz')}</InfoRow>
            <InfoRow label={t('cd.telegram')}>{user.telegramLinked ? t('cd.linked') : t('cd.not_linked')}</InfoRow>
            <InfoRow label={t('cd.marketing')}>{user.marketingOptIn ? t('cd.on') : t('cd.off')}</InfoRow>
            <InfoRow label={t('cd.complaints')}>{formatNumber(stats.feedbackCount + stats.disputeCount)}</InfoRow>
          </section>

          {canEdit && (
            <section className={`${card} px-6 py-5`}>
              <h2 className="mb-4 text-[17px] font-semibold text-[var(--color-ink)]">{t('cd.manage_title')}</h2>
              <ClientActions key={`${user.id}-${user.firstName}-${c.blocked}`} id={user.id} name={user.firstName} blocked={c.blocked} blockedReason={c.blockedReason} onChanged={refreshAll} />
            </section>
          )}
        </div>
      </div>

      <ReceiptDetailDrawer clientId={user.id} receiptId={receiptId} onClose={() => setReceiptId(null)} />
    </div>
  )
}
