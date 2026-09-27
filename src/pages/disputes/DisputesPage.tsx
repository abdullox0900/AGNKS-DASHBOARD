import { useState } from 'react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Drawer } from '@/shared/ui/Drawer'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Chip } from '@/shared/ui/Chip'
import { useDisputes, useFeedback } from '@/shared/api/hooks'
import { apiResolveDispute, apiResolveFeedback, type FeedbackItem } from '@/shared/api/client'
import { useToast } from '@/shared/ui/Toast'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'
import type { DisputeRecord, DisputeStatus } from '@/entities/models'
import { formatPhone } from '@/shared/lib/phone'

const STATUS_LABEL: Record<DisputeStatus, string> = { open: 'Ochiq', upheld: "To'g'ri", reversed: "To'liq qaytarildi", adjusted: 'Farq qaytarildi' }
const STATUS_TONE: Record<DisputeStatus, 'neutral' | 'success' | 'warning'> = { open: 'warning', upheld: 'neutral', reversed: 'success', adjusted: 'success' }

const KIND_LABEL: Record<FeedbackItem['kind'], string> = { suggestion: 'Taklif', complaint: 'Shikoyat' }

export function DisputesPage() {
  const [tab, setTab] = useState<'transactions' | 'general'>('transactions')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5" style={{ width: 'fit-content' }}>
        {(['transactions', 'general'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('rounded-md px-3 py-1.5 text-[13px] font-medium', tab === t ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-ink-secondary)]')}
          >
            {t === 'transactions' ? 'Chek/yechim shikoyatlari' : 'Taklif va shikoyat'}
          </button>
        ))}
      </div>

      {tab === 'transactions' ? <TransactionDisputesTab /> : <GeneralFeedbackTab />}
    </div>
  )
}

