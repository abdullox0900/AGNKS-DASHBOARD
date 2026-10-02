import { useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Drawer } from '@/shared/ui/Drawer'
import { usePermission } from '@/shared/lib/permissions'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/shared/ui/Menu'
import { PasswordCell } from '@/shared/ui/PasswordCell'
import { PasswordField } from '@/shared/ui/PasswordField'
import { PhoneInput } from '@/shared/ui/PhoneInput'
import { Rich } from '@/shared/ui/Rich'
import { useToast } from '@/shared/ui/Toast'
import { useCashiers, useStations, useTerminals } from '@/shared/api/hooks'
import { apiCreateCashier, apiRemoveCashier, apiUpdateCashier } from '@/shared/api/client'
import { ApiError, apiErrorMessage } from '@/shared/api/errors'
import { useAuthStore } from '@/shared/config/authStore'
import { useIsNetworkWide } from '@/shared/lib/permissions'
import type { Cashier } from '@/entities/models'
import { formatPhone, isCompletePhone, toE164, toLocalDigits } from '@/shared/lib/phone'
import { useI18n } from '@/app/providers/I18nProvider'

const inputClass = 'h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]'
const labelClass = 'mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]'

function errorText(err: unknown, t: ReturnType<typeof useI18n>['t']): string {
  if (err instanceof ApiError) return err.details?.message === 'phone_taken' ? t('admins.phone_taken') : apiErrorMessage(err)
  return t('common.error_generic')
}

