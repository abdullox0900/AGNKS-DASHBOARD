import { useState } from 'react'
import useSWR from 'swr'
import { Download, Search, X } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Chip } from '@/shared/ui/Chip'
import { Skeleton } from '@/shared/ui/Skeleton'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { useToast } from '@/shared/ui/Toast'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import {
  apiBonusClients,
  apiBonusOperations,
  apiBonusSummary,
  apiDownloadBonusReport,
  type BonusOperation,
  type BonusTotals,
  type ClientBonus,
  type StationBonus,
} from '@/shared/api/bonusReport'
import type { Filter } from '@/shared/api/client'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull, formatNumber } from '@/shared/lib/format'
import { formatPhone } from '@/shared/lib/phone'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

type Tab = 'stations' | 'clients' | 'ops'
const PAGE = 50

const keyOf = (name: string, f: Filter, ...rest: unknown[]) => [name, f.stationIds?.join(',') ?? 'all', f.from.toISOString(), f.to.toISOString(), ...rest]
const money = (n: number) => formatMoneyFull(n)

function Kpi({ label, value, tone, hint }: { label: string; value: string; tone?: 'earn' | 'spend' | 'warn'; hint?: string }) {
  return (
    <Card>
      <p className="text-[12.5px] font-medium text-[var(--color-ink-secondary)]">{label}</p>
      <p
        className={cn(
          'tnum mt-1 text-[24px] font-bold',
          tone === 'earn' && 'text-[var(--color-success)]',
          tone === 'spend' && 'text-[var(--color-primary)]',
          tone === 'warn' && 'text-[var(--color-amber)]',
          !tone && 'text-[var(--color-ink)]',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-tertiary)]">{hint}</p>}
    </Card>
  )
}

function Pager({ offset, total, onChange }: { offset: number; total: number; onChange: (o: number) => void }) {
  const { t } = useI18n()
  if (total <= PAGE) return null
  const to = Math.min(offset + PAGE, total)
  return (
    <div className="flex items-center justify-end gap-3 pt-3 text-[12.5px] text-[var(--color-ink-secondary)]">
      <span className="tnum">{t('bonusrep.page_of', { from: offset + 1, to, total })}</span>
      <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - PAGE))}>
        {t('bonusrep.prev')}
      </Button>
      <Button size="sm" variant="ghost" disabled={to >= total} onClick={() => onChange(offset + PAGE)}>
        {t('bonusrep.next')}
      </Button>
    </div>
  )
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  return (
    <label className="flex h-9 w-full max-w-[280px] items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 focus-within:border-[var(--color-primary)]">
      <Search size={14} className="text-[var(--color-ink-tertiary)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('bonusrep.search_ph')}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)]"
      />
    </label>
  )
}

export function BonusReportPage() {
  const { t } = useI18n()
  const { show } = useToast()
  const { filters } = useGlobalFilters()
  const [tab, setTab] = useState<Tab>('stations')
  const [downloading, setDownloading] = useState(false)
  // drill-down: a station picked in the first tab narrows the operations / clients tabs
  const [station, setStation] = useState<{ id: string; name: string } | null>(null)

  const effective: Filter = station ? { ...filters, stationIds: [station.id] } : { stationIds: filters.stationIds, from: filters.from, to: filters.to }

  const { data: summary, isLoading: sumLoading, error: sumError, mutate: sumMutate } = useSWR(keyOf('bonus-rep-summary', filters), () => apiBonusSummary(filters), { keepPreviousData: true })
  const totals: BonusTotals | undefined = summary?.totals

  async function download() {
    setDownloading(true)
    try {
      await apiDownloadBonusReport(effective)
    } catch {
      show(t('bonusrep.export_failed'))
    } finally {
      setDownloading(false)
    }
  }

  function openStation(s: StationBonus) {
    setStation({ id: s.stationId, name: s.name })
    setTab('ops')
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--color-ink)]">{t('bonusrep.title')}</h1>
          <p className="mt-1 max-w-[640px] text-[13px] text-[var(--color-ink-tertiary)]">{t('bonusrep.subtitle')}</p>
        </div>
        <Button onClick={download} loading={downloading}>
          <Download size={15} /> {t('bonusrep.export')}
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sumLoading && !totals ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px] w-full rounded-2xl" />)
        ) : (
          <>
            <Kpi label={t('bonusrep.kpi_earned')} value={money(totals?.earned ?? 0)} tone="earn" hint={`${formatNumber(totals?.receiptsCount ?? 0)} · ${money(totals?.receiptsSum ?? 0)}`} />
            <Kpi label={t('bonusrep.kpi_redeemed')} value={money(totals?.redeemed ?? 0)} tone="spend" hint={formatNumber(totals?.redeemCount ?? 0)} />
            <Kpi label={t('bonusrep.kpi_diff')} value={money((totals?.earned ?? 0) - (totals?.redeemed ?? 0))} />
            <Kpi label={t('bonusrep.kpi_pending')} value={money(totals?.pending ?? 0)} tone="warn" />
            {!!totals?.adjusted && <Kpi label={t('bonusrep.kpi_adjusted')} value={`${totals.adjusted > 0 ? '+' : '−'}${money(Math.abs(totals.adjusted))}`} />}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
          {(['stations', 'clients', 'ops'] as Tab[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn('rounded-md px-3 py-1.5 text-[13px] font-medium', tab === key ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)]')}
            >
              {t(key === 'stations' ? 'bonusrep.tab_stations' : key === 'clients' ? 'bonusrep.tab_clients' : 'bonusrep.tab_ops')}
            </button>
          ))}
        </div>
        {station && (
          <button
            onClick={() => setStation(null)}
            className="flex h-8 items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 text-[12.5px] font-medium text-[var(--color-primary)]"
          >
            {t('bonusrep.station_filter', { name: station.name })} <X size={13} />
          </button>
        )}
      </div>

      {tab === 'stations' && (
        <StationsTab loading={sumLoading} error={!!sumError} onRetry={() => sumMutate()} rows={summary?.stations ?? []} totals={totals} onOpen={openStation} />
      )}
      {tab === 'clients' && <ClientsTab filter={effective} />}
      {tab === 'ops' && <OperationsTab filter={effective} />}
    </div>
  )
}