function TransactionDisputesTab() {
  const [statusFilter, setStatusFilter] = useState<'open' | undefined>('open')
  const { data, isLoading, error, mutate } = useDisputes(statusFilter)
  const [selected, setSelected] = useState<DisputeRecord | null>(null)

  const columns: DataTableColumn<DisputeRecord>[] = [
    { id: 'client', header: 'Mijoz', accessor: (r) => r.clientName, sticky: true },
    { id: 'type', header: 'Operatsiya', accessor: (r) => r.refType, cell: (r) => (r.refType === 'spend' ? 'Yechim' : "Bonus yig'ish") },
    { id: 'amount', header: 'Summa', accessor: (r) => r.actualAmount, numeric: true, cell: (r) => formatMoneyFull(r.actualAmount) },
    { id: 'claimed', header: "Mijoz da'vosi", accessor: (r) => r.claimedAmount ?? 0, numeric: true, cell: (r) => (r.claimedAmount !== null ? formatMoneyFull(r.claimedAmount) : '—') },
    { id: 'cashier', header: 'Kassir', accessor: (r) => r.cashierName ?? '—' },
    { id: 'station', header: 'Filial', accessor: (r) => r.stationName },
    { id: 'date', header: 'Sana', accessor: (r) => r.createdAt, cell: (r) => formatDateTime(r.createdAt) },
    { id: 'status', header: 'Holat', accessor: (r) => r.status, cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Chip active={statusFilter === 'open'} onClick={() => setStatusFilter('open')}>
          Ochiq
        </Chip>
        <Chip active={statusFilter === undefined} onClick={() => setStatusFilter(undefined)}>
          Hammasi
        </Chip>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          error={error ? "Yuklab bo'lmadi" : undefined}
          onRetry={() => mutate()}
          getRowId={(r) => r.id}
          onRowClick={(r) => setSelected(r)}
          emptyMessage="Shikoyat yo'q"
        />
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Shikoyat tafsiloti">
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
  const [statusFilter, setStatusFilter] = useState<'open' | undefined>('open')
  const { data, isLoading, error, mutate } = useFeedback(statusFilter)
  const [selected, setSelected] = useState<FeedbackItem | null>(null)

  const columns: DataTableColumn<FeedbackItem>[] = [
    { id: 'client', header: 'Mijoz', accessor: (r) => r.clientName, sticky: true },
    { id: 'phone', header: 'Telefon', accessor: (r) => formatPhone(r.clientPhone) },
    { id: 'kind', header: 'Turi', accessor: (r) => r.kind, cell: (r) => <Badge tone={r.kind === 'complaint' ? 'danger' : 'primary'}>{KIND_LABEL[r.kind]}</Badge> },
    { id: 'message', header: 'Xabar', accessor: (r) => r.message },
    { id: 'date', header: 'Sana', accessor: (r) => r.createdAt, cell: (r) => formatDateTime(r.createdAt) },
    { id: 'status', header: 'Holat', accessor: (r) => r.status, cell: (r) => <Badge tone={r.status === 'open' ? 'warning' : 'success'}>{r.status === 'open' ? 'Ochiq' : 'Yopilgan'}</Badge> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Chip active={statusFilter === 'open'} onClick={() => setStatusFilter('open')}>
          Ochiq
        </Chip>
        <Chip active={statusFilter === undefined} onClick={() => setStatusFilter(undefined)}>
          Hammasi
        </Chip>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          error={error ? "Yuklab bo'lmadi" : undefined}
          onRetry={() => mutate()}
          getRowId={(r) => r.id}
          onRowClick={(r) => setSelected(r)}
          emptyMessage="Taklif yoki shikoyat yo'q"
        />
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected ? KIND_LABEL[selected.kind] : ''}>
        {selected && (
          <FeedbackDetail
            item={selected}
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

function FeedbackDetail({ item, onResolved }: { item: FeedbackItem; onResolved: () => void }) {
  const { show } = useToast()
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleResolve() {
    setSubmitting(true)
    try {
      await apiResolveFeedback(item.id, note || undefined)
      show('Belgilandi')
      onResolved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Row label="Mijoz" value={item.clientName} />
      {item.clientPhone && <Row label="Telefon" value={item.clientPhone} />}
      <Row label="Sana" value={formatDateTime(item.createdAt)} />
      <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
        <p className="mb-1 text-[11px] text-[var(--color-ink-tertiary)]">Xabar</p>
        <p className="whitespace-pre-wrap text-[13px] text-[var(--color-ink)]">{item.message}</p>
      </div>

      {item.status === 'open' ? (
        <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Izoh (ixtiyoriy)"
            rows={2}
            className="w-full resize-none rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]"
          />
          <Button className="w-full" loading={submitting} onClick={handleResolve}>
            Ko'rib chiqildi deb belgilash
          </Button>
        </div>
      ) : (
        item.resolutionNote && (
          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="text-[13px] text-[var(--color-ink-secondary)]">{item.resolutionNote}</p>
          </div>
        )
      )}
    </div>
  )
}

function DisputeDetail({ dispute, onResolved }: { dispute: DisputeRecord; onResolved: () => void }) {
  const { show } = useToast()
  const [note, setNote] = useState('')
  const [adjustAmount, setAdjustAmount] = useState(
    dispute.claimedAmount !== null ? String(Math.max(0, dispute.actualAmount - dispute.claimedAmount)) : '',
  )
  const [submitting, setSubmitting] = useState(false)

  async function resolve(resolution: 'upheld' | 'reversed' | 'adjusted') {
    if (!note) return
    setSubmitting(true)
    try {
      await apiResolveDispute(dispute.id, resolution, note, resolution === 'adjusted' ? Number(adjustAmount) : undefined)
      show('Qaror qabul qilindi, mijozga xabar yuborildi')
      onResolved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-[13px]">
        <Row label="Mijoz" value={dispute.clientName} />
        <Row label="Filial" value={dispute.stationName} />
        <Row label="Operatsiya summasi" value={formatMoneyFull(dispute.actualAmount)} />
        <Row label="Mijoz da'vosi" value={dispute.claimedAmount !== null ? formatMoneyFull(dispute.claimedAmount) : '—'} />
        {dispute.cashierName && <Row label="Kassir" value={dispute.cashierName} />}
        <Row label="Sana" value={formatDateTime(dispute.createdAt)} />
      </div>

      <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
        <p className="mb-1 text-[11px] text-[var(--color-ink-tertiary)]">Mijoz izohi</p>
        <p className="text-[13px] text-[var(--color-ink)]">{dispute.comment}</p>
      </div>

      {dispute.status === 'open' ? (
        <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
          <p className="text-[13px] font-semibold text-[var(--color-ink)]">Qaror</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Izoh (majburiy)"
            rows={2}
            className="w-full resize-none rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]"
          />
          {dispute.refType === 'spend' && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--color-ink-secondary)]">Farq summasi:</span>
              <input
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value.replace(/\D/g, ''))}
                className="w-32 rounded-lg border border-[var(--color-border)] px-2 py-1 text-[13px]"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button variant="ghost" disabled={!note || submitting} onClick={() => resolve('upheld')}>
              To'g'ri — o'zgarish yo'q
            </Button>
            {dispute.refType === 'spend' && (
              <>
                <Button variant="secondary" disabled={!note || submitting} onClick={() => resolve('reversed')}>
                  To'liq qaytarish
                </Button>
                <Button variant="secondary" disabled={!note || submitting || !adjustAmount} onClick={() => resolve('adjusted')}>
                  Farqni qaytarish ({formatMoneyFull(Number(adjustAmount || 0))})
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-[var(--color-border)] pt-4">
          <Badge tone={STATUS_TONE[dispute.status]}>{STATUS_LABEL[dispute.status]}</Badge>
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
