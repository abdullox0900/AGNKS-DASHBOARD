import { useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Drawer } from '@/shared/ui/Drawer'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/shared/ui/Menu'
import { PasswordField } from '@/shared/ui/PasswordField'
import { PasswordCell } from '@/shared/ui/PasswordCell'
import { PhoneInput } from '@/shared/ui/PhoneInput'
import { Rich } from '@/shared/ui/Rich'
import { useToast } from '@/shared/ui/Toast'
import { useAdmins, useStations } from '@/shared/api/hooks'
import { apiCreateAdmin, apiRemoveAdmin, apiUpdateAdmin, type AdminAccount } from '@/shared/api/client'
import { ApiError, apiErrorMessage } from '@/shared/api/errors'
import { usePermission } from '@/shared/lib/permissions'
import type { DashboardRole } from '@/entities/auth'
import { formatPhone, isCompletePhone, toE164, toLocalDigits } from '@/shared/lib/phone'
import { useI18n } from '@/app/providers/I18nProvider'
import { useAuthStore } from '@/shared/config/authStore'
import type { DictKey } from '@/shared/config/dictionaries'

const ROLE_LABEL: Record<DashboardRole, DictKey> = {
  root_admin: 'role.root_admin',
  seo: 'role.seo',
  branch_manager: 'role.branch_manager',
}
const ROLE_TONE: Record<DashboardRole, 'primary' | 'success' | 'neutral'> = {
  root_admin: 'primary',
  seo: 'success',
  branch_manager: 'neutral',
}

const inputClass = 'h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]'
const labelClass = 'mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]'

function errorText(err: unknown, t: ReturnType<typeof useI18n>['t']): string {
  if (err instanceof ApiError) {
    if (err.details?.message === 'phone_taken') return t('admins.phone_taken')
    if (err.details?.reason === 'cannot_remove_self') return t('admins.cannot_delete_self')
    if (err.details?.reason === 'last_seo') return t('admins.cannot_delete_last_seo')
    return apiErrorMessage(err)
  }
  return t('common.error_generic')
}

