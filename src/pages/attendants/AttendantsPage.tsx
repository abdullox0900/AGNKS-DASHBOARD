import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Gift, MoreHorizontal, Pencil, Plus, Power, Trash2, Trophy } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Drawer } from '@/shared/ui/Drawer'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/shared/ui/Menu'
import { NewBadge } from '@/shared/ui/NewBadge'
import { useToast } from '@/shared/ui/Toast'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { useStations } from '@/shared/api/hooks'
import {
  apiAttendants,
  apiCreateAttendant,
  apiReferralSettings,
  apiReferralSummary,
  apiRemoveAttendant,
  apiSaveReferralSettings,
  apiUpdateAttendant,
  type Attendant,
  type RankingRow,
} from '@/shared/api/referrals'
import { ApiError } from '@/shared/api/errors'
import { usePermission } from '@/shared/lib/permissions'
import { formatMoneyFull, formatNumber } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

type Tab = 'ranking' | 'roster'

const fieldClass =
  'h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-primary)]'

/**
 * Zapravkachilar: the attendants a new client can name as "who brought you", how many clients each brought,
 * the reward for the best one, and the switch that turns the question on or off.
 */
export function AttendantsPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('ranking')
  return (
    <div className="space-y-4">
      <SettingsCard />
      <div className="inline-flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
        {(['ranking', 'roster'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn('rounded-md px-3.5 py-1.5 text-[13px] font-medium', tab === key ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)]')}
          >
            {t(key === 'ranking' ? 'att.tab_ranking' : 'att.tab_roster')}
          </button>
        ))}
      </div>
      {tab === 'ranking' ? <Ranking /> : <Roster />}
    </div>
  )
}

// ------------------------------------------------------------------ settings

