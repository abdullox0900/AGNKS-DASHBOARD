import { useState } from 'react'
import { Plus, Send, Info } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Drawer } from '@/shared/ui/Drawer'
import { useToast } from '@/shared/ui/Toast'
import { useBroadcasts } from '@/shared/api/hooks'
import { apiCancelBroadcast, apiCreateBroadcast } from '@/shared/api/client'
import { formatDateTime } from '@/shared/lib/dates'
import { SendTimePicker, resolveSendAt, type SendTimeMode } from '@/widgets/SendTimePicker'
import type { Broadcast, BroadcastStatus } from '@/entities/models'

const STATUS_LABEL: Record<BroadcastStatus, string> = {
  scheduled: 'Rejada',
  sending: 'Yuborilmoqda',
  sent: 'Yuborildi',
  cancelled: 'Bekor qilingan',
}
const STATUS_TONE: Record<BroadcastStatus, 'primary' | 'warning' | 'success' | 'danger'> = {
  scheduled: 'primary',
  sending: 'warning',
  sent: 'success',
  cancelled: 'danger',
}
const MAX_LEN = 3500

export function BroadcastsPage() {
  const { data, isLoading, error, mutate } = useBroadcasts()
  const [formOpen, setFormOpen] = useState(false)
  const [viewing, setViewing] = useState<Broadcast | null>(null)
  const { show } = useToast()

  async function cancel(b: Broadcast) {
    await apiCancelBroadcast(b.id)
    show('Xabar bekor qilindi')
    setViewing(null)
    mutate()
  }

  const columns: DataTableColumn<Broadcast>[] = [
    {
      id: 'text',
      header: 'Xabar',
      accessor: (r) => r.textUz,
      cell: (r) => <p className="max-w-[360px] truncate text-[13px] text-[var(--color-ink)]">{r.textUz.split('\n')[0]}</p>,
      sticky: true,
    },
    {
      id: 'kind',
      header: 'Turi',
      accessor: (r) => (r.promotionId ? 'promo' : 'manual'),
      cell: (r) => (r.promotionId ? <Badge tone="warning">Aksiya</Badge> : <Badge>Xabar</Badge>),
    },
    { id: 'sendAt', header: 'Yuborish vaqti', accessor: (r) => r.sendAt, cell: (r) => formatDateTime(r.sendAt) },
    {
      id: 'status',
      header: 'Holat',
      accessor: (r) => r.status,
      cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>,
    },
    {
      id: 'telegram',
      header: 'Telegram',
      accessor: (r) => r.delivered,
      cell: (r) =>
        r.status === 'sent' ? (
          <span className="tnum text-[13px] text-[var(--color-ink-secondary)]">
            {r.delivered}/{r.recipientCount}
            {r.failed > 0 && <span className="text-[var(--color-danger)]"> · {r.failed} xato</span>}
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
      cell: (r) =>
        r.status === 'scheduled' ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                void cancel(r)
              }}
            >
              Bekor qilish
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-tertiary)]">
          <Info size={14} className="shrink-0" />
          Telegram bot orqali faqat «Aksiya xabarlari»ni yoqqan mijozlarga boradi. Ilovadagi «Xabarlar» bo'limida esa hamma ko'radi.
        </p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={15} /> Yangi xabar
        </Button>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          error={error ? "Yuklab bo'lmadi" : undefined}
          onRetry={() => mutate()}
          getRowId={(r) => r.id}
          onRowClick={setViewing}
          emptyMessage="Hali xabar yuborilmagan"
        />
      </Card>

      <Drawer open={formOpen} onClose={() => setFormOpen(false)} title="Mijozlarga xabar">
        <BroadcastForm
          onCreated={(scheduled) => {
            setFormOpen(false)
            show(scheduled ? 'Xabar rejalashtirildi' : "Xabar yuborishga navbatga qo'yildi")
            mutate()
          }}
        />
      </Drawer>

      <Drawer open={!!viewing} onClose={() => setViewing(null)} title="Xabar">
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--color-ink-secondary)]">
              <Badge tone={STATUS_TONE[viewing.status]}>{STATUS_LABEL[viewing.status]}</Badge>
              <span>{formatDateTime(viewing.sendAt)}</span>
              {viewing.status === 'sent' && (
                <span>
                  · Telegram: {viewing.delivered}/{viewing.recipientCount}
                </span>
              )}
            </div>
            <Preview label="O'zbekcha" text={viewing.textUz} />
            {viewing.textRu && <Preview label="Ruscha" text={viewing.textRu} />}
            {viewing.status === 'scheduled' && (
              <Button variant="danger" className="w-full" onClick={() => cancel(viewing)}>
                Bekor qilish
              </Button>
            )}
          </div>
        )}
      </Drawer>
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
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Matn (o'zbekcha)</label>
        <textarea
          value={textUz}
          onChange={(e) => setTextUz(e.target.value.slice(0, MAX_LEN))}
          rows={5}
          placeholder="Masalan: Ertaga barcha shoxobchalarda 2x bonus!"
          className="w-full resize-y rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]"
        />
        <p className="text-right text-[11px] text-[var(--color-ink-tertiary)]">{textUz.length}/{MAX_LEN}</p>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Matn (ruscha, ixtiyoriy)</label>
        <textarea
          value={textRu}
          onChange={(e) => setTextRu(e.target.value.slice(0, MAX_LEN))}
          rows={4}
          placeholder="Bo'sh qolsa, rus tilidagi mijozlarga o'zbekcha matn boradi"
          className="w-full resize-y rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Qachon yuborilsin</label>
        <SendTimePicker modes={['now', 'custom']} mode={mode} onModeChange={setMode} customAt={customAt} onCustomAtChange={setCustomAt} />
      </div>

      {textUz.trim() && <Preview label="Ko'rinishi" text={textUz} />}

      <Button type="submit" className="w-full" loading={submitting} disabled={!canSubmit}>
        <Send size={14} /> {mode === 'custom' ? 'Rejalashtirish' : 'Yuborish'}
      </Button>
    </form>
  )
}
