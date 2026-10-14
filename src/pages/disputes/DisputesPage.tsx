import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Drawer } from '@/shared/ui/Drawer'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Chip } from '@/shared/ui/Chip'
import { Card } from '@/shared/ui/Card'
import { Avatar } from '@/shared/ui/Avatar'
import { Skeleton } from '@/shared/ui/Skeleton'
import { FeedbackChat } from '@/features/feedback/FeedbackChat'
import { KIND_LABEL, KIND_TONE } from '@/features/feedback/kinds'
import { TemplatesManager } from '@/features/feedback/TemplatesManager'
import { useMediaQuery } from '@/shared/lib/useMediaQuery'
import { MessagesSquare, Settings2 } from 'lucide-react'
import { useDisputes, useFeedback } from '@/shared/api/hooks'
import { apiResolveDispute } from '@/shared/api/client'
import { useToast } from '@/shared/ui/Toast'
import { formatDateShort, formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'
import type { DisputeRecord, DisputeStatus } from '@/entities/models'
import { usePermission } from '@/shared/lib/permissions'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const STATUS_LABEL: Record<DisputeStatus, DictKey> = { open: 'disputes.status.open', upheld: 'disputes.status.upheld', reversed: 'disputes.status.reversed', adjusted: 'disputes.status.adjusted' }
const STATUS_TONE: Record<DisputeStatus, 'neutral' | 'success' | 'warning'> = { open: 'warning', upheld: 'neutral', reversed: 'success', adjusted: 'success' }


export function DisputesPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<'transactions' | 'general'>('transactions')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5" style={{ width: 'fit-content' }}>
        {(['transactions', 'general'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn('rounded-md px-3 py-1.5 text-[13px] font-medium', tab === key ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)]')}
          >
            {key === 'transactions' ? t('disputes.tab_tx') : t('nav.feedback')}
          </button>
        ))}
      </div>

      {tab === 'transactions' ? <TransactionDisputesTab /> : <GeneralFeedbackTab />}
    </div>
  )
}

function TransactionDisputesTab() {
  const { t } = useI18n()
  const [statusFilter, setStatusFilter] = useState<'open' | undefined>('open')
  const { data, isLoading, error, mutate } = useDisputes(statusFilter)
  const [selected, setSelected] = useState<DisputeRecord | null>(null)

  const columns: DataTableColumn<DisputeRecord>[] = [
    { id: 'client', header: 'common.client', accessor: (r) => r.clientName, sticky: true },
    { id: 'type', header: 'disputes.operation', accessor: (r) => r.refType, cell: (r) => (r.refType === 'spend' ? t('disputes.op_spend') : t('disputes.op_earn')) },
    { id: 'amount', header: 'common.amount', accessor: (r) => r.actualAmount, numeric: true, cell: (r) => formatMoneyFull(r.actualAmount) },
    { id: 'claimed', header: 'disputes.claimed', accessor: (r) => r.claimedAmount ?? 0, numeric: true, cell: (r) => (r.claimedAmount !== null ? formatMoneyFull(r.claimedAmount) : '—') },
    { id: 'cashier', header: 'common.cashier', accessor: (r) => r.cashierName ?? '—' },
    { id: 'station', header: 'common.station', accessor: (r) => r.stationName },
    { id: 'date', header: 'common.date', accessor: (r) => r.createdAt, cell: (r) => formatDateTime(r.createdAt) },
    { id: 'status', header: 'common.status', accessor: (r) => r.status, cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(STATUS_LABEL[r.status])}</Badge> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Chip active={statusFilter === 'open'} onClick={() => setStatusFilter('open')}>
          {t('disputes.status.open')}
        </Chip>
        <Chip active={statusFilter === undefined} onClick={() => setStatusFilter(undefined)}>
          {t('common.all')}
        </Chip>
      </div>

      <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          error={error ? t('common.load_failed') : undefined}
          onRetry={() => mutate()}
          getRowId={(r) => r.id}
          onRowClick={(r) => setSelected(r)}
          emptyMessage={t('disputes.empty')}
        />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={t('disputes.detail_title')}>
        {selected && (
          <DisputeDetail
            dispute={selected}
            onResolved={() => {
              setSelected(null)
              mutate()
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

function GeneralFeedbackTab() {
  const { t } = useI18n()
  const wide = useMediaQuery('(min-width: 1024px)')
  const [statusFilter, setStatusFilter] = useState<'open' | undefined>('open')
  const { data, isLoading, error, mutate } = useFeedback(statusFilter)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const canEditTemplates = usePermission('feedback.templates')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Chip active={statusFilter === 'open'} onClick={() => setStatusFilter('open')}>
            {t('feedback.status.open')}
          </Chip>
          <Chip active={statusFilter === undefined} onClick={() => setStatusFilter(undefined)}>
            {t('common.all')}
          </Chip>
        </div>
        {canEditTemplates && (
          <Button variant="secondary" size="sm" onClick={() => setTemplatesOpen(true)}>
            <Settings2 size={14} /> {t('fbchat.manage_templates')}
          </Button>
        )}
      </div>

      <div className={cn('grid gap-4', wide && 'grid-cols-[minmax(320px,400px)_1fr]')} style={wide ? { height: 'calc(100vh - 215px)', minHeight: 420 } : undefined}>
        <Card padded={false} className="min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="p-6 text-center text-[13px] text-[var(--color-danger)]">{t('common.load_failed')}</p>
          ) : !data || data.length === 0 ? (
            <p className="p-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">{t('disputes.empty_feedback')}</p>
          ) : (
            <ul>
              {data.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => setSelectedId(f.id)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors',
                      selectedId === f.id ? 'bg-[var(--color-primary-soft)]' : 'hover:bg-[var(--color-surface-alt)]',
                    )}
                  >
                    <Avatar name={f.clientName} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn('truncate text-[13.5px] text-[var(--color-ink)]', f.unread ? 'font-bold' : 'font-medium')}>{f.clientName}</span>
                        <span className="shrink-0 text-[11px] text-[var(--color-ink-tertiary)]">{formatDateShort(f.lastActivityAt)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge tone={KIND_TONE[f.kind]}>{t(KIND_LABEL[f.kind])}</Badge>
                        {f.status === 'resolved' && <span className="text-[11px] text-[var(--color-success)]">{t('feedback.status.closed')}</span>}
                      </div>
                      <p className={cn('mt-1 line-clamp-2 break-words text-[12.5px]', f.unread ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-secondary)]')}>
                        {f.lastSender === 'staff' && <span className="text-[var(--color-primary)]">{t('fbchat.you')}: </span>}
                        {f.preview}
                      </p>
                    </div>
                    {f.unread && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-danger)]" aria-label={t('fbchat.new')} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {wide && (
          <Card padded={false} className="min-h-0 overflow-hidden">
            {selectedId ? (
              <FeedbackChat key={selectedId} id={selectedId} onChanged={() => mutate()} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--color-ink-tertiary)]">
                <MessagesSquare size={34} strokeWidth={1.5} />
                <p className="text-[13px]">{t('fbchat.select')}</p>
              </div>
            )}
          </Card>
        )}
      </div>

      {!wide && (
        <Drawer open={!!selectedId} onClose={() => setSelectedId(null)} title={t('nav.feedback')} width={460}>
          {selectedId && (
            <div className="-mx-5 -my-4" style={{ height: 'calc(100vh - 62px)' }}>
              <FeedbackChat key={selectedId} id={selectedId} onChanged={() => mutate()} />
            </div>
          )}
        </Drawer>
      )}

      <Drawer open={templatesOpen} onClose={() => setTemplatesOpen(false)} title={t('fbchat.manage_templates')} width={480}>
        {templatesOpen && <TemplatesManager />}
      </Drawer>
    </div>
  )
}

