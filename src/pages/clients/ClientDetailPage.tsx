import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useSWRInfinite from 'swr/infinite'
import { useSWRConfig } from 'swr'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Chip } from '@/shared/ui/Chip'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ErrorState } from '@/shared/ui/ErrorState'
import { Hint } from '@/shared/ui/Menu'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { useClientProfile } from '@/shared/api/hooks'
import { apiGetClientHistory, type ClientHistoryItem, type ClientHistoryKind } from '@/shared/api/client'
import { usePermission } from '@/shared/lib/permissions'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull, formatMoneyShort, formatNumber } from '@/shared/lib/format'
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
const STATUS_TONE: Record<ClientHistoryItem['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  applied: 'success',
  pending_review: 'warning',
  rejected: 'danger',
  reversed: 'neutral',
}
const KIND_TONE: Record<ClientHistoryKind, 'primary' | 'warning' | 'neutral'> = { receipt: 'primary', spend: 'warning', adjust: 'neutral' }

const CELLS = 'grid grid-cols-2 gap-px overflow-hidden bg-[var(--color-border)] md:grid-cols-3 xl:grid-cols-6'

function Stat({ label, value, sub, color, full }: { label: string; value: string; sub?: string; color: string; full?: string }) {
  return (
    <div className="bg-[var(--color-surface)] px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink-tertiary)]">{label}</p>
      <Hint label={full}>
        <p className="tnum mt-1 w-fit text-[24px] font-bold" style={{ color }}>
          {value}
        </p>
      </Hint>
      {sub && <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-tertiary)]">{sub}</p>}
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--color-border)] py-2.5 last:border-b-0">
      <span className="text-[12.5px] text-[var(--color-ink-tertiary)]">{label}</span>
      <span className="text-right text-[13px] font-medium text-[var(--color-ink)]">{children}</span>
    </div>
  )
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${formatMoneyFull(n)}`

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
    { id: 'date', header: 'common.date', accessor: (r) => r.createdAt, cell: (r) => formatDateTime(r.createdAt), sticky: true },
    { id: 'kind', header: 'common.type', accessor: (r) => r.kind, cell: (r) => <Badge tone={KIND_TONE[r.kind]}>{t(KIND_KEY[r.kind])}</Badge> },
    { id: 'station', header: 'common.station', accessor: (r) => r.stationName ?? '—' },
    { id: 'amount', header: 'cd.col_receipt_amount', accessor: (r) => r.amount, numeric: true, cell: (r) => (r.kind === 'receipt' ? formatMoneyFull(r.amount) : '—') },
    { id: 'rate', header: 'cd.col_rate', accessor: (r) => r.ratePercent ?? 0, numeric: true, cell: (r) => (r.ratePercent !== null ? `${r.ratePercent}%` : '—') },
    {
      id: 'bonus',
      header: 'cd.col_bonus',
      accessor: (r) => r.bonus,
      numeric: true,
      cell: (r) => (
        <span className={r.status === 'rejected' ? 'text-[var(--color-ink-tertiary)] line-through' : r.bonus < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-lime)]'}>
          {signed(r.bonus)}
        </span>
      ),
    },
    { id: 'status', header: 'common.status', accessor: (r) => r.status, cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(STATUS_KEY[r.status])}</Badge> },
    {
      id: 'details',
      header: 'cd.col_details',
      accessor: (r) => r.note ?? '',
      sortable: false,
      cell: (r) => {
        const parts = [
          r.kind === 'spend' && r.actorName ? `${t('common.cashier')}: ${r.actorName}` : null,
          r.kind === 'adjust' && r.actorName ? `${t('cd.by_admin')}: ${r.actorName}` : null,
          r.kind === 'receipt' && r.taxVerified ? t('cd.tax_verified') : null,
          r.note,
        ].filter(Boolean)
        return <span className="text-[var(--color-ink-secondary)]">{parts.join(' · ') || '—'}</span>
      },
    },
  ]

  function refreshAll() {
    void mutateProfile()
    void history.mutate()
    void globalMutate((key) => Array.isArray(key) && key[0] === '/admin/clients' && key.length === 2)
  }

  const back = (
    <Link to="/clients" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-ink-secondary)] transition-colors hover:text-[var(--color-primary)]">
      <ArrowLeft size={15} /> {t('nav.clients')}
    </Link>
  )

  if (isLoading) {
    return (
      <div className="space-y-5">
        {back}
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }
  if (error || !profile) {
    return (
      <div className="space-y-5">
        {back}
        <Card>
          <ErrorState message={t('clients.empty')} onRetry={() => mutateProfile()} />
        </Card>
      </div>
    )
  }

  const { user, card, stats } = profile

  return (
    <div className="space-y-5">
      {back}

      <header className="flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[18px] font-bold text-[var(--color-primary)]">
          {user.firstName.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1">
          <h1 className="text-[24px] font-bold leading-tight text-[var(--color-ink)]">{user.firstName}</h1>
          <p className="text-[13px] text-[var(--color-ink-tertiary)]">{formatPhone(user.phone) || '—'}</p>
        </div>
        <Badge tone={card.blocked ? 'danger' : 'success'}>{card.blocked ? t('common.blocked') : t('common.active')}</Badge>
      </header>

      <Card padded={false} className={CELLS}>
        <Stat label={t('clients.balance')} value={formatMoneyShort(card.balance)} full={formatMoneyFull(card.balance)} color="var(--color-lime)" />
        <Stat label={t('cd.pending')} value={formatMoneyShort(card.pending)} full={formatMoneyFull(card.pending)} color="var(--color-amber)" />
        <Stat
          label={t('cd.receipts_scanned')}
          value={formatNumber(stats.receiptsTotal)}
          sub={t('cd.receipts_breakdown', { applied: stats.receiptsApplied, pending: stats.receiptsPending, rejected: stats.receiptsRejected })}
          color="var(--color-primary)"
        />
        <Stat label={t('kpi.receipts_sum')} value={formatMoneyShort(stats.receiptsSum)} full={formatMoneyFull(stats.receiptsSum)} color="var(--color-ink)" />
        <Stat label={t('cd.bonus_earned')} value={formatMoneyShort(stats.bonusEarned)} full={formatMoneyFull(stats.bonusEarned)} color="var(--color-lime)" />
        <Stat
          label={t('kpi.bonus_spent')}
          value={formatMoneyShort(stats.spendSum)}
          full={formatMoneyFull(stats.spendSum)}
          sub={t('cd.spend_ops', { n: stats.spendCount })}
          color="var(--color-ink)"
        />
      </Card>

      <div className={canEdit ? 'grid gap-5 lg:grid-cols-[1.4fr_1fr]' : ''}>
        <Card>
          <h2 className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">{t('cd.info_title')}</h2>
          <div>
            <InfoRow label={t('clients.registered')}>{user.registeredAt ? formatDateTime(user.registeredAt) : '—'}</InfoRow>
            <InfoRow label={t('cd.account_created')}>{formatDateTime(user.createdAt)}</InfoRow>
            <InfoRow label={t('cd.last_activity')}>{card.lastActivityAt ? formatDateTime(card.lastActivityAt) : '—'}</InfoRow>
            <InfoRow label={t('cd.first_receipt')}>{stats.firstReceiptAt ? formatDateTime(stats.firstReceiptAt) : '—'}</InfoRow>
            <InfoRow label={t('cd.last_receipt')}>{stats.lastReceiptAt ? formatDateTime(stats.lastReceiptAt) : '—'}</InfoRow>
            <InfoRow label={t('cd.card_number')}>
              <span className="font-mono">{card.number}</span>
            </InfoRow>
            <InfoRow label={t('prefs.language')}>{user.lang === 'ru' ? t('lang.ru') : t('lang.uz')}</InfoRow>
            <InfoRow label={t('cd.telegram')}>
              <Badge tone={user.telegramLinked ? 'success' : 'neutral'}>{user.telegramLinked ? t('cd.linked') : t('cd.not_linked')}</Badge>
            </InfoRow>
            <InfoRow label={t('cd.marketing')}>
              <Badge tone={user.marketingOptIn ? 'success' : 'neutral'}>{user.marketingOptIn ? t('cd.on') : t('cd.off')}</Badge>
            </InfoRow>
            <InfoRow label={t('cd.feedback_count')}>{formatNumber(stats.feedbackCount)}</InfoRow>
            <InfoRow label={t('disputes.tab_tx')}>{formatNumber(stats.disputeCount)}</InfoRow>
          </div>
        </Card>

        {canEdit && (
          <Card>
            <h2 className="mb-3 text-[15px] font-semibold text-[var(--color-ink)]">{t('cd.manage_title')}</h2>
            <ClientActions key={`${user.id}-${user.firstName}`} id={user.id} name={user.firstName} blocked={card.blocked} onChanged={refreshAll} />
          </Card>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('cd.history_title')}</h2>
          <div className="flex flex-wrap gap-2">
            <Chip active={kind === undefined} onClick={() => setKind(undefined)}>
              {t('common.all')}
            </Chip>
            {(['receipt', 'spend', 'adjust'] as const).map((k) => (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
                {t(KIND_KEY[k])}
              </Chip>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items}
          loading={history.isLoading}
          error={history.error ? t('common.load_failed') : undefined}
          onRetry={() => history.mutate()}
          getRowId={(r) => `${r.kind}-${r.id}`}
          onRowClick={(r) => r.kind === 'receipt' && setReceiptId(r.id)}
          emptyMessage={t('cd.history_empty')}
          maxHeight={640}
        />

        {hasMore && (
          <div className="flex justify-center">
            <Button variant="ghost" loading={history.isValidating} onClick={() => history.setSize(history.size + 1)}>
              {t('cd.load_more')}
            </Button>
          </div>
        )}
      </section>

      <ReceiptDetailDrawer clientId={user.id} receiptId={receiptId} onClose={() => setReceiptId(null)} />
    </div>
  )
}
