import { useMemo, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Search, Trash2, TriangleAlert } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Chip } from '@/shared/ui/Chip'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Drawer } from '@/shared/ui/Drawer'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useToast } from '@/shared/ui/Toast'
import { useGlobalFilters } from '@/features/global-filters/useGlobalFilters'
import { apiDataDelete, apiDataPreview, apiDataRecords, type DataRecord, type RecordKind, type RecordRef } from '@/shared/api/dataFix'
import { ApiError } from '@/shared/api/errors'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import { formatPhone } from '@/shared/lib/phone'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const PAGE = 50
const keyOf = (r: RecordRef) => `${r.kind}:${r.id}`
const KIND_TONE = { receipt: 'success', spend: 'primary', adjust: 'warning' } as const

/** SEO-only: find test / mistaken receipts, redemptions and manual adjustments and delete them (password-confirmed). */
export function DataFixPage() {
  const { t } = useI18n()
  const { filters } = useGlobalFilters()
  const { mutate: globalMutate } = useSWRConfig()
  const [kind, setKind] = useState<RecordKind | undefined>(undefined)
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<Map<string, RecordRef>>(new Map())
  const [drawer, setDrawer] = useState(false)

  const key = ['data-fix', filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString(), kind, q, offset]
  const { data, isLoading, error, mutate } = useSWR(key, () => apiDataRecords({ stationIds: filters.stationIds, from: filters.from, to: filters.to }, { kind, q: q || undefined, limit: PAGE, offset }), { keepPreviousData: true })
  const items = data?.items ?? []

  const toggle = (r: DataRecord) =>
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(keyOf(r))) next.delete(keyOf(r))
      else next.set(keyOf(r), { kind: r.kind, id: r.id })
      return next
    })
  const allOnPage = items.length > 0 && items.every((r) => selected.has(keyOf(r)))
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Map(prev)
      for (const r of items) {
        if (allOnPage) next.delete(keyOf(r))
        else next.set(keyOf(r), { kind: r.kind, id: r.id })
      }
      return next
    })

  const columns: DataTableColumn<DataRecord>[] = [
    {
      id: 'pick',
      header: '',
      sortable: false,
      accessor: () => '',
      cell: (r) => (
        <input
          type="checkbox"
          checked={selected.has(keyOf(r))}
          onChange={() => toggle(r)}
          onClick={(e) => e.stopPropagation()}
          aria-label={t('common.select')}
          className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
        />
      ),
    },
    { id: 'at', header: 'common.date', accessor: (r) => r.at, cell: (r) => formatDateTime(r.at) },
    { id: 'kind', header: 'common.type', accessor: (r) => r.kind, cell: (r) => <Badge tone={KIND_TONE[r.kind]}>{t(`fix.k_${r.kind}` as 'fix.k_receipt')}</Badge> },
    { id: 'station', header: 'common.station', accessor: (r) => r.stationName ?? '', cell: (r) => r.stationName ?? '—' },
    { id: 'client', header: 'common.client', accessor: (r) => r.clientName, cell: (r) => <span>{r.clientName}{r.clientPhone ? <span className="ml-1.5 text-[var(--color-ink-tertiary)]">{formatPhone(r.clientPhone)}</span> : null}</span> },
    { id: 'base', header: 'fix.col_base', accessor: (r) => (r.kind === 'receipt' ? r.baseAmount : 0), numeric: true, cell: (r) => (r.kind === 'receipt' ? formatMoneyFull(r.baseAmount) : '—') },
    {
      id: 'bonus',
      header: 'fix.col_effect',
      accessor: (r) => r.bonus,
      numeric: true,
      cell: (r) => <span className={cn('font-semibold', r.bonus >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-primary)]')}>{r.bonus >= 0 ? '+' : '−'}{formatMoneyFull(Math.abs(r.bonus))}</span>,
    },
    { id: 'status', header: 'common.status', accessor: (r) => r.status, cell: (r) => <Badge tone={r.status === 'applied' ? 'success' : r.status === 'reversed' || r.status === 'rejected' ? 'danger' : 'warning'}>{r.status}</Badge> },
  ]

  const refs = useMemo(() => [...selected.values()], [selected])

  return (
    <div className="space-y-4 pb-20">
      <header>
        <h1 className="text-[24px] font-bold text-[var(--color-ink)]">{t('fix.title')}</h1>
        <p className="mt-1 max-w-[720px] text-[13px] text-[var(--color-ink-tertiary)]">{t('fix.subtitle')}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {([undefined, 'receipt', 'spend', 'adjust'] as const).map((k) => (
          <Chip key={k ?? 'all'} active={kind === k} onClick={() => { setKind(k); setOffset(0) }}>
            {t(k === undefined ? 'fix.kind_all' : (`fix.kind_${k}` as 'fix.kind_receipt'))}
          </Chip>
        ))}
        <label className="ml-auto flex h-9 w-full max-w-[280px] items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 focus-within:border-[var(--color-primary)]">
          <Search size={14} className="text-[var(--color-ink-tertiary)]" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOffset(0) }}
            placeholder={t('bonusrep.search_ph')}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)]"
          />
        </label>
      </div>
      {filters.stationIds && <p className="text-[12px] text-[var(--color-amber)]">{t('fix.stations_note')}</p>}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={togglePage} disabled={items.length === 0}>
          {t('fix.select_page')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        error={error ? t('common.load_failed') : undefined}
        onRetry={() => mutate()}
        onRowClick={toggle}
        getRowId={keyOf}
        emptyMessage={t('fix.empty')}
      />
      {(data?.total ?? 0) > PAGE && (
        <div className="flex items-center justify-end gap-3 text-[12.5px] text-[var(--color-ink-secondary)]">
          <span className="tnum">{t('bonusrep.page_of', { from: offset + 1, to: Math.min(offset + PAGE, data!.total), total: data!.total })}</span>
          <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>{t('bonusrep.prev')}</Button>
          <Button size="sm" variant="ghost" disabled={offset + PAGE >= data!.total} onClick={() => setOffset(offset + PAGE)}>{t('bonusrep.next')}</Button>
        </div>
      )}

      {refs.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3" style={{ boxShadow: 'var(--shadow-float)' }}>
            <span className="tnum text-[13.5px] font-semibold text-[var(--color-ink)]">{t('fix.selected', { n: refs.length })}</span>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Map())}>{t('fix.clear')}</Button>
            <Button size="sm" variant="danger" onClick={() => setDrawer(true)}>
              <Trash2 size={14} /> {t('fix.delete_btn')}
            </Button>
          </div>
        </div>
      )}

      <Drawer open={drawer} onClose={() => setDrawer(false)} title={t('fix.drawer_title')} width={520}>
        {drawer && (
          <DeletePanel
            refs={refs}
            onDone={() => {
              setDrawer(false)
              setSelected(new Map())
              void mutate()
              // every report / list that shows these numbers must refetch
              void globalMutate(() => true)
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

function DeletePanel({ refs, onDone }: { refs: RecordRef[]; onDone: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const { data: preview, error: previewError } = useSWR(['data-fix-preview', refs.map(keyOf).join('|')], () => apiDataPreview(refs), { revalidateOnFocus: false })
  const [note, setNote] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const blocked = !!preview && preview.negative.length > 0
  const canSubmit = !!preview && !blocked && preview.found > 0 && note.trim().length >= 3 && password.length > 0

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await apiDataDelete(refs, password, note.trim())
      show(t('fix.done', { n: res.deleted }))
      onDone()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === 'AUTH_INVALID_CREDENTIALS' ? t('fix.wrong_password') : err.code === 'NOT_FOUND' ? t('fix.not_found') : t('common.error_generic'))
      } else setError(t('common.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl bg-[var(--color-danger-soft)] p-3.5 text-[13px] text-[var(--color-ink)]">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
        <p>{t('fix.warn')}</p>
      </div>

      {previewError ? (
        <p className="text-[13px] font-medium text-[var(--color-danger)]">{t('common.error_generic')}</p>
      ) : !preview ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <>
          <p className="text-[13px] text-[var(--color-ink)]">{t('fix.summary', { n: preview.found, receipt: preview.byKind.receipt, spend: preview.byKind.spend, adjust: preview.byKind.adjust })}</p>
          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-ink-secondary)]">{t('fix.balance_change')}</p>
            <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
              {preview.clients.map((c) => (
                <li key={c.userId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
                  <span className="min-w-0 truncate text-[var(--color-ink)]">{c.name}{c.phone ? <span className="ml-1.5 text-[var(--color-ink-tertiary)]">{formatPhone(c.phone)}</span> : null}</span>
                  <span className={cn('tnum shrink-0 font-medium', c.balanceAfter < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]')}>
                    {t('fix.before_after', { before: formatMoneyFull(c.balanceBefore), after: formatMoneyFull(c.balanceAfter) })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {blocked && <p className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[12.5px] font-medium text-[var(--color-danger)]">{t('fix.negative', { names: preview.negative.map((c) => c.name).join(', ') })}</p>}
        </>
      )}

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('fix.note_label')}</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('fix.note_ph')} className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]" />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('fix.password_label')}</label>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[13px] outline-none focus:border-[var(--color-primary)]" />
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--color-danger)]">{error}</p>}
      <Button variant="danger" className="w-full" loading={busy} disabled={!canSubmit} onClick={submit}>
        <Trash2 size={15} /> {t('fix.confirm')}
      </Button>
    </div>
  )
}
