import { useMemo, useState } from 'react'
import { Ban, CheckCircle2, Pencil } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Drawer } from '@/shared/ui/Drawer'
import { useToast } from '@/shared/ui/Toast'
import { useClients } from '@/shared/api/hooks'
import { apiAdjustClient, apiBlockClient, apiRenameClient, apiUnblockClient } from '@/shared/api/client'
import { usePermission } from '@/shared/lib/permissions'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import type { ClientRecord } from '@/entities/models'
import { formatPhone } from '@/shared/lib/phone'

export function ClientsPage() {
  const canEdit = usePermission('clients.edit')
  const [q, setQ] = useState('')
  const { data: clients, isLoading, error, mutate } = useClients(q || undefined)
  const [selected, setSelected] = useState<ClientRecord | null>(null)

  const sorted = useMemo(() => [...(clients ?? [])].sort((a, b) => b.balance - a.balance), [clients])

  const columns: DataTableColumn<ClientRecord>[] = [
    { id: 'name', header: 'Ism', accessor: (r) => r.name, sticky: true },
    { id: 'phone', header: 'Telefon', accessor: (r) => formatPhone(r.phone) },
    { id: 'balance', header: 'Bonus balansi', accessor: (r) => r.balance, numeric: true, cell: (r) => formatMoneyFull(r.balance) },
    { id: 'created', header: "Ro'yxatdan o'tgan", accessor: (r) => r.createdAt, cell: (r) => formatDateTime(r.createdAt) },
    {
      id: 'status',
      header: 'Holat',
      accessor: (r) => r.blocked,
      cell: (r) => <Badge tone={r.blocked ? 'danger' : 'success'}>{r.blocked ? 'Bloklangan' : 'Faol'}</Badge>,
    },
    ...(canEdit
      ? [
          {
            id: 'actions',
            header: '',
            sortable: false,
            accessor: () => '',
            cell: (r: ClientRecord) => (
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(r) }}>
                  <Pencil size={13} />
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<ClientRecord>,
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ism yoki telefon bo'yicha qidirish…"
        className="h-10 w-full max-w-sm rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
      />

      <Card>
        <DataTable
          columns={columns}
          data={sorted}
          loading={isLoading}
          error={error ? "Yuklab bo'lmadi" : undefined}
          onRetry={() => mutate()}
          getRowId={(r) => r.id}
          onRowClick={canEdit ? (r) => setSelected(r) : undefined}
          emptyMessage="Mijoz topilmadi"
        />
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <ClientDetail
            client={selected}
            onChanged={() => {
              setSelected(null)
              mutate()
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

function ClientDetail({ client, onChanged }: { client: ClientRecord; onChanged: () => void }) {
  const { show } = useToast()
  const [name, setName] = useState(client.name)
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSaveName() {
    if (!name || name === client.name) return
    setSubmitting(true)
    try {
      await apiRenameClient(client.id, name)
      show('Ism yangilandi')
      onChanged()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAdjust() {
    if (!delta || !note) return
    setSubmitting(true)
    try {
      await apiAdjustClient(client.id, Number(delta), note)
      show('Balans yangilandi')
      onChanged()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleBlock() {
    setSubmitting(true)
    try {
      if (client.blocked) await apiUnblockClient(client.id)
      else await apiBlockClient(client.id)
      show(client.blocked ? 'Blok olib tashlandi' : "Mijoz bloklandi — bu raqam bilan chek skanerlab bo'lmaydi")
      onChanged()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[var(--color-surface-alt)] p-3 text-[13px] text-[var(--color-ink-secondary)]">
        Telefon: <span className="font-medium text-[var(--color-ink)]">{formatPhone(client.phone)}</span>
        <br />
        Joriy balans: <span className="font-medium text-[var(--color-ink)]">{formatMoneyFull(client.balance)}</span>
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Ism</label>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 flex-1 rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]" />
          <Button size="sm" onClick={handleSaveName} loading={submitting} disabled={!name || name === client.name}>
            Saqlash
          </Button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Balansni tuzatish (+/-)</label>
        <input
          inputMode="numeric"
          value={delta}
          onChange={(e) => setDelta(e.target.value.replace(/(?!^-)[^\d]/g, ''))}
          placeholder="masalan -500 yoki 1000"
          className="mb-2 h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Sabab (majburiy)"
          rows={2}
          className="mb-2 w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
        <Button size="sm" className="w-full" onClick={handleAdjust} loading={submitting} disabled={!delta || !note}>
          Tuzatish
        </Button>
      </div>

      <Button
        variant={client.blocked ? 'secondary' : 'danger'}
        className="w-full"
        onClick={handleToggleBlock}
        loading={submitting}
      >
        {client.blocked ? (
          <>
            <CheckCircle2 size={15} /> Blokdan chiqarish
          </>
        ) : (
          <>
            <Ban size={15} /> Bloklash (raqam chek skanerlay olmaydi)
          </>
        )}
      </Button>
    </div>
  )
}