export function AdminsPage() {
  const { t } = useI18n()
  const canEdit = usePermission('admins.edit')
  const myId = useAuthStore((s) => s.userId)
  const { data: admins, isLoading, error, mutate } = useAdmins()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminAccount | null>(null)
  const [deleting, setDeleting] = useState<AdminAccount | null>(null)
  const { show } = useToast()

  const columns: DataTableColumn<AdminAccount>[] = [
    {
      id: 'name',
      header: 'common.name',
      accessor: (r) => r.firstName,
      sticky: true,
      cell: (r) => (
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[12.5px] font-bold text-[var(--color-primary)]">
            {r.firstName.charAt(0).toUpperCase()}
          </span>
          <span className="font-medium">{r.firstName}</span>
          {r.userId === myId && <Badge>{t('admins.you')}</Badge>}
        </span>
      ),
    },
    { id: 'phone', header: 'admins.login_phone', accessor: (r) => formatPhone(r.phone) },
    { id: 'role', header: 'admins.role', accessor: (r) => r.role, cell: (r) => <Badge tone={ROLE_TONE[r.role]}>{t(ROLE_LABEL[r.role])}</Badge> },
    { id: 'station', header: 'common.station', accessor: (r) => r.stationName ?? t('common.all_network') },
    ...(canEdit
      ? [
          {
            id: 'password',
            header: 'common.password',
            sortable: false,
            accessor: (r: AdminAccount) => r.password ?? '',
            cell: (r: AdminAccount) => <PasswordCell password={r.password} />,
          } satisfies DataTableColumn<AdminAccount>,
          {
            id: 'actions',
            header: '',
            sortable: false,
            accessor: () => '',
            cell: (r: AdminAccount) => (
              <div className="flex justify-end">
                <Menu>
                  <MenuTrigger
                    aria-label={t('common.edit')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-tertiary)] outline-none transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-ink)] data-[state=open]:bg-[var(--color-surface-alt)]"
                  >
                    <MoreHorizontal size={17} />
                  </MenuTrigger>
                  <MenuContent align="end" className="w-44">
                    <MenuItem onSelect={() => setEditing(r)}>
                      <Pencil size={14} /> {t('common.edit')}
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem danger disabled={r.userId === myId} onSelect={() => setDeleting(r)}>
                      <Trash2 size={14} /> {t('common.delete')}
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </div>
            ),
          } satisfies DataTableColumn<AdminAccount>,
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={15} /> {t('admins.add')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={admins ?? []}
        loading={isLoading}
        error={error ? t('common.load_failed') : undefined}
        onRetry={() => mutate()}
        getRowId={(r) => r.id}
        emptyMessage={t('admins.empty')}
      />

      <Drawer open={formOpen} onClose={() => setFormOpen(false)} title={t('admins.add')}>
        <AdminForm
          onCreated={() => {
            setFormOpen(false)
            show(t('admins.created_toast'))
            mutate()
          }}
        />
      </Drawer>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={t('admins.edit_title', { name: editing?.firstName ?? '' })}>
        {editing && (
          <EditAdminForm
            key={editing.id}
            admin={editing}
            onSaved={() => {
              setEditing(null)
              show(t('common.saved'))
              mutate()
            }}
          />
        )}
      </Drawer>

      <Drawer open={!!deleting} onClose={() => setDeleting(null)} title={t('admins.delete_title', { name: deleting?.firstName ?? '' })}>
        {deleting && (
          <DeleteAdminForm
            admin={deleting}
            onDeleted={() => {
              setDeleting(null)
              show(t('admins.deleted_toast'))
              mutate()
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

function StationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  const { data: stations } = useStations()
  return (
    <div>
      <label className={labelClass}>{t('common.station')}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">{t('common.choose')}</option>
        {stations?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function EditAdminForm({ admin, onSaved }: { admin: AdminAccount; onSaved: () => void }) {
  const { t } = useI18n()
  const [firstName, setFirstName] = useState(admin.firstName)
  const [phone, setPhone] = useState(toLocalDigits(admin.phone))
  const [stationId, setStationId] = useState(admin.stationId ?? '')
  const [password, setPassword] = useState(admin.password ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isBranch = admin.role === 'branch_manager'
  const patch = {
    ...(firstName.trim() !== admin.firstName ? { firstName: firstName.trim() } : {}),
    ...(isCompletePhone(phone) && toE164(phone) !== admin.phone ? { phone: toE164(phone) } : {}),
    ...(password && password !== (admin.password ?? '') ? { password } : {}),
    ...(isBranch && stationId && stationId !== admin.stationId ? { stationId } : {}),
  }
  const valid = firstName.trim().length >= 2 && isCompletePhone(phone) && (!password || password.length >= 6) && (!isBranch || !!stationId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || Object.keys(patch).length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      await apiUpdateAdmin(admin.id, patch)
      onSaved()
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge tone={ROLE_TONE[admin.role]}>{t(ROLE_LABEL[admin.role])}</Badge>
      </div>
      <div>
        <label className={labelClass}>{t('common.name')}</label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t('admins.f_phone_login')}</label>
        <PhoneInput value={phone} onChange={setPhone} className="h-10 rounded-lg border border-[var(--color-border)] px-3 text-[13px]" />
        <p className="mt-1 text-[11px] text-[var(--color-ink-tertiary)]">{t('admins.login_note')}</p>
      </div>
      {isBranch && <StationSelect value={stationId} onChange={setStationId} />}
      <div>
        <label className={labelClass}>{t('common.password')}</label>
        <PasswordField value={password} onChange={setPassword} generate placeholder={admin.password ? undefined : t('admins.password_unknown')} />
        <p className="mt-1 text-[11px] text-[var(--color-ink-tertiary)]">{admin.password ? t('admins.min_password') : t('admins.password_keep')}</p>
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--color-danger)]">{error}</p>}
      <Button type="submit" className="w-full" loading={submitting} disabled={!valid || Object.keys(patch).length === 0}>
        {t('common.save')}
      </Button>
    </form>
  )
}

function DeleteAdminForm({ admin, onDeleted }: { admin: AdminAccount; onDeleted: () => void }) {
  const { t } = useI18n()
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
      setError(err instanceof ApiError && err.code === 'AUTH_INVALID_CREDENTIALS' ? t('admins.wrong_password') : errorText(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl bg-[var(--color-danger-soft)] p-3.5 text-[13px] text-[var(--color-ink)]">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
        <p>
          <Rich text={t('admins.delete_confirm', { name: admin.firstName, phone: formatPhone(admin.phone) })} />
        </p>
      </div>
      <div>
        <label className={labelClass}>{t('admins.your_password')}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--color-danger)]">{error}</p>}
      <Button variant="danger" className="w-full" loading={submitting} disabled={password.length < 6} onClick={handleDelete}>
        <Trash2 size={15} /> {t('admins.delete_forever')}
      </Button>
    </div>
  )
}

function AdminForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useI18n()
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<DashboardRole>('branch_manager')
  const [stationId, setStationId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const needsStation = role === 'branch_manager'
  const canSubmit = firstName.trim().length >= 2 && isCompletePhone(phone) && password.length >= 6 && (!needsStation || !!stationId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await apiCreateAdmin({
        firstName: firstName.trim(),
        phone: toE164(phone),
        role,
        stationId: needsStation ? stationId : null,
        password,
      })
      onCreated()
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>{t('common.name')}</label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t('admins.f_phone_login')}</label>
        <PhoneInput value={phone} onChange={setPhone} className="h-10 rounded-lg border border-[var(--color-border)] px-3 text-[13px]" />
      </div>
      <div>
        <label className={labelClass}>{t('admins.role')}</label>
        <select value={role} onChange={(e) => setRole(e.target.value as DashboardRole)} className={inputClass}>
          <option value="branch_manager">{t('role.branch_manager')}</option>
          <option value="seo">{t('role.seo')}</option>
          <option value="root_admin">{t('role.root_admin')}</option>
        </select>
      </div>
      {needsStation && <StationSelect value={stationId} onChange={setStationId} />}
      <div>
        <label className={labelClass}>{t('common.password')}</label>
        <PasswordField value={password} onChange={setPassword} generate />
        <p className="mt-1 text-[11px] text-[var(--color-ink-tertiary)]">{t('admins.min_password')}</p>
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--color-danger)]">{error}</p>}
      <Button type="submit" className="w-full" loading={submitting} disabled={!canSubmit}>
        {t('common.add')}
      </Button>
    </form>
  )
}
