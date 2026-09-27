import { useState } from 'react'
import { Plus, RotateCw, Trash2 } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Drawer } from '@/shared/ui/Drawer'
import { useToast } from '@/shared/ui/Toast'
import { useCashiers, useStations, useTerminals } from '@/shared/api/hooks'
import { apiCreateCashier, apiRemoveCashier, apiResetPin } from '@/shared/api/client'
import { useAuthStore } from '@/shared/config/authStore'
import { useIsNetworkWide } from '@/shared/lib/permissions'
import type { Cashier } from '@/entities/models'
import { PhoneInput } from '@/shared/ui/PhoneInput'
import { formatPhone, isCompletePhone, toE164 } from '@/shared/lib/phone'

export function CashiersPage() {
  const isNetworkWide = useIsNetworkWide()
  const ownStationId = useAuthStore((s) => s.stationId)
  const { data: cashiers, isLoading, error, mutate } = useCashiers(isNetworkWide ? undefined : ownStationId ?? undefined)
  const { data: stations } = useStations()
  const [formOpen, setFormOpen] = useState(false)
  const [resetting, setResetting] = useState<Cashier | null>(null)

  const columns: DataTableColumn<Cashier>[] = [
    { id: 'name', header: 'Ism', accessor: (r) => r.firstName, sticky: true },
    { id: 'phone', header: 'Telefon', accessor: (r) => formatPhone(r.phone) },
    { id: 'station', header: 'Filial', accessor: (r) => stations?.find((s) => s.id === r.stationId)?.name ?? '' },
    { id: 'terminals', header: 'Terminallar', accessor: (r) => r.terminalIds.length },
    { id: 'status', header: 'Holat', accessor: (r) => r.status, cell: (r) => <Badge tone={r.status === 'active' ? 'success' : 'danger'}>{r.status === 'active' ? 'Faol' : 'Bloklangan'}</Badge> },
    {
      id: 'actions',
      header: '',
      sortable: false,
      accessor: () => '',
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              setResetting(r)
            }}
          >
            <RotateCw size={13} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async (e) => {
              e.stopPropagation()
              await apiRemoveCashier(r.id)
              mutate()
            }}
          >
            <Trash2 size={13} className="text-[var(--color-danger)]" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={15} /> Kassir qo'shish
        </Button>
      </div>

      <Card>
        <DataTable columns={columns} data={cashiers ?? []} loading={isLoading} error={error ? "Yuklab bo'lmadi" : undefined} onRetry={() => mutate()} getRowId={(r) => r.id} emptyMessage="Kassir yo'q" />
      </Card>

      <Drawer open={formOpen} onClose={() => setFormOpen(false)} title="Kassir qo'shish">
        <CashierForm
          defaultStationId={isNetworkWide ? undefined : ownStationId ?? undefined}
          onCreated={() => {
            setFormOpen(false)
            mutate()
          }}
        />
      </Drawer>

      <Drawer open={!!resetting} onClose={() => setResetting(null)} title={`${resetting?.firstName ?? ''} — PIN kodni yangilash`}>
        {resetting && (
          <ResetPinForm
            cashierId={resetting.id}
            onDone={() => {
              setResetting(null)
              mutate()
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

function ResetPinForm({ cashierId, onDone }: { cashierId: string; onDone: () => void }) {
  const { show } = useToast()
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleSubmit(customPin?: string) {
    setSubmitting(true)
    try {
      const { pin: newPin } = await apiResetPin(cashierId, customPin)
      setResult(newPin)
    } catch {
      show('Xatolik yuz berdi')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-[13px] text-[var(--color-ink-secondary)]">Yangi PIN kod faqat bir marta ko'rsatiladi:</p>
        <p className="tnum text-[32px] font-bold tracking-[0.2em] text-[var(--color-primary)]">{result}</p>
        <Button className="w-full" onClick={onDone}>
          Tushunarli
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">
          Yangi PIN (4–6 raqam) — kassir yodda tuta oladigan narsa tanlang
        </label>
        <input
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="masalan 123456"
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] tracking-[0.15em] outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <Button className="w-full" loading={submitting} disabled={pin.length < 4} onClick={() => handleSubmit(pin)}>
        Shu PIN'ni o'rnatish
      </Button>
      <Button variant="ghost" className="w-full" loading={submitting} onClick={() => handleSubmit(undefined)}>
        Tasodifiy PIN yaratish
      </Button>
    </div>
  )
}

function CashierForm({ defaultStationId, onCreated }: { defaultStationId?: string; onCreated: () => void }) {
  const { data: stations } = useStations()
  const isNetworkWide = useIsNetworkWide()
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [stationId, setStationId] = useState(defaultStationId ?? '')
  const [terminalIds, setTerminalIds] = useState<string[]>([])
  const [pin, setPin] = useState('')
  const { data: terminals } = useTerminals(stationId || null)
  const [submitting, setSubmitting] = useState(false)
  const [createdPin, setCreatedPin] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName || !isCompletePhone(phone) || !stationId) return
    setSubmitting(true)
    try {
      const { pin: finalPin } = await apiCreateCashier({
        firstName,
        phone: toE164(phone),
        stationId,
        terminalIds,
        pin: pin.length >= 4 ? pin : undefined,
      })
      setCreatedPin(finalPin)
    } finally {
      setSubmitting(false)
    }
  }

  if (createdPin) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-[13px] text-[var(--color-ink-secondary)]">Kassir qo'shildi. PIN kod faqat bir marta ko'rsatiladi:</p>
        <p className="tnum text-[32px] font-bold tracking-[0.2em] text-[var(--color-primary)]">{createdPin}</p>
        <p className="text-[12px] text-[var(--color-ink-tertiary)]">
          Kassir xodimlar botiga <b>/start</b> bosib kirishi va shu PIN bilan (yoki Telegram orqali avtomatik) tizimga kirishi kerak.
        </p>
        <Button className="w-full" onClick={onCreated}>
          Tushunarli
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Ism</label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]" />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Telefon</label>
        <PhoneInput value={phone} onChange={setPhone} className="h-10 rounded-lg border border-[var(--color-border)] px-3 text-[13px]" />
      </div>
      {isNetworkWide && (
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Filial</label>
          <select value={stationId} onChange={(e) => setStationId(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px]">
            <option value="">Tanlang</option>
            {stations?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {stationId && (
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Terminallar</label>
          <div className="space-y-1">
            {terminals?.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={terminalIds.includes(t.id)}
                  onChange={(e) => setTerminalIds((prev) => (e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)))}
                />
                {t.label} ({t.code})
              </label>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">
          PIN kod (ixtiyoriy, bo'sh qoldirsangiz tasodifiy yaratiladi)
        </label>
        <input
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="masalan 123456"
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] tracking-[0.15em] outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <Button type="submit" className="w-full" loading={submitting} disabled={!firstName || !isCompletePhone(phone) || !stationId}>
        Qo'shish
      </Button>
    </form>
  )
}
