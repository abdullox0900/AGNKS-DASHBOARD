import { useState } from 'react'
import { Plus, Pencil, RotateCw, Trash2 } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Drawer } from '@/shared/ui/Drawer'
import { useToast } from '@/shared/ui/Toast'
import { useAdmins, useStations } from '@/shared/api/hooks'
import { apiCreateAdmin, apiRegenerateRecoveryCode, apiRemoveAdmin, apiUpdateAdmin, type AdminAccount } from '@/shared/api/client'
import { ApiError } from '@/shared/api/errors'
import { usePermission } from '@/shared/lib/permissions'
import type { DashboardRole } from '@/entities/auth'
import { PhoneInput } from '@/shared/ui/PhoneInput'
import { formatPhone, isCompletePhone, toE164 } from '@/shared/lib/phone'

const ROLE_LABEL: Record<DashboardRole, string> = {
  root_admin: 'Root admin',
  seo: 'SEO',
  branch_manager: 'Filial rahbari',
}
const ROLE_TONE: Record<DashboardRole, 'primary' | 'success' | 'neutral'> = {
  root_admin: 'primary',
  seo: 'success',
  branch_manager: 'neutral',
}

export function AdminsPage() {
  const canEdit = usePermission('admins.edit')
  const { data: admins, isLoading, error, mutate } = useAdmins()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminAccount | null>(null)
  const [deleting, setDeleting] = useState<AdminAccount | null>(null)
  const { show } = useToast()

  const columns: DataTableColumn<AdminAccount>[] = [
    { id: 'name', header: 'Ism', accessor: (r) => r.firstName, sticky: true },
    { id: 'phone', header: 'Telefon (login)', accessor: (r) => formatPhone(r.phone) },
    { id: 'role', header: 'Rol', accessor: (r) => r.role, cell: (r) => <Badge tone={ROLE_TONE[r.role]}>{ROLE_LABEL[r.role]}</Badge> },
    { id: 'station', header: 'Filial', accessor: (r) => r.stationName ?? "Butun tarmoq" },
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
            onClick={async (e) => {
              e.stopPropagation()
              const { recoveryCode } = await apiRegenerateRecoveryCode(r.id)
              show(`Yangi zapas kod: ${recoveryCode}`)
            }}
          >
            <RotateCw size={13} /> Zapas kod
          </Button>
          {canEdit && (
            <>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(r) }}>
                <Pencil size={13} />
              </Button>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleting(r) }}>
                <Trash2 size={13} className="text-[var(--color-danger)]" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={15} /> Admin qo'shish
        </Button>
      </div>

      <Card>
        <DataTable columns={columns} data={admins ?? []} loading={isLoading} error={error ? "Yuklab bo'lmadi" : undefined} onRetry={() => mutate()} getRowId={(r) => r.id} emptyMessage="Admin yo'q" />
      </Card>

      <Drawer open={formOpen} onClose={() => setFormOpen(false)} title="Admin qo'shish">
        <AdminForm
          onCreated={() => {
            setFormOpen(false)
            mutate()
          }}
        />
      </Drawer>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={`${editing?.firstName ?? ''} — tahrirlash`}>
        {editing && (
          <EditAdminForm
            admin={editing}
            onSaved={() => {
              setEditing(null)
              mutate()
            }}
          />
        )}
      </Drawer>

      <Drawer open={!!deleting} onClose={() => setDeleting(null)} title={`${deleting?.firstName ?? ''} — o'chirish`}>
        {deleting && (
          <DeleteAdminForm
            admin={deleting}
            onDeleted={() => {
              setDeleting(null)
              mutate()
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

function EditAdminForm({ admin, onSaved }: { admin: AdminAccount; onSaved: () => void }) {
  const { data: stations } = useStations()
  const [firstName, setFirstName] = useState(admin.firstName)
  const [stationId, setStationId] = useState(admin.stationId ?? '')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await apiUpdateAdmin(admin.id, { firstName, stationId: admin.role === 'branch_manager' ? stationId : undefined })
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Ism</label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]" />
      </div>
      {admin.role === 'branch_manager' && (
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
      <Button type="submit" className="w-full" loading={submitting} disabled={!firstName}>
        Saqlash
      </Button>
    </form>
  )
}

function DeleteAdminForm({ admin, onDeleted }: { admin: AdminAccount; onDeleted: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete() {
    if (password.length < 6) return
    setSubmitting(true)
    setError(null)
    try {
      await apiRemoveAdmin(admin.id, password)
      onDeleted()
    } catch (err) {
      setError(err instanceof ApiError ? "Parol noto'g'ri" : 'Xatolik yuz berdi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--color-ink-secondary)]">
        <b>{admin.firstName}</b> ({formatPhone(admin.phone)}) hisobini o'chirmoqchimisiz? Bu qaytarib bo'lmaydi — tasdiqlash uchun
        o'zingizning parolingizni kiriting.
      </p>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Sizning parolingiz</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--color-danger)]">{error}</p>}
      <Button variant="danger" className="w-full" loading={submitting} disabled={password.length < 6} onClick={handleDelete}>
        Butunlay o'chirish
      </Button>
    </div>
  )
}

function AdminForm({ onCreated }: { onCreated: () => void }) {
  const { data: stations } = useStations()
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<DashboardRole>('branch_manager')
  const [stationId, setStationId] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<{ recoveryCode: string } | null>(null)

  const needsStation = role === 'branch_manager'
  const canSubmit = firstName && isCompletePhone(phone) && password.length >= 6 && (!needsStation || stationId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const station = stations?.find((s) => s.id === stationId)
      const { recoveryCode } = await apiCreateAdmin({
        firstName,
        phone: toE164(phone),
        role,
        stationId: needsStation ? stationId : null,
        stationName: needsStation ? station?.name ?? null : null,
        password,
      })
      setCreated({ recoveryCode })
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-[13px] text-[var(--color-ink-secondary)]">
          Admin qo'shildi. Telefon raqami — login, parol — {password ? 'siz kiritgan parol' : ''}. Zapas kod (parol
          unutilsa doim ishlaydi) faqat bir marta ko'rsatiladi:
        </p>
        <p className="tnum text-[26px] font-bold tracking-[0.1em] text-[var(--color-primary)]">{created.recoveryCode}</p>
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
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Telefon (login bo'ladi)</label>
        <PhoneInput value={phone} onChange={setPhone} className="h-10 rounded-lg border border-[var(--color-border)] px-3 text-[13px]" />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Rol</label>
        <select value={role} onChange={(e) => setRole(e.target.value as DashboardRole)} className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px]">
          <option value="branch_manager">Filial rahbari</option>
          <option value="seo">SEO</option>
          <option value="root_admin">Root admin</option>
        </select>
      </div>
      {needsStation && (
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
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Parol</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]" />
        <p className="mt-1 text-[11px] text-[var(--color-ink-tertiary)]">Kamida 6 belgi</p>
      </div>
      <Button type="submit" className="w-full" loading={submitting} disabled={!canSubmit}>
        Qo'shish
      </Button>
    </form>
  )
}