function StationsTab({ rows, totals, loading, error, onRetry, onOpen }: { rows: StationBonus[]; totals?: BonusTotals; loading: boolean; error: boolean; onRetry: () => void; onOpen: (s: StationBonus) => void }) {
  const { t } = useI18n()
  const columns: DataTableColumn<StationBonus>[] = [
    { id: 'name', header: 'common.station', accessor: (r) => r.name, sticky: true },
    { id: 'receipts', header: 'bonusrep.col_receipts', accessor: (r) => r.receiptsCount, numeric: true, cell: (r) => formatNumber(r.receiptsCount) },
    { id: 'base', header: 'bonusrep.col_receipts_sum', accessor: (r) => r.receiptsSum, numeric: true, cell: (r) => money(r.receiptsSum) },
    { id: 'earned', header: 'bonusrep.col_earned', accessor: (r) => r.earned, numeric: true, cell: (r) => <span className="font-semibold text-[var(--color-success)]">{money(r.earned)}</span> },
    { id: 'redeemed', header: 'bonusrep.col_redeemed', accessor: (r) => r.redeemed, numeric: true, cell: (r) => <span className="font-semibold text-[var(--color-primary)]">{money(r.redeemed)}</span> },
    { id: 'redeems', header: 'bonusrep.col_redeems', accessor: (r) => r.redeemCount, numeric: true, cell: (r) => formatNumber(r.redeemCount) },
    { id: 'diff', header: 'bonusrep.col_diff', accessor: (r) => r.earned - r.redeemed, numeric: true, cell: (r) => money(r.earned - r.redeemed) },
  ]
  return (
    <div>
      <p className="mb-2 text-[12px] text-[var(--color-ink-tertiary)]">{t('bonusrep.hint_station_row')}</p>
      <DataTable columns={columns} data={rows} loading={loading} error={error ? t('common.load_failed') : undefined} onRetry={onRetry} onRowClick={onOpen} getRowId={(r) => r.stationId} emptyMessage={t('bonusrep.empty')} />
      {totals && rows.length > 0 && (
        <div className="mt-2 grid grid-cols-2 items-center gap-x-4 gap-y-1 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-alt)] px-4 py-3 text-[13px] font-semibold text-[var(--color-ink)] sm:grid-cols-[minmax(0,1.6fr)_repeat(6,minmax(0,1fr))]">
          <span className="col-span-2 sm:col-span-1">{t('bonusrep.total')}</span>
          <span className="tnum sm:text-right">{formatNumber(totals.receiptsCount)}</span>
          <span className="tnum sm:text-right">{money(totals.receiptsSum)}</span>
          <span className="tnum text-[var(--color-success)] sm:text-right">{money(totals.earned)}</span>
          <span className="tnum text-[var(--color-primary)] sm:text-right">{money(totals.redeemed)}</span>
          <span className="tnum sm:text-right">{formatNumber(totals.redeemCount)}</span>
          <span className="tnum sm:text-right">{money(totals.earned - totals.redeemed)}</span>
        </div>
      )}
    </div>
  )
}

