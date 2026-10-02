import { useState } from 'react'
import { Plus, Send, Info, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Drawer } from '@/shared/ui/Drawer'
import { useToast } from '@/shared/ui/Toast'
import { useBroadcasts } from '@/shared/api/hooks'
import { apiCancelBroadcast, apiCreateBroadcast, apiRemoveBroadcast } from '@/shared/api/client'
import { formatDateTime } from '@/shared/lib/dates'
import { SendTimePicker, resolveSendAt, type SendTimeMode } from '@/widgets/SendTimePicker'
import type { Broadcast, BroadcastStatus } from '@/entities/models'
import { usePermission } from '@/shared/lib/permissions'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const STATUS_LABEL: Record<BroadcastStatus, DictKey> = {
  scheduled: 'bc.status.scheduled',
  sending: 'bc.status.sending',
  sent: 'bc.status.sent',
  cancelled: 'bc.status.cancelled',
}
const STATUS_TONE: Record<BroadcastStatus, 'primary' | 'warning' | 'success' | 'danger'> = {
  scheduled: 'primary',
  sending: 'warning',
  sent: 'success',
  cancelled: 'danger',
}
const MAX_LEN = 3500

export function BroadcastsPage() {
  const { t } = useI18n()
  const { data, isLoading, error, mutate } = useBroadcasts()
  const [formOpen, setFormOpen] = useState(false)
  const [viewing, setViewing] = useState<Broadcast | null>(null)
  const [deleting, setDeleting] = useState<Broadcast | null>(null)
  const { show } = useToast()
  const canManage = usePermission('broadcasts.manage') // root_admin may read the list only

  async function cancel(b: Broadcast) {
    await apiCancelBroadcast(b.id)
    show(t('bc.cancelled_toast'))
    setViewing(null)
    mutate()
  }

  async function remove(b: Broadcast) {
    await apiRemoveBroadcast(b.id)
    show(t('bc.deleted_toast'))
    setDeleting(null)
    setViewing(null)
    mutate()
  }

  const allColumns: DataTableColumn<Broadcast>[] = [
    {
      id: 'text',
      header: 'bc.col_message',
      accessor: (r) => r.textUz,
      cell: (r) => <p className="max-w-[360px] truncate text-[13px] text-[var(--color-ink)]">{r.textUz.split('\n')[0]}</p>,
      sticky: true,
    },
    {
      id: 'kind',
      header: 'common.type',
      accessor: (r) => (r.promotionId ? 'promo' : 'manual'),
      cell: (r) => (r.promotionId ? <Badge tone="warning">{t('bc.kind_promo')}</Badge> : <Badge>{t('bc.kind_message')}</Badge>),
    },
    { id: 'sendAt', header: 'bc.send_at', accessor: (r) => r.sendAt, cell: (r) => formatDateTime(r.sendAt) },
    {
      id: 'status',
      header: 'common.status',
      accessor: (r) => r.status,
      cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(STATUS_LABEL[r.status])}</Badge>,
    },
    {
      id: 'telegram',
      header: 'Telegram',
      accessor: (r) => r.delivered,
      cell: (r) =>
        r.status === 'sent' ? (
          <span className="tnum text-[13px] text-[var(--color-ink-secondary)]">
            {r.delivered}/{r.recipientCount}
            {r.failed > 0 && <span className="text-[var(--color-danger)]"> · {t('bc.errors_n', { n: r.failed })}</span>}
          </span>
        ) : (
          <span className="text-[13px] text-[var(--color-ink-tertiary)]">—</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      accessor: () => '',
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          {r.status === 'scheduled' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                void cancel(r)
              }}
            >
              {t('common.cancel')}
            </Button>
          )}
          {r.status !== 'sending' && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={t('common.delete')}
              onClick={(e) => {
                e.stopPropagation()
                setDeleting(r)
              }}
              className="px-2 hover:text-[var(--color-danger)]"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const columns = canManage ? allColumns : allColumns.filter((c) => c.id !== 'actions')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-tertiary)]">
          <Info size={14} className="shrink-0" />
          {t('bc.info')}
        </p>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={15} /> {t('bc.new')}
          </Button>
        )}
      </div>

      <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          error={error ? t('common.load_failed') : undefined}
          onRetry={() => mutate()}
          getRowId={(r) => r.id}
          onRowClick={setViewing}
          emptyMessage={t('bc.empty')}
        />

      <Drawer open={formOpen} onClose={() => setFormOpen(false)} title={t('bc.form_title')}>
        <BroadcastForm
          onCreated={(scheduled) => {
            setFormOpen(false)
            show(scheduled ? t('bc.scheduled_toast') : t('bc.queued_toast'))
            mutate()
          }}
        />
      </Drawer>

      <Drawer open={!!viewing} onClose={() => setViewing(null)} title={t('bc.view_title')}>
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--color-ink-secondary)]">
              <Badge tone={STATUS_TONE[viewing.status]}>{t(STATUS_LABEL[viewing.status])}</Badge>
              <span>{formatDateTime(viewing.sendAt)}</span>
              {viewing.status === 'sent' && (
                <span>
                  · {t('bc.telegram')}: {viewing.delivered}/{viewing.recipientCount}
                </span>
              )}
            </div>
            <Preview label={t('bc.uz')} text={viewing.textUz} />
            {viewing.textRu && <Preview label={t('bc.ru')} text={viewing.textRu} />}
            {canManage && viewing.status === 'scheduled' && (
              <Button variant="ghost" className="w-full" onClick={() => cancel(viewing)}>
                {t('common.cancel')}
              </Button>
            )}
            {canManage && viewing.status !== 'sending' && (
              <Button variant="danger" className="w-full" onClick={() => setDeleting(viewing)}>
                <Trash2 size={15} /> {t('common.delete')}
              </Button>
            )}
          </div>
        )}
      </Drawer>

      <Drawer open={!!deleting} onClose={() => setDeleting(null)} title={t('bc.delete_title')}>
        {deleting && <DeleteBroadcast broadcast={deleting} onConfirm={() => remove(deleting)} />}
      </Drawer>
    </div>
  )
}

