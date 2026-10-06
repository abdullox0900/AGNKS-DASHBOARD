import useSWRInfinite from 'swr/infinite'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { apiReviewHistory, type ReviewedReceipt } from '@/shared/api/audit'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import { formatPhone } from '@/shared/lib/phone'
import { useI18n } from '@/app/providers/I18nProvider'

/** Receipts a reviewer already decided on — who approved / rejected what, and why. */
export function ReviewHistory() {
  const { t } = useI18n()
  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(
    (index, prev: { nextCursor: string | null } | null) => (prev && !prev.nextCursor ? null : ['review-history', index === 0 ? '' : prev?.nextCursor]),
    ([, cursor]) => apiReviewHistory((cursor as string) || undefined),
    { revalidateFirstPage: true },
  )
  const rows = data?.flatMap((p) => p.items) ?? []
  const hasMore = !!data && !!data[data.length - 1]?.nextCursor

  const columns: DataTableColumn<ReviewedReceipt>[] = [
    { id: 'when', header: 'review.hist_when', accessor: (r) => r.reviewedAt, cell: (r) => formatDateTime(r.reviewedAt), sticky: true },
    {
      id: 'decision',
      header: 'review.hist_decision',
      accessor: (r) => r.status,
      cell: (r) => <Badge tone={r.status === 'applied' ? 'success' : 'danger'}>{t(r.status === 'applied' ? 'review.hist_approved' : 'review.hist_rejected')}</Badge>,
    },
    {
      id: 'by',
      header: 'review.hist_by',
      accessor: (r) => r.reviewerName ?? '',
      cell: (r) => (
        <span>
          {r.reviewerName ?? '—'}
          {r.reviewerPhone ? <span className="ml-1.5 text-[var(--color-ink-tertiary)]">{formatPhone(r.reviewerPhone)}</span> : null}
        </span>
      ),
    },
    {
      id: 'client',
      header: 'common.client',
      accessor: (r) => r.clientName,
      cell: (r) => (
        <span>
          {r.clientName}
          {r.clientPhone ? <span className="ml-1.5 text-[var(--color-ink-tertiary)]">{formatPhone(r.clientPhone)}</span> : null}
        </span>
      ),
    },
    { id: 'station', header: 'common.station', accessor: (r) => r.stationName },
    { id: 'check', header: 'review.hist_check', accessor: (r) => r.receiptAt, cell: (r) => formatDateTime(r.receiptAt) },
    { id: 'amount', header: 'review.hist_amount', accessor: (r) => r.amount, numeric: true, cell: (r) => (r.status === 'applied' ? formatMoneyFull(r.amount) : '—') },
    {
      id: 'bonus',
      header: 'review.hist_bonus',
      accessor: (r) => r.bonus,
      numeric: true,
      cell: (r) => (r.status === 'applied' ? <span className="font-semibold text-[var(--color-success)]">+{formatMoneyFull(r.bonus)}</span> : '—'),
    },
    { id: 'note', header: 'review.hist_note', accessor: (r) => r.reviewNote ?? '', cell: (r) => <span className="text-[var(--color-ink-secondary)]">{r.reviewNote || '—'}</span> },
    {
      id: 'link',
      header: 'review.hist_soliq',
      accessor: (r) => r.soliqLink ?? '',
      cell: (r) =>
        r.soliqLink ? (
          <a href={r.soliqLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline">
            soliq.uz <ExternalLink size={13} />
          </a>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        error={error ? t('common.load_failed') : undefined}
        onRetry={() => mutate()}
        getRowId={(r) => r.id}
        emptyMessage={t('review.hist_empty')}
        maxHeight={640}
      />
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setSize(size + 1)} loading={isValidating}>
            {t('cd.load_more')}
          </Button>
        </div>
      )}
    </div>
  )
}