export function CashiersPage() {
  const { t } = useI18n()
  const isNetworkWide = useIsNetworkWide()
  const ownStationId = useAuthStore((s) => s.stationId)
  const { data: cashiers, isLoading, error, mutate } = useCashiers(isNetworkWide ? undefined : ownStationId ?? undefined)
  const { data: stations } = useStations()
  const { show } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Cashier | null>(null)
  const [deleting, setDeleting] = useState<Cashier | null>(null)
  const canManage = usePermission('cashiers.manage') // root_admin sees the list only

  const allColumns: DataTableColumn<Cashier>[] = [
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
        </span>
      ),
    },
    { id: 'phone', header: 'common.phone', accessor: (r) => formatPhone(r.phone) },
    { id: 'station', header: 'common.station', accessor: (r) => stations?.find((s) => s.id === r.stationId)?.name ?? r.stationName ?? '' },
    { id: 'terminals', header: 'cashiers.terminals', accessor: (r) => r.terminalIds.length },
    {
      id: 'status',
      header: 'common.status',
      accessor: (r) => r.status,
      cell: (r) => <Badge tone={r.status === 'active' ? 'success' : 'danger'}>{r.status === 'active' ? t('common.active') : t('common.blocked')}</Badge>,
    },
    { id: 'password', header: 'common.password', sortable: false, accessor: (r) => r.password ?? '', cell: (r) => <PasswordCell password={r.password} /> },
    {
      id: 'actions',
      header: '',
      sortable: false,
      accessor: () => '',
      cell: (r) => (
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
              <MenuItem danger onSelect={() => setDeleting(r)}>
                <Trash2 size={14} /> {t('common.delete')}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      ),
    },
  ]

  const columns = canManage ? allColumns : allColumns.filter((c) => c.id !== 'actions' && c.id !== 'password')

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={15} /> {t('cashiers.add')}
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={cashiers ?? []}
        loading={isLoading}
        error={error ? t('common.load_failed') : undefined}
        onRetry={() => mutate()}
        getRowId={(r) => r.id}
        emptyMessage={t('cashiers.empty')}
      />

      <Drawer open={formOpen} onClose={() => setFormOpen(false)} title={t('cashiers.add')}>
        <CashierForm
          onDone={() => {
            setFormOpen(false)
            show(t('cashiers.added_toast'))
            mutate()
          }}
        />
      </Drawer>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={t('admins.edit_title', { name: editing?.firstName ?? '' })}>
        {editing && (
          <CashierForm
            key={editing.id}
            cashier={editing}
            onDone={() => {
              setEditing(null)
              show(t('common.saved'))
              mutate()
            }}
          />
        )}
      </Drawer>

      <Drawer open={!!deleting} onClose={() => setDeleting(null)} title={t('admins.delete_title', { name: deleting?.firstName ?? '' })}>
        {deleting && (
          <DeleteCashier
            cashier={deleting}
            onDone={() => {
              setDeleting(null)
              show(t('cashiers.deleted_toast'))
              mutate()
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

function DeleteCashier({ cashier, onDone }: { cashier: Cashier; onDone: () => void }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await apiRemoveCashier(cashier.id)
      onDone()
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl bg-[var(--color-danger-soft)] p-3.5 text-[13px] text-[var(--color-ink)]">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
        <p>
          <Rich text={t('cashiers.delete_confirm', { name: cashier.firstName, phone: formatPhone(cashier.phone) })} />
        </p>
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--color-danger)]">{error}</p>}
      <Button variant="danger" className="w-full" loading={busy} onClick={remove}>
        <Trash2 size={15} /> {t('common.delete')}
      </Button>
    </div>
  )
}

/** Create (no `cashier`) or edit a cashier: name, phone (= login), station, terminals, password. */
function CashierForm({ cashier, onDone }: { cashier?: Cashier; onDone: () => void }) {
  const { t } = useI18n()
  const { data: stations } = useStations()
  const isNetworkWide = useIsNetworkWide()
  const ownStationId = useAuthStore((s) => s.stationId)
  const [firstName, setFirstName] = useState(cashier?.firstName ?? '')
  const [phone, setPhone] = useState(cashier ? toLocalDigits(cashier.phone) : '')
  const [stationId, setStationId] = useState(cashier?.stationId ?? (isNetworkWide ? '' : ownStationId ?? ''))
  const [terminalIds, setTerminalIds] = useState<string[]>(cashier?.terminalIds ?? [])
  const [password, setPassword] = useState(cashier?.password ?? '')
  const { data: terminals } = useTerminals(stationId || null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const editing = !!cashier
  const valid = firstName.trim().length >= 2 && isCompletePhone(phone) && !!stationId && (!password || password.length >= 4)
  const patch = editing
    ? {
        ...(firstName.trim() !== cashier.firstName ? { firstName: firstName.trim() } : {}),
        ...(toE164(phone) !== cashier.phone ? { phone: toE164(phone) } : {}),
        ...(stationId !== cashier.stationId ? { stationId } : {}),
        ...(terminalIds.slice().sort().join() !== cashier.terminalIds.slice().sort().join() ? { terminalIds } : {}),
        ...(password && password !== (cashier.password ?? '') ? { password } : {}),
      }
    : {}
  const changed = !editing || Object.keys(patch).length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || !changed) return
    setSubmitting(true)
    setError(null)
    try {
      if (editing) await apiUpdateCashier(cashier.id, patch)
      else await apiCreateCashier({ firstName: firstName.trim(), phone: toE164(phone), stationId, terminalIds, pin: password || undefined })
      onDone()
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
        <label className={labelClass}>{t('cashiers.f_phone_login')}</label>
        <PhoneInput value={phone} onChange={setPhone} className="h-10 rounded-lg border border-[var(--color-border)] px-3 text-[13px]" />
      </div>
      {isNetworkWide && (
        <div>
          <label className={labelClass}>{t('common.station')}</label>
          <select
            value={stationId}
            onChange={(e) => {
              setStationId(e.target.value)
              setTerminalIds([])
            }}
            className={inputClass}
          >
            <option value="">{t('common.choose')}</option>
            {stations?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {stationId && terminals && terminals.length > 0 && (
        <div>
          <label className={labelClass}>{t('cashiers.terminals')}</label>
          <div className="space-y-1.5">
            {terminals.map((tm) => (
              <label key={tm.id} className="flex items-center gap-2 text-[13px] text-[var(--color-ink)]">
                <input
                  type="checkbox"
                  checked={terminalIds.includes(tm.id)}
                  onChange={(e) => setTerminalIds((prev) => (e.target.checked ? [...prev, tm.id] : prev.filter((id) => id !== tm.id)))}
                />
                {tm.label} <span className="font-mono text-[11px] text-[var(--color-ink-tertiary)]">({tm.code})</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className={labelClass}>{t('common.password')}</label>
        <PasswordField value={password} onChange={setPassword} generate="digits" placeholder={editing && !cashier.password ? t('admins.password_unknown') : undefined} />
        <p className="mt-1 text-[11px] text-[var(--color-ink-tertiary)]">{editing ? t('cashiers.password_edit_hint') : t('cashiers.password_hint')}</p>
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--color-danger)]">{error}</p>}
      <Button type="submit" className="w-full" loading={submitting} disabled={!valid || !changed}>
        {editing ? t('common.save') : t('common.add')}
      </Button>
    </form>
  )
}