function SettingsCard() {
  const { t } = useI18n()
  const { show } = useToast()
  const canManage = usePermission('attendants.manage')
  const { data, mutate } = useSWR('/admin/referrals/settings', apiReferralSettings)
  const [reward, setReward] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { mutate: globalMutate } = useSWRConfig()

  async function save(patch: { enabled?: boolean; rewardAmount?: number }) {
    setBusy(true)
    try {
      await apiSaveReferralSettings(patch)
      await mutate()
      void globalMutate((key) => Array.isArray(key) && key[0] === 'referral-summary')
      show(t('att.saved'))
    } catch {
      show(t('common.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  const shownReward = reward ?? (data ? String(data.rewardAmount) : '')
  const rewardDirty = reward !== null && reward !== '' && Number(reward) !== data?.rewardAmount

  return (
    <Card>
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={!!data?.enabled}
            aria-label={t('att.ask_title')}
            disabled={!canManage || !data || busy}
            onClick={() => data && void save({ enabled: !data.enabled })}
            className={cn(
              'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
              data?.enabled ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border-strong)]',
            )}
          >
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', data?.enabled ? 'left-[22px]' : 'left-0.5')} />
          </button>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--color-ink)]">
              {t('att.ask_title')} <NewBadge since="2026-10-12" />
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--color-ink-tertiary)]">{data?.enabled ? t('att.ask_on_hint') : t('att.ask_off_hint')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Gift size={18} />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[var(--color-ink-secondary)]">{t('att.reward_title')}</p>
            {canManage ? (
              <form
                className="mt-1 flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (rewardDirty) void save({ rewardAmount: Number(reward) }).then(() => setReward(null))
                }}
              >
                <label className="flex h-10 items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 focus-within:border-[var(--color-primary)]">
                  <input
                    inputMode="numeric"
                    value={shownReward === '' ? '' : formatNumber(Number(shownReward))}
                    onChange={(e) => setReward(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="tnum w-28 bg-transparent text-[16px] font-bold text-[var(--color-ink)] outline-none"
                    aria-label={t('att.reward_title')}
                  />
                  <span className="text-[12px] text-[var(--color-ink-tertiary)]">{t('att.unit')}</span>
                </label>
                <Button type="submit" size="sm" disabled={!rewardDirty} loading={busy}>
                  {t('common.save')}
                </Button>
              </form>
            ) : (
              <p className="tnum text-[20px] font-bold text-[var(--color-ink)]">{data ? formatMoneyFull(data.rewardAmount) : '—'}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ------------------------------------------------------------------- ranking

function Ranking() {
  const { t } = useI18n()
  const { filters } = useGlobalFilters()
  const key = ['referral-summary', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString()]
  const { data, isLoading, error, mutate } = useSWR(key, () => apiReferralSummary(filters), { keepPreviousData: true })

  const leader = data?.ranking[0] && data.ranking[0].clients > 0 ? data.ranking[0] : null
  const columns: DataTableColumn<RankingRow & { rank: number }>[] = [
    { id: 'rank', header: '№', accessor: (r) => r.rank, numeric: true, cell: (r) => <span className="text-[var(--color-ink-tertiary)]">{r.clients > 0 ? r.rank : '—'}</span> },
    {
      id: 'name',
      header: 'att.col_name',
      accessor: (r) => r.name,
      sticky: true,
      cell: (r) => (
        <span className="flex items-center gap-2 font-medium">
          {leader?.id === r.id && <Trophy size={15} className="text-[var(--color-amber)]" />}
          {r.name}
          {!r.active && <Badge>{t('att.inactive')}</Badge>}
        </span>
      ),
    },
    { id: 'station', header: 'common.station', accessor: (r) => r.stationName },
    {
      id: 'clients',
      header: 'att.col_clients',
      accessor: (r) => r.clients,
      numeric: true,
      cell: (r) => (
        <span className="font-semibold">
          {formatNumber(r.clients)}
          {r.typed > 0 && <span className="ml-1.5 text-[11.5px] font-normal text-[var(--color-ink-tertiary)]" title={t('att.typed_hint')}>({t('att.typed_n', { n: r.typed })})</span>}
        </span>
      ),
    },
  ]
  const rows = (data?.ranking ?? []).map((r, i) => ({ ...r, rank: i + 1 }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('att.stat_new')} value={data ? formatNumber(data.newClients) : '—'} />
        <Stat label={t('att.stat_named')} value={data ? formatNumber(data.answered) : '—'} tone="success" />
        <Stat label={t('att.stat_skipped')} value={data ? formatNumber(data.skipped) : '—'} />
        <Stat label={t('att.stat_enabled')} value={data ? (data.enabled ? t('att.on') : t('att.off')) : '—'} tone={data?.enabled ? 'success' : undefined} />
      </div>

      {leader && data && (
        <Card className="flex items-center gap-4 !border-[var(--color-amber)]/40 !bg-[var(--color-amber-soft)]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-amber)]/15 text-[var(--color-amber)]">
            <Trophy size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-amber)]">{t('att.leader')}</p>
            <p className="truncate text-[18px] font-bold text-[var(--color-ink)]">
              {leader.name} <span className="text-[13px] font-medium text-[var(--color-ink-secondary)]">· {leader.stationName}</span>
            </p>
            <p className="text-[13px] text-[var(--color-ink-secondary)]">{t('att.leader_text', { n: leader.clients, reward: formatMoneyFull(data.rewardAmount) })}</p>
          </div>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        error={error ? t('common.load_failed') : undefined}
        onRetry={() => mutate()}
        getRowId={(r) => r.id}
        emptyMessage={t('att.empty_ranking')}
      />

      {data && data.unmatched.length > 0 && (
        <Card>
          <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{t('att.unmatched_title')}</h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-tertiary)]">{t('att.unmatched_hint')}</p>
          <ul className="mt-3 divide-y divide-[var(--color-border)]">
            {data.unmatched.map((u) => (
              <li key={u.name} className="flex items-center justify-between py-2 text-[13.5px]">
                <span className="text-[var(--color-ink)]">{u.name}</span>
                <span className="tnum font-semibold text-[var(--color-ink-secondary)]">{formatNumber(u.count)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <Card>
      <p className="text-[12px] font-medium text-[var(--color-ink-secondary)]">{label}</p>
      <p className={cn('tnum mt-1 text-[24px] font-bold', tone === 'success' ? 'text-[var(--color-success)]' : 'text-[var(--color-ink)]')}>{value}</p>
    </Card>
  )
}

// -------------------------------------------------------------------- roster

function Roster() {
  const { t } = useI18n()
  const { show } = useToast()
  const canManage = usePermission('attendants.manage')
  const { data, isLoading, error, mutate } = useSWR('/admin/attendants', apiAttendants)
  const { mutate: globalMutate } = useSWRConfig()
  const [editing, setEditing] = useState<Attendant | 'new' | null>(null)

  async function toggle(a: Attendant) {
    try {
      await apiUpdateAttendant(a.id, { active: !a.active })
      void mutate()
      void globalMutate((k) => Array.isArray(k) && k[0] === 'referral-summary')
    } catch {
      show(t('common.error_generic'))
    }
  }

  async function remove(a: Attendant) {
    try {
      const res = await apiRemoveAttendant(a.id)
      show(res.deactivated ? t('att.deactivated') : t('att.deleted'))
      void mutate()
      void globalMutate((k) => Array.isArray(k) && k[0] === 'referral-summary')
    } catch {
      show(t('common.error_generic'))
    }
  }

  const columns: DataTableColumn<Attendant>[] = [
    { id: 'name', header: 'att.col_name', accessor: (r) => r.name, sticky: true, cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: 'station', header: 'common.station', accessor: (r) => r.stationName },
    { id: 'clients', header: 'att.col_clients_all', accessor: (r) => r.clients, numeric: true },
    { id: 'status', header: 'common.status', accessor: (r) => (r.active ? 1 : 0), cell: (r) => <Badge tone={r.active ? 'success' : 'neutral'}>{t(r.active ? 'att.active' : 'att.inactive')}</Badge> },
    ...(canManage
      ? [
          {
            id: 'actions',
            header: '',
            sortable: false,
            accessor: () => '',
            cell: (r: Attendant) => (
              <div className="flex justify-end">
                <Menu>
                  <MenuTrigger
                    aria-label={t('common.edit')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-tertiary)] outline-none transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-ink)] data-[state=open]:bg-[var(--color-surface-alt)]"
                  >
                    <MoreHorizontal size={17} />
                  </MenuTrigger>
                  <MenuContent align="end" className="w-52">
                    <MenuItem onSelect={() => setEditing(r)}>
                      <Pencil size={14} /> {t('common.edit')}
                    </MenuItem>
                    <MenuItem onSelect={() => void toggle(r)}>
                      <Power size={14} /> {t(r.active ? 'att.deactivate' : 'att.activate')}
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem danger onSelect={() => void remove(r)}>
                      <Trash2 size={14} /> {t('common.delete')}
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </div>
            ),
          } satisfies DataTableColumn<Attendant>,
        ]
      : []),
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">{t('att.roster_hint')}</p>
        {canManage && (
          <Button onClick={() => setEditing('new')}>
            <Plus size={15} /> {t('att.add')}
          </Button>
        )}
      </div>
      <DataTable columns={columns} data={data ?? []} loading={isLoading} error={error ? t('common.load_failed') : undefined} onRetry={() => mutate()} getRowId={(r) => r.id} emptyMessage={t('att.empty_roster')} />

      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? t('att.add') : t('att.edit')}>
        {editing !== null && (
          <AttendantForm
            key={editing === 'new' ? 'new' : editing.id}
            attendant={editing === 'new' ? null : editing}
            onDone={() => {
              setEditing(null)
              void mutate()
              void globalMutate((k) => Array.isArray(k) && k[0] === 'referral-summary')
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

function AttendantForm({ attendant, onDone }: { attendant: Attendant | null; onDone: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const { data: stations } = useStations()
  const [name, setName] = useState(attendant?.name ?? '')
  const [stationId, setStationId] = useState(attendant?.stationId ?? '')
  const [saving, setSaving] = useState(false)
  const valid = name.trim().length >= 2 && stationId !== ''

  async function save() {
    if (!valid) return
    setSaving(true)
    try {
      if (attendant) await apiUpdateAttendant(attendant.id, { name: name.trim(), stationId })
      else await apiCreateAttendant({ name: name.trim(), stationId })
      show(t('att.saved'))
      onDone()
    } catch (err) {
      const exists = err instanceof ApiError && (err.details as { message?: string } | undefined)?.message === 'attendant_exists'
      show(exists ? t('att.exists') : t('common.error_generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('att.col_name')}</label>
        <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t('att.name_ph')} className={fieldClass} autoFocus />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('common.station')}</label>
        <select value={stationId} onChange={(e) => setStationId(e.target.value)} className={fieldClass}>
          <option value="">{t('common.choose')}</option>
          {stations?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" className="w-full" disabled={!valid} loading={saving}>
        {t('common.save')}
      </Button>
    </form>
  )
}
