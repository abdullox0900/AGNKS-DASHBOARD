import { useState } from 'react'
import useSWR from 'swr'
import { Download, Search, X } from 'lucide-react'
import { PageTitle } from '@/shared/ui/PageTitle'
import { StatStrip } from '@/shared/ui/StatStrip'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Chip } from '@/shared/ui/Chip'
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
import { formatNumber } from '@/shared/lib/format'
import { formatPhone } from '@/shared/lib/phone'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

type Tab = 'stations' | 'clients' | 'ops'
const PAGE = 50

const keyOf = (name: string, f: Filter, ...rest: unknown[]) => [name, f.stationIds?.join(',') ?? 'all', f.from.toISOString(), f.to.toISOString(), ...rest]
/** plain grouped numbers (the column / card title already says it is money) */
const money = (n: number) => formatNumber(n)

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
    <div>
      <PageTitle
        title={t('bonusrep.title')}
        sub={t('bonusrep.subtitle')}
        right={
          <Button variant="secondary" onClick={download} loading={downloading}>
            <Download size={15} /> Excel
          </Button>
        }
      />

      <StatStrip
        items={[
          { key: 'earned', label: t('bonusrep.kpi_earned'), value: totals && money(totals.earned), hint: totals ? t('bonusrep.h_receipts', { n: formatNumber(totals.receiptsCount) }) : '' },
          { key: 'redeemed', label: t('bonusrep.kpi_redeemed'), value: totals && money(totals.redeemed), hint: totals ? t('bonusrep.h_redeems', { n: formatNumber(totals.redeemCount) }) : '' },
          { key: 'diff', label: t('bonusrep.kpi_diff'), value: totals && money(totals.earned - totals.redeemed), hint: t('bonusrep.h_diff') },
          {
            key: 'adjusted',
            label: t('bonusrep.kpi_adjusted'),
            value: totals && `${(totals.adjusted ?? 0) < 0 ? '−' : ''}${money(Math.abs(totals.adjusted ?? 0))}`,
            hint: totals ? t('bonusrep.h_adjusted', { n: money(totals.pending ?? 0) }) : '',
          },
        ]}
      />

      <div className="dt-card mt-5 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-[var(--color-border)] px-5">
          {(['stations', 'clients', 'ops'] as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                '-mb-px border-b-2 px-2.5 py-3.5 text-[14px] font-semibold transition-colors',
                tab === key ? 'border-[var(--color-primary)] text-[var(--color-ink)]' : 'border-transparent text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-secondary)]',
              )}
            >
              {t(key === 'stations' ? 'bonusrep.tab_stations' : key === 'clients' ? 'bonusrep.tab_clients' : 'bonusrep.tab_ops')}
            </button>
          ))}
          {station && (
            <button onClick={() => setStation(null)} className="ml-auto flex h-8 items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 text-[12.5px] font-medium text-[var(--color-primary)]">
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
    </div>
  )
}

function StationsTab({ rows, totals, loading, error, onRetry, onOpen }: { rows: StationBonus[]; totals?: BonusTotals; loading: boolean; error: boolean; onRetry: () => void; onOpen: (s: StationBonus) => void }) {
  const { t } = useI18n()
  const columns: DataTableColumn<StationBonus>[] = [
    { id: 'name', header: 'common.station', accessor: (r) => r.name, sticky: true, cell: (r) => <span className="font-semibold">{r.name}</span> },
    { id: 'receipts', header: 'bonusrep.col_receipts', accessor: (r) => r.receiptsCount, numeric: true, cell: (r) => formatNumber(r.receiptsCount) },
    { id: 'base', header: 'bonusrep.col_receipts_sum', accessor: (r) => r.receiptsSum, numeric: true, cell: (r) => money(r.receiptsSum) },
    { id: 'earned', header: 'bonusrep.col_earned', accessor: (r) => r.earned, numeric: true, cell: (r) => money(r.earned) },
    { id: 'redeemed', header: 'bonusrep.col_redeemed', accessor: (r) => r.redeemed, numeric: true, cell: (r) => money(r.redeemed) },
    { id: 'redeems', header: 'bonusrep.col_redeems', accessor: (r) => r.redeemCount, numeric: true, cell: (r) => formatNumber(r.redeemCount) },
    { id: 'diff', header: 'bonusrep.col_diff', accessor: (r) => r.earned - r.redeemed, numeric: true, cell: (r) => money(r.earned - r.redeemed) },
  ]
  return (
    <div title={t('bonusrep.hint_station_row')}>
      <DataTable
        bare
        index={false}
        columns={columns}
        data={rows}
        loading={loading}
        error={error ? t('common.load_failed') : undefined}
        onRetry={onRetry}
        onRowClick={onOpen}
        getRowId={(r) => r.stationId}
        emptyMessage={t('bonusrep.empty')}
        footer={
          totals && rows.length > 0
            ? {
                name: t('bonusrep.total'),
                receipts: formatNumber(totals.receiptsCount),
                base: money(totals.receiptsSum),
                earned: money(totals.earned),
                redeemed: money(totals.redeemed),
                redeems: formatNumber(totals.redeemCount),
                diff: money(totals.earned - totals.redeemed),
              }
            : undefined
        }
      />
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
    <div>
      <div className="px-5 py-3">
        <SearchBox value={q} onChange={(v) => { setQ(v); setOffset(0) }} />
      </div>
      <DataTable bare indexOffset={offset} columns={columns} data={data?.items ?? []} loading={isLoading} error={error ? t('common.load_failed') : undefined} onRetry={() => mutate()} getRowId={(r) => r.userId} emptyMessage={t('bonusrep.empty')} />
      <div className="px-5 pb-3">
        <Pager offset={offset} total={data?.total ?? 0} onChange={setOffset} />
      </div>
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
    <div>
      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        {([undefined, 'earn', 'spend'] as const).map((k) => (
          <Chip key={k ?? 'all'} active={type === k} onClick={() => { setType(k); setOffset(0) }}>
            {t(k === undefined ? 'bonusrep.type_all' : k === 'earn' ? 'bonusrep.type_earn' : 'bonusrep.type_spend')}
          </Chip>
        ))}
        <div className="ml-auto w-full sm:w-auto">
          <SearchBox value={q} onChange={(v) => { setQ(v); setOffset(0) }} />
        </div>
      </div>
      <DataTable bare indexOffset={offset} columns={columns} data={data?.items ?? []} loading={isLoading} error={error ? t('common.load_failed') : undefined} onRetry={() => mutate()} getRowId={(r) => `${r.type}-${r.id}`} emptyMessage={t('bonusrep.empty')} />
      <div className="px-5 pb-3">
        <Pager offset={offset} total={data?.total ?? 0} onChange={setOffset} />
      </div>
    </div>
  )
}
