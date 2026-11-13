import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { ClientAvatar } from '@/shared/ui/ClientAvatar'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { NewBadge } from '@/shared/ui/NewBadge'
import { PageTitle } from '@/shared/ui/PageTitle'
import { SearchInput } from '@/shared/ui/SearchInput'
import { StatStrip } from '@/shared/ui/StatStrip'
import { useToast } from '@/shared/ui/Toast'
import { apiBlockClient, apiClientsPage, apiClientsStats, apiUnblockClient, type ClientListRow, type ClientsFilter, type ClientsSort } from '@/shared/api/client'
import { formatDateTime, formatSeen } from '@/shared/lib/dates'
import { formatNumber } from '@/shared/lib/format'
import { formatPhone } from '@/shared/lib/phone'
import { usePermission } from '@/shared/lib/permissions'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const PAGE_SIZE = 40
const SORTS: { key: ClientsSort; label: DictKey }[] = [
  { key: 'balance', label: 'clients.sort_balance' },
  { key: 'seen', label: 'clients.sort_seen' },
  { key: 'registered', label: 'clients.sort_registered' },
]

/** Page numbers around the current one: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, pages: number): (number | '…')[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages))
  const sorted = [...keep].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

const Som = ({ n }: { n: number }) => (
  <span className="font-mono">
    <span className="font-semibold text-[var(--color-ink)]">{formatNumber(n)}</span> <span className="text-[var(--color-ink-tertiary)]">so‘m</span>
  </span>
)

/** The client picked in the list: the essentials and block / unblock (SEO), plus a link to the full page. */
function ClientPanel({ row, onChanged }: { row: ClientListRow | null; onChanged: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const canEdit = usePermission('clients.edit')
  const canOpen = usePermission('clients.detail')
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setAsking(false)
    setReason('')
  }, [row?.id])

  if (!row) {
    return <div className="dt-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center text-[13.5px] text-[var(--color-ink-tertiary)]">{t('clients.pick_hint')}</div>
  }
  const words = { today: t('clients.today'), yesterday: t('clients.yesterday') }
  const line = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] py-3.5 last:border-0">
      <span className="text-[14px] text-[var(--color-ink-secondary)]">{label}</span>
      <span className="text-right text-[14px]">{value}</span>
    </div>
  )
  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true)
    try {
      await action()
      show(message)
      setAsking(false)
      setReason('')
      onChanged()
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="dt-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-tertiary)]">{t('clients.panel_label')}</p>
      <div className="mt-2 flex items-center gap-3">
        <ClientAvatar name={row.name} src={row.photoUrl} size={52} />
        <p className="min-w-0 break-words text-[22px] font-bold leading-tight text-[var(--color-ink)]">{row.name || '—'}</p>
      </div>
      <div className="mt-3">
        {line(t('common.phone'), <span className="font-mono font-semibold text-[var(--color-ink)]">{row.phone ? formatPhone(row.phone) : '—'}</span>)}
        {line(t('clients.balance'), <Som n={row.balance} />)}
        {line(t('clients.last_seen'), <span className="text-[var(--color-ink)]">{row.lastSeenAt ? formatSeen(row.lastSeenAt, words) : '—'}</span>)}
        {line(t('clients.registered'), <span className="font-mono text-[13px] text-[var(--color-ink)]">{formatDateTime(row.registeredAt)}</span>)}
        {line(t('common.status'), <span className={cn('font-semibold', row.blocked ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]')}>{row.blocked ? t('common.blocked') : t('common.active')}</span>)}
      </div>

      {canEdit &&
        (row.blocked ? (
          <Button variant="secondary" className="mt-4 w-full" loading={busy} onClick={() => run(() => apiUnblockClient(row.id), t('clients.unblocked'))}>
            {t('clients.unblock_btn')}
          </Button>
        ) : asking ? (
          <div className="mt-4 space-y-2">
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              rows={2}
              placeholder={t('clients.block_reason_ph')}
              className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-transparent px-3 py-2 text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-danger)]"
            />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setAsking(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" className="flex-1" loading={busy} disabled={reason.trim().length < 3} onClick={() => run(() => apiBlockClient(row.id, reason.trim()), t('clients.blocked_toast'))}>
                {t('clients.block_short')}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setAsking(true)}>
            {t('clients.block_short')}
          </Button>
        ))}

      {canOpen && (
        <Link to={`/clients/${row.id}`} className="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13.5px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)]">
          {t('common.details')} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}

/**
 * "Mijozlar": three numbers on top (tap one to filter), the list 40 per page with the server's sort,
 * and the picked client on the right.
 */
export function ClientsPage() {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [sort, setSort] = useState<ClientsSort>('balance')
  const [filter, setFilter] = useState<ClientsFilter | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pickedId, setPickedId] = useState<string | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(id)
  }, [q])

  const { data: stats } = useSWR('/admin/clients/stats', apiClientsStats, { refreshInterval: 60_000 })
  const { data, error, isLoading, mutate } = useSWR(
    ['/admin/clients/page', debouncedQ, sort, filter ?? '', page],
    () => apiClientsPage({ q: debouncedQ || undefined, page, pageSize: PAGE_SIZE, sort, filter }),
    { keepPreviousData: true },
  )

  const rows = data?.items ?? []
  const picked = rows.find((r) => r.id === pickedId) ?? rows[0] ?? null
  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0
  const to = data ? (data.page - 1) * data.pageSize + rows.length : 0

  function pick<T>(setter: (v: T) => void, v: T) {
    setter(v)
    setPage(1)
  }

  const columns: DataTableColumn<ClientListRow>[] = [
    { id: 'name', header: 'common.name', sortable: false, accessor: (r) => r.name, cell: (r) => (
        <span className="flex items-center gap-3">
          <ClientAvatar name={r.name} src={r.photoUrl} size={34} />
          <span className="font-semibold">{r.name || '—'}</span>
        </span>
      ) },
    { id: 'phone', header: 'common.phone', sortable: false, accessor: (r) => r.phone ?? '', cell: (r) => <span className="font-mono text-[13.5px] text-[var(--color-ink-secondary)]">{r.phone ? formatPhone(r.phone) : '—'}</span> },
    { id: 'balance', header: 'clients.balance', sortable: false, numeric: true, accessor: (r) => r.balance, cell: (r) => <Som n={r.balance} /> },
    {
      id: 'status',
      header: 'common.status',
      sortable: false,
      accessor: (r) => r.blocked,
      cell: (r) => <span className={cn('font-medium', r.blocked ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]')}>{r.blocked ? t('common.blocked') : t('common.active')}</span>,
    },
  ]

  const pager = data && data.total > 0 && (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="font-mono text-[13px] text-[var(--color-ink-tertiary)]">{t('clients.range', { from, to, total: formatNumber(data.total) })}</p>
      {data.pages > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} aria-label={t('clients.prev')}>
            <ChevronLeft size={15} />
          </Button>
          {pageWindow(data.page, data.pages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-[var(--color-ink-tertiary)]">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={cn('h-8 min-w-8 rounded-lg px-2 font-mono text-[13px] font-medium', p === data.page ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]')}
              >
                {p}
              </button>
            ),
          )}
          <Button variant="ghost" size="sm" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)} aria-label={t('clients.next')}>
            <ChevronRight size={15} />
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="w-full">
      <PageTitle
        title={
          <>
            {t('nav.clients')} <NewBadge since="2026-10-17" />
          </>
        }
        sub={t('clients.subtitle')}
      />

      <StatStrip
        items={[
          { key: 'all', label: t('clients.stat_total'), value: stats && formatNumber(stats.total), hint: stats ? t('clients.stat_today', { n: stats.today }) : '', onClick: () => pick(setFilter, undefined), active: filter === undefined },
          { key: 'recent', label: t('clients.stat_recent'), value: stats && formatNumber(stats.recent), hint: stats ? t('clients.stat_recent_hint', { n: stats.recentDays }) : '', onClick: () => pick(setFilter, 'recent' as ClientsFilter), active: filter === 'recent' },
          {
            key: 'frequent',
            label: t('clients.stat_frequent'),
            value: stats && formatNumber(stats.frequent),
            hint: stats ? t('clients.stat_frequent_hint', { n: stats.frequentMinDays, d: stats.frequentWindowDays }) : '',
            onClick: () => pick(setFilter, 'frequent' as ClientsFilter),
            active: filter === 'frequent',
          },
        ]}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className={cn('min-w-0', isLoading && data && 'opacity-60')}>
          <DataTable
            columns={columns}
            data={rows}
            loading={isLoading && !data}
            error={error ? t('common.load_failed') : undefined}
            onRetry={() => mutate()}
            getRowId={(r) => r.id}
            onRowClick={(r) => setPickedId(r.id)}
            selectedId={picked?.id}
            indexOffset={from > 0 ? from - 1 : 0}
            emptyMessage={t('clients.empty')}
            maxHeight={1100}
            title={
              <>
                {t('common.showing')}: <span className="font-bold text-[var(--color-ink)]">{rows.length}</span>
              </>
            }
            actions={
              <>
                <select
                  value={sort}
                  onChange={(e) => pick(setSort, e.target.value as ClientsSort)}
                  aria-label={t('clients.sort_balance')}
                  className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13.5px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {t(s.label)}
                    </option>
                  ))}
                </select>
                <SearchInput
                  value={q}
                  onChange={(v) => {
                    setQ(v)
                    setPage(1)
                  }}
                  placeholder={t('clients.search_short')}
                  className="w-full sm:w-[280px]"
                />
              </>
            }
            bottom={pager || undefined}
          />
        </div>
        <div className="xl:sticky xl:top-4 xl:self-start">
          <ClientPanel row={picked} onChanged={() => void mutate()} />
        </div>
      </div>
    </div>
  )
}