function DisputeDetail({ dispute, onResolved }: { dispute: DisputeRecord; onResolved: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const [note, setNote] = useState('')
  const [adjustAmount, setAdjustAmount] = useState(
    dispute.claimedAmount !== null ? String(Math.max(0, dispute.actualAmount - dispute.claimedAmount)) : '',
  )
  const [submitting, setSubmitting] = useState(false)
  const canDecide = usePermission('disputes.decide')

  async function resolve(resolution: 'upheld' | 'reversed' | 'adjusted') {
    if (!note) return
    setSubmitting(true)
    try {
      await apiResolveDispute(dispute.id, resolution, note, resolution === 'adjusted' ? Number(adjustAmount) : undefined)
      show(t('disputes.resolved_toast'))
      onResolved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-[13px]">
        <Row label={t('common.client')} value={dispute.clientName} />
        <Row label={t('common.station')} value={dispute.stationName} />
        <Row label={t('disputes.op_amount')} value={formatMoneyFull(dispute.actualAmount)} />
        <Row label={t('disputes.claimed')} value={dispute.claimedAmount !== null ? formatMoneyFull(dispute.claimedAmount) : '—'} />
        {dispute.cashierName && <Row label={t('common.cashier')} value={dispute.cashierName} />}
        <Row label={t('common.date')} value={formatDateTime(dispute.createdAt)} />
      </div>

      <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
        <p className="mb-1 text-[11px] text-[var(--color-ink-tertiary)]">{t('disputes.client_comment')}</p>
        <p className="text-[13px] text-[var(--color-ink)]">{dispute.comment}</p>
      </div>

      {dispute.status === 'open' && canDecide ? (
        <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
          <p className="text-[13px] font-semibold text-[var(--color-ink)]">{t('disputes.decision')}</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('common.note_required')}
            rows={2}
            className="w-full resize-none rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]"
          />
          {dispute.refType === 'spend' && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--color-ink-secondary)]">{t('disputes.diff_amount')}</span>
              <input
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value.replace(/\D/g, ''))}
                className="w-32 rounded-lg border border-[var(--color-border)] px-2 py-1 text-[13px]"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button variant="ghost" disabled={!note || submitting} onClick={() => resolve('upheld')}>
              {t('disputes.upheld_btn')}
            </Button>
            {dispute.refType === 'spend' && (
              <>
                <Button variant="secondary" disabled={!note || submitting} onClick={() => resolve('reversed')}>
                  {t('disputes.reverse_btn')}
                </Button>
                <Button variant="secondary" disabled={!note || submitting || !adjustAmount} onClick={() => resolve('adjusted')}>
                  {t('disputes.adjust_btn', { v: formatMoneyFull(Number(adjustAmount || 0)) })}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-[var(--color-border)] pt-4">
          <Badge tone={STATUS_TONE[dispute.status]}>{t(STATUS_LABEL[dispute.status])}</Badge>
          {dispute.resolutionNote && <p className="mt-2 text-[13px] text-[var(--color-ink-secondary)]">{dispute.resolutionNote}</p>}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--color-ink-tertiary)]">{label}</p>
      <p className="text-[13px] text-[var(--color-ink)]">{value}</p>
    </div>
  )
}