function ClientsTab({ filter }: { filter: Filter }) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const { data, isLoading, error, mutate } = useSWR(keyOf('bonus-rep-clients', filter, q, offset), () => apiBonusClients(filter, { q: q || undefined, limit: PAGE, offset }), { keepPreviousData: true })
  const columns: DataTableColumn<ClientBonus>[] = [
    { id: 'name', header: 'common.client', accessor: (r) => r.name, sticky: true },
    { id: 'phone', header: 'common.phone', accessor: (r) => r.phone ?? '', cell: (r) => (r.phone ? formatPhone(r.phone) : '—') },
    { id: 'earned', header: 'bonusrep.col_earned', accessor: (r) => r.earned, numeric: true, cell: (r) => <span className="font-semibold text-[var(--color-success)]">{money(r.earned)}</span> },
    { id: 'redeemed', header: 'bonusrep.col_redeemed', accessor: (r) => r.redeemed, numeric: true, cell: (r) => <span className="font-semibold text-[var(--color-primary)]">{money(r.redeemed)}</span> },
    { id: 'redeems', header: 'bonusrep.col_redeems', accessor: (r) => r.redeemCount, numeric: true },
    { id: 'balance', header: 'bonusrep.col_balance', accessor: (r) => r.balance, numeric: true, cell: (r) => money(r.balance) },
  ]
  return (
    <div className="space-y-3">
      <SearchBox value={q} onChange={(v) => { setQ(v); setOffset(0) }} />
      <DataTable columns={columns} data={data?.items ?? []} loading={isLoading} error={error ? t('common.load_failed') : undefined} onRetry={() => mutate()} getRowId={(r) => r.userId} emptyMessage={t('bonusrep.empty')} />
      <Pager offset={offset} total={data?.total ?? 0} onChange={setOffset} />
    </div>
  )
}

function OperationsTab({ filter }: { filter: Filter }) {
  const { t } = useI18n()
  const [type, setType] = useState<'earn' | 'spend' | undefined>(undefined)
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const { data, isLoading, error, mutate } = useSWR(keyOf('bonus-rep-ops', filter, type, q, offset), () => apiBonusOperations(filter, { type, q: q || undefined, limit: PAGE, offset }), { keepPreviousData: true })

  const statusLabel = (o: BonusOperation) =>
    o.type === 'earn' ? (o.status === 'applied' ? t('bonusrep.st_applied') : t('bonusrep.st_pending')) : o.status === 'applied' ? t('bonusrep.st_done') : t('bonusrep.st_reversed')
  const statusTone = (o: BonusOperation) => (o.status === 'applied' ? 'success' : o.status === 'reversed' ? 'danger' : 'warning')

  const columns: DataTableColumn<BonusOperation>[] = [
    { id: 'at', header: 'common.date', accessor: (r) => r.at, cell: (r) => formatDateTime(r.at), sticky: true },
    { id: 'type', header: 'common.type', accessor: (r) => r.type, cell: (r) => <Badge tone={r.type === 'earn' ? 'success' : 'primary'}>{t(r.type === 'earn' ? 'bonusrep.type_earn' : 'bonusrep.type_spend')}</Badge> },
    { id: 'station', header: 'common.station', accessor: (r) => r.stationName },
    { id: 'client', header: 'common.client', accessor: (r) => r.clientName, cell: (r) => <span>{r.clientName}{r.clientPhone ? <span className="ml-1.5 text-[var(--color-ink-tertiary)]">{formatPhone(r.clientPhone)}</span> : null}</span> },
    { id: 'cashier', header: 'bonusrep.col_cashier', accessor: (r) => r.cashierName ?? '', cell: (r) => r.cashierName ?? '—' },
    { id: 'base', header: 'bonusrep.col_base', accessor: (r) => (r.type === 'earn' ? r.baseAmount : 0), numeric: true, cell: (r) => (r.type === 'earn' ? money(r.baseAmount) : '—') },
    { id: 'amount', header: 'bonusrep.col_amount', accessor: (r) => r.amount, numeric: true, cell: (r) => <span className={cn('font-semibold', r.type === 'earn' ? 'text-[var(--color-success)]' : 'text-[var(--color-primary)]')}>{r.type === 'earn' ? '+' : '−'}{money(r.amount)}</span> },
    { id: 'status', header: 'common.status', accessor: (r) => r.status, cell: (r) => <Badge tone={statusTone(r)}>{statusLabel(r)}</Badge> },
  ]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {([undefined, 'earn', 'spend'] as const).map((k) => (
          <Chip key={k ?? 'all'} active={type === k} onClick={() => { setType(k); setOffset(0) }}>
            {t(k === undefined ? 'bonusrep.type_all' : k === 'earn' ? 'bonusrep.type_earn' : 'bonusrep.type_spend')}
          </Chip>
        ))}
        <div className="ml-auto w-full sm:w-auto">
          <SearchBox value={q} onChange={(v) => { setQ(v); setOffset(0) }} />
        </div>
      </div>
      <DataTable columns={columns} data={data?.items ?? []} loading={isLoading} error={error ? t('common.load_failed') : undefined} onRetry={() => mutate()} getRowId={(r) => `${r.type}-${r.id}`} emptyMessage={t('bonusrep.empty')} />
      <Pager offset={offset} total={data?.total ?? 0} onChange={setOffset} />
    </div>
  )
}
