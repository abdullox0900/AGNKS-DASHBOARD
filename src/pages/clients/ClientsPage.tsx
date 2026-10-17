import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { ErrorState } from '@/shared/ui/ErrorState'
import { NewBadge } from '@/shared/ui/NewBadge'
import { Skeleton } from '@/shared/ui/Skeleton'
import { apiClientsPage, apiClientsStats, type ClientsFilter, type ClientsSort } from '@/shared/api/client'
import { formatDateTime, formatSeen } from '@/shared/lib/dates'
import { formatMoneyFull, formatNumber } from '@/shared/lib/format'
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

/**
 * "Mijozlar": numbers on top (everyone / opened the app lately / opens it often — tap one to filter),
 * then a plain Notion-like list, 40 per page.
 */
export function ClientsPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const canOpen = usePermission('clients.detail') // root_admin only watches the list
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [sort, setSort] = useState<ClientsSort>('balance')
  const [filter, setFilter] = useState<ClientsFilter | undefined>(undefined)
  const [page, setPage] = useState(1)

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
  const words = { today: t('clients.today'), yesterday: t('clients.yesterday') }
  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0
  const to = data ? (data.page - 1) * data.pageSize + rows.length : 0

  function pick<T>(setter: (v: T) => void, v: T) {
    setter(v)
    setPage(1)
  }

  const tiles: { key: ClientsFilter | undefined; label: string; value: number | undefined; hint: string }[] = [
    { key: undefined, label: t('clients.stat_total'), value: stats?.total, hint: stats ? t('clients.stat_today', { n: stats.today }) : '' },
    { key: 'recent', label: t('clients.stat_recent'), value: stats?.recent, hint: stats ? t('clients.stat_recent_hint', { n: stats.recentDays }) : '' },
    { key: 'frequent', label: t('clients.stat_frequent'), value: stats?.frequent, hint: stats ? t('clients.stat_frequent_hint', { n: stats.frequentMinDays, d: stats.frequentWindowDays }) : '' },
  ]

  return (
    <div className="w-full">
      <div>
        <h2 className="flex items-center gap-2 text-[26px] font-bold tracking-tight text-[var(--color-ink)]">
          {t('nav.clients')} <NewBadge since="2026-10-17" />
        </h2>
        <p className="mt-1 text-[13px] text-[var(--color-ink-tertiary)]">{t('clients.subtitle')}</p>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
        {tiles.map((tile) => (
          <button
            key={tile.key ?? 'all'}
            type="button"
            onClick={() => pick(setFilter, tile.key)}
            className={cn(
              'rounded-xl border px-4 py-3 text-left transition-colors',
              filter === tile.key ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]',
            )}
          >
            <p className="text-[12px] font-medium text-[var(--color-ink-secondary)]">{tile.label}</p>
            <p className="tnum mt-0.5 text-[26px] font-bold leading-tight text-[var(--color-ink)]">{tile.value === undefined ? <Skeleton className="mt-1 h-7 w-16" /> : formatNumber(tile.value)}</p>
            <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-tertiary)]">{tile.hint || ' '}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          placeholder={t('clients.search')}
          className="h-10 w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
        <div className="inline-flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => pick(setSort, s.key)}
              className={cn('rounded-md px-3 py-1.5 text-[12.5px] font-medium', sort === s.key ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)]')}
            >
              {t(s.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {error ? (
          <ErrorState message={t('common.load_failed')} onRetry={() => mutate()} />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-[var(--color-ink-tertiary)]">{t('clients.empty')}</p>
        ) : (
          <>
            <div className="flex items-center gap-4 border-b border-[var(--color-border)] px-2 pb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-tertiary)]">
              <span className="min-w-0 flex-1">{t('common.name')}</span>
              <span className="hidden w-[150px] shrink-0 md:block">{t('common.phone')}</span>
              <span className="w-[120px] shrink-0 text-right">{t('clients.balance')}</span>
              <span className="hidden w-[130px] shrink-0 lg:block">{t('clients.last_seen')}</span>
              <span className="hidden w-[70px] shrink-0 text-right xl:block" title={t('clients.days_hint')}>
                {t('clients.days')}
              </span>
              <span className="hidden w-[110px] shrink-0 xl:block">{t('clients.registered')}</span>
              <span className="w-[104px] shrink-0">{t('common.status')}</span>
              {canOpen && <span className="w-4 shrink-0" />}
            </div>
            <ul className={cn(isLoading && 'opacity-60')}>
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={!canOpen}
                    onClick={() => navigate(`/clients/${r.id}`)}
                    className={cn(
                      'group flex w-full items-center gap-4 rounded-md px-2 py-2.5 text-left outline-none transition-colors',
                      canOpen && 'hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)]',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-[14.5px] font-medium text-[var(--color-ink)]', canOpen && 'group-hover:text-[var(--color-primary)]')}>{r.name || '—'}</span>
                      <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)] md:hidden">{r.phone ? formatPhone(r.phone) : '—'}</span>
                    </span>
                    <span className="tnum hidden w-[150px] shrink-0 text-[13px] text-[var(--color-ink-secondary)] md:block">{r.phone ? formatPhone(r.phone) : '—'}</span>
                    <span className="tnum w-[120px] shrink-0 text-right text-[13.5px] font-medium text-[var(--color-ink)]">{formatMoneyFull(r.balance)}</span>
                    <span className="hidden w-[130px] shrink-0 text-[12.5px] text-[var(--color-ink-secondary)] lg:block">{r.lastSeenAt ? formatSeen(r.lastSeenAt, words) : '—'}</span>
                    <span className="tnum hidden w-[70px] shrink-0 text-right text-[13px] text-[var(--color-ink-secondary)] xl:block">{r.activeDays > 0 ? r.activeDays : '—'}</span>
                    <span className="tnum hidden w-[110px] shrink-0 text-[12.5px] text-[var(--color-ink-tertiary)] xl:block">{formatDateTime(r.registeredAt)}</span>
                    <span className="w-[104px] shrink-0">
                      <Badge tone={r.blocked ? 'danger' : 'success'}>{r.blocked ? t('common.blocked') : t('common.active')}</Badge>
                    </span>
                    {canOpen && <ChevronRight size={15} className="w-4 shrink-0 text-[var(--color-ink-tertiary)]" />}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {data && data.total > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
            <p className="tnum text-[12.5px] text-[var(--color-ink-tertiary)]">{t('clients.range', { from, to, total: data.total })}</p>
            {data.pages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} aria-label={t('clients.prev')}>
                  <ChevronLeft size={15} />
                </Button>
                {pageWindow(data.page, data.pages).map((p, i) =>
                  p === '…' ? (
                    <span key={`gap-${i}`} className="px-1 text-[var(--color-ink-tertiary)]">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={cn(
                        'tnum h-8 min-w-8 rounded-md px-2 text-[13px] font-medium',
                        p === data.page ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]',
                      )}
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
        )}
      </div>
    </div>
  )
}