function DeleteBroadcast({ broadcast, onConfirm }: { broadcast: Broadcast; onConfirm: () => Promise<void> }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function run() {
    setBusy(true)
    setError(false)
    try {
      await onConfirm()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl bg-[var(--color-danger-soft)] p-3.5 text-[13px] text-[var(--color-ink)]">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
        <p>{t('bc.delete_confirm')}</p>
      </div>
      <Preview label={t('bc.uz')} text={broadcast.textUz} />
      {error && <p className="text-[13px] font-medium text-[var(--color-danger)]">{t('common.error_generic')}</p>}
      <Button variant="danger" className="w-full" loading={busy} onClick={run}>
        <Trash2 size={15} /> {t('common.delete')}
      </Button>
    </div>
  )
}

function Preview({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-[12px] font-medium text-[var(--color-ink-tertiary)]">{label}</p>
      <div className="whitespace-pre-line rounded-xl rounded-tl-sm bg-[var(--color-primary-soft)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--color-ink)]">
        {text}
      </div>
    </div>
  )
}

function BroadcastForm({ onCreated }: { onCreated: (scheduled: boolean) => void }) {
  const { t } = useI18n()
  const [textUz, setTextUz] = useState('')
  const [textRu, setTextRu] = useState('')
  const [mode, setMode] = useState<SendTimeMode>('now')
  const [customAt, setCustomAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = textUz.trim().length >= 2 && (mode !== 'custom' || !!customAt)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await apiCreateBroadcast({
        textUz: textUz.trim(),
        textRu: textRu.trim() || null,
        sendAt: resolveSendAt(mode, customAt),
      })
      onCreated(mode === 'custom')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('bc.f_text_uz')}</label>
        <textarea
          value={textUz}
          onChange={(e) => setTextUz(e.target.value.slice(0, MAX_LEN))}
          rows={5}
          placeholder={t('bc.ph_uz')}
          className="w-full resize-y rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]"
        />
        <p className="text-right text-[11px] text-[var(--color-ink-tertiary)]">{textUz.length}/{MAX_LEN}</p>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('bc.f_text_ru')}</label>
        <textarea
          value={textRu}
          onChange={(e) => setTextRu(e.target.value.slice(0, MAX_LEN))}
          rows={4}
          placeholder={t('bc.ph_ru')}
          className="w-full resize-y rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('bc.when')}</label>
        <SendTimePicker modes={['now', 'custom']} mode={mode} onModeChange={setMode} customAt={customAt} onCustomAtChange={setCustomAt} />
      </div>

      {textUz.trim() && <Preview label={t('bc.preview')} text={textUz} />}

      <Button type="submit" className="w-full" loading={submitting} disabled={!canSubmit}>
        <Send size={14} /> {mode === 'custom' ? t('bc.schedule_btn') : t('bc.send_btn')}
      </Button>
    </form>
  )
}
