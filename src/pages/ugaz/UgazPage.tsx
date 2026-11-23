import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useSWR from 'swr'
import { Fuel, Sigma, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Chip } from '@/shared/ui/Chip'
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable'
import { Delta } from '@/shared/ui/Delta'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { ErrorState } from '@/shared/ui/ErrorState'
import { Hint } from '@/shared/ui/Menu'
import { PageTitle } from '@/shared/ui/PageTitle'
import { Skeleton } from '@/shared/ui/Skeleton'
import { MultiLineChart, TrendChart } from '@/shared/ui/charts/lazy'
import { DateNav } from '@/features/faceid/ui'
import { addDays, dayLabel, daysInMonth, todayStr } from '@/features/faceid/mock'
import { apiUgazAllTime, apiUgazDaily, apiUgazStats, apiUgazStatus, apiUgazSummary, type UgazNums, type UgazPeriod, type UgazSummaryRow } from '@/shared/api/ugaz'
import { ApiError, apiErrorMessage } from '@/shared/api/errors'
import { formatMonthYear } from '@/shared/lib/dates'
import { formatNumber } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import { dictionaries, translate, type DictKey } from '@/shared/config/dictionaries'
import { getLocale } from '@/shared/config/uiStore'

type Metric = 'vol' | 'sum' | 'ops'
/** what the station boxes add up: the chosen day, its month, its year, or everything since the start */
type Scope = UgazPeriod | 'all'
type T = ReturnType<typeof useI18n>['t']

const card = 'dt-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]'
const SWR_OPTS = { revalidateOnFocus: false, shouldRetryOnError: false } as const
/** one colour per report row (1–7) */
const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-4)', '#fb923c']
const DASH = '—'

/** m³ without the fraction — the uGaz app drops it rather than rounding */
const fmtVol = (v: number) => formatNumber(Math.floor(v))
/**
 * so'm with the unit picked by size, three significant digits:
 * 850 → "850", 950 000 → "950 ming", 7 142 936 → "7.14 mln", 289 959 625 → "290 mln", 7 194 000 000 → "7.19 mlrd", 1.2e12 → "1.2 trln".
 */
function sumParts(sum: number): { num: string; scale: string } {
  const abs = Math.abs(sum)
  const steps = [
    [1e12, 'common.trln'],
    [1e9, 'common.mlrd'],
    [1e6, 'common.mln'],
    [1e3, 'common.k'],
  ] as const
  for (const [size, key] of steps) {
    // 999.6 mln would round to "1000 mln" — the next unit takes it instead
    if (abs >= size * 0.9995) {
      const v = sum / size
      const digits = Math.abs(v) >= 99.95 ? 0 : Math.abs(v) >= 9.995 ? 1 : 2
      const fixed = v.toFixed(digits)
      return { num: digits ? fixed.replace(/\.?0+$/, '') : fixed, scale: translate(getLocale(), key) }
    }
  }
  return { num: formatNumber(sum), scale: '' }
}
/** "7.19 mlrd" — for table cells whose header already says so'm */
const fmtSumShort = (sum: number) => {
  const { num, scale } = sumParts(sum)
  return scale ? `${num} ${scale}` : num
}
/** the unit that goes after the number: "mlrd so'm" */
const sumUnit = (sum: number) => `${sumParts(sum).scale} ${translate(getLocale(), 'common.sum_unit')}`.trim()
/** "7.19 mlrd so'm" */
const fmtSum = (sum: number) => `${sumParts(sum).num} ${sumUnit(sum)}`
const METRICS: Record<Metric, { label: DictKey; value: (n: UgazNums) => number; text: (v: number, t: T) => string }> = {
  vol: { label: 'ugaz.m_vol', value: (n) => Math.floor(n.vol), text: (v, t) => `${formatNumber(v)} ${t('ugaz.m3')}` },
  sum: { label: 'ugaz.m_sum', value: (n) => n.sum, text: (v) => fmtSum(v) },
  ops: { label: 'ugaz.m_ops', value: (n) => n.ops, text: (v) => formatNumber(v) },
}

function errorText(err: unknown, t: T): string {
  if (!(err instanceof ApiError)) return t('common.error_generic')
  const key = `ugaz.err_${String(err.details?.reason ?? '')}`
  return err.code === 'UGAZ_UNAVAILABLE' && key in dictionaries.uz ? t(key as DictKey) : apiErrorMessage(err)
}

/** Small segmented switch. */
function Seg<V extends string>({ value, onChange, options }: { value: V; onChange: (v: V) => void; options: { value: V; label: string }[] }) {
  return (
    <div className="flex shrink-0 rounded-lg border border-[var(--color-border)] p-0.5 text-[12.5px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-2.5 py-1 font-medium transition-colors',
            o.value === value ? 'bg-[var(--color-surface-alt)] text-[var(--color-ink)]' : 'text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-secondary)]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function CardHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-[16px] font-semibold text-[var(--color-ink)]">{title}</h3>
        {sub && <p className="mt-0.5 text-[13px] text-[var(--color-ink-tertiary)]">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/** One station (or the total) as a small borderless tile; only the gradient tint tells the stations apart. */
function StationBox({ icon: Icon, color, name, nums, share, selected, onClick }: { icon: LucideIcon; color: string; name: string; nums?: UgazNums | null; share?: number; selected?: boolean; onClick?: () => void }) {
  const { t } = useI18n()
  const Tag = onClick ? 'button' : 'div'
  const chip = 'bg-[color-mix(in_srgb,var(--color-ink)_10%,transparent)] text-[var(--color-ink)]'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!selected : undefined}
      className={cn('block w-full min-w-0 rounded-xl p-3 text-left', onClick && 'transition-[filter] hover:brightness-110')}
      style={{ background: `linear-gradient(150deg, color-mix(in srgb, ${color} ${selected ? 42 : 24}%, var(--color-surface)), var(--color-surface) 85%)` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', chip)}>
          <Icon size={15} />
        </span>
        {share !== undefined && nums && (
          <span className={cn('rounded-full px-1.5 py-0.5 font-mono text-[11px] font-semibold', chip)} title={t('ugaz.share')}>
            {Math.round(share * 100)}%
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-[12.5px] font-semibold text-[var(--color-ink)]" title={name}>
        {name}
      </p>
      {nums === undefined ? (
        <Skeleton className="mt-1.5 h-[58px] w-full" />
      ) : nums === null ? (
        <p className="mt-1.5 h-[58px] font-mono text-[19px] font-bold text-[var(--color-ink-tertiary)]" title={t('ugaz.no_data')}>
          {DASH}
        </p>
      ) : (
        <>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1 font-mono text-[17px] font-bold leading-tight tracking-tight text-[var(--color-ink)]">
            <span className="whitespace-nowrap">{fmtVol(nums.vol)}</span>
            <span className="font-sans text-[11px] font-medium tracking-normal text-[var(--color-ink-tertiary)]">{t('ugaz.m3')}</span>
          </p>
          <p className="mt-2 truncate text-[11.5px] text-[var(--color-ink-tertiary)]">
            <span className="font-mono font-semibold text-[var(--color-ink-secondary)]">{sumParts(nums.sum).num}</span> {sumUnit(nums.sum)}
          </p>
          <p className="truncate text-[11.5px] text-[var(--color-ink-tertiary)]">
            <span className="font-mono font-semibold text-[var(--color-ink-secondary)]">{formatNumber(nums.ops)}</span> {t('ugaz.cars')}
          </p>
        </>
      )}
    </Tag>
  )
}

/** One period (day / month / year): volume is the headline, revenue and cars sit under it. */
function PeriodCard({ label, sub, nums, before, live, perCar }: { label: string; sub: string; nums?: UgazNums; before?: UgazNums; live?: boolean; perCar?: boolean }) {
  const { t } = useI18n()
  return (
    <section className={cn(card, 'px-6 py-5')}>
      <p className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-tertiary)]">
        {label}
        <span className="font-medium normal-case tracking-normal">· {sub}</span>
        {live && (
          <Hint label={t('ugaz.live_hint')}>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-[var(--color-success)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              {t('ugaz.live')}
            </span>
          </Hint>
        )}
      </p>
      {!nums ? (
        <Skeleton className="mt-2 h-[86px] w-full" />
      ) : (
        <>
          <p className="mt-2 flex items-baseline gap-2 font-mono text-[30px] font-bold leading-none tracking-tight text-[var(--color-ink)]">
            {fmtVol(nums.vol)}
            <span className="font-sans text-[14px] font-medium tracking-normal text-[var(--color-ink-tertiary)]">{t('ugaz.m3')}</span>
            {before && <Delta now={Math.floor(nums.vol)} before={Math.floor(before.vol)} className="ml-1 !text-[12.5px]" />}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-3">
            <div>
              <p className="font-mono text-[18px] font-bold text-[var(--color-ink)]">{sumParts(nums.sum).num}</p>
              <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">{sumUnit(nums.sum)}</p>
            </div>
            <div>
              <p className="font-mono text-[18px] font-bold text-[var(--color-ink)]">{formatNumber(nums.ops)}</p>
              <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">{t('ugaz.cars')}</p>
            </div>
          </div>
          {perCar && nums.ops > 0 && <p className="mt-2.5 text-[12.5px] text-[var(--color-ink-tertiary)]">{t('ugaz.per_car', { v: (nums.vol / nums.ops).toFixed(1) })}</p>}
        </>
      )}
    </section>
  )
}

/** "uGaz": sales of the 7 stations as the uGaz business app reports them — day, month, year, dynamics, dispensers. */
export function UgazPage() {
  const { t, locale } = useI18n()
  const [params, setParams] = useSearchParams()
  const today = todayStr()
  const yesterday = addDays(today, -1)
  const raw = params.get('d')
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw <= today ? raw : yesterday
  const live = date === today
  const setDate = (d: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p)
      if (d === yesterday) next.delete('d')
      else next.set('d', d > today ? today : d)
      return next
    })

  const [metric, setMetric] = useState<Metric>('vol')
  const [chartMode, setChartMode] = useState<'stations' | 'total'>('stations')
  const [hover, setHover] = useState<number | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [dispPeriod, setDispPeriod] = useState<UgazPeriod>('day')
  const [scope, setScope] = useState<Scope>('month')

  const [y, m] = date.split('-').map(Number)
  const monthFrom = `${date.slice(0, 8)}01`
  const monthEnd = `${date.slice(0, 8)}${String(daysInMonth(y, m)).padStart(2, '0')}`
  const monthTo = monthEnd < today ? monthEnd : today
  const refresh = (lastDay: string) => ({ ...SWR_OPTS, refreshInterval: lastDay >= today ? 120_000 : 0 })

  const status = useSWR('ugaz:status', apiUgazStatus, SWR_OPTS)
  const on = status.data?.configured === true
  const summary = useSWR(on ? ['ugaz:summary', date] : null, () => apiUgazSummary(date), refresh(date))
  const prev = useSWR(on ? ['ugaz:stats', 'day', addDays(date, -1), false] : null, () => apiUgazStats('day', addDays(date, -1), false), SWR_OPTS)
  const daily = useSWR(on ? ['ugaz:daily', monthFrom, monthTo] : null, () => apiUgazDaily(monthFrom, monthTo), { ...refresh(monthTo), keepPreviousData: true })
  const allTime = useSWR(on && scope === 'all' ? 'ugaz:alltime' : null, apiUgazAllTime, SWR_OPTS)
  const disp = useSWR(on ? ['ugaz:stats', dispPeriod, date, true] : null, () => apiUgazStats(dispPeriod, date, true), refresh(date))

  const rows = summary.data?.rows ?? []
  const selected = picked ?? rows.find((r) => r.has)?.row ?? null
  const prevBy = useMemo(() => new Map((prev.data?.rows ?? []).filter((r) => r.has).map((r) => [r.row, r])), [prev.data])
  const warnings = [...new Set([...(summary.data?.warnings ?? []), ...(daily.data?.warnings ?? []), ...(disp.data?.warnings ?? []), ...(allTime.data?.warnings ?? [])])]
  const error = status.error ?? summary.error ?? daily.error ?? disp.error ?? allTime.error
  const retry = () => void Promise.all([status.mutate(), summary.mutate(), prev.mutate(), daily.mutate(), disp.mutate(), allTime.mutate()])
  const mx = METRICS[metric]
  const monthName = formatMonthYear(new Date(`${date}T12:00:00+05:00`))

  const chart = useMemo(() => {
    const d = daily.data
    if (!d) return null
    const series = d.rows.filter((r) => r.has).map((r) => ({ key: `r${r.row}`, name: r.name, color: COLORS[(r.row - 1) % COLORS.length], row: r.row }))
    const byRow = d.rows.map((r) => ({ key: `r${r.row}`, days: new Map(r.days.map((x) => [x.date, x])) }))
    const points = d.total.map((tot) => {
      const point: Record<string, string | number> = { label: String(Number(tot.date.slice(8))), title: dayLabel(tot.date, locale), total: mx.value(tot) }
      for (const r of byRow) {
        const day = r.days.get(tot.date)
        if (day) point[r.key] = mx.value(day)
      }
      return point
    })
    return { series, points }
  }, [daily.data, mx, locale])

  const columns: DataTableColumn<UgazSummaryRow>[] = useMemo(() => {
    const num = (id: string, header: DictKey, get: (r: UgazSummaryRow) => number, fmt: (v: number) => string): DataTableColumn<UgazSummaryRow> => ({
      id,
      header,
      numeric: true,
      accessor: (r) => (r.has ? get(r) : -1),
      cell: (r) => (r.has ? fmt(get(r)) : <span className="text-[var(--color-ink-tertiary)]">{DASH}</span>),
    })
    return [
      {
        id: 'name',
        header: 'ugaz.c_station',
        accessor: (r) => r.name,
        cell: (r) => (
          <span className={cn('flex items-center gap-2 font-medium', !r.has && 'text-[var(--color-ink-tertiary)]')} title={r.has ? undefined : t('ugaz.no_data')}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[(r.row - 1) % COLORS.length] }} />
            {r.name}
          </span>
        ),
      },
      num('dayVol', 'ugaz.c_day_vol', (r) => r.day.vol, fmtVol),
      num('daySum', 'ugaz.c_day_sum', (r) => r.day.sum, fmtSumShort),
      num('dayOps', 'ugaz.c_day_ops', (r) => r.day.ops, formatNumber),
      {
        id: 'delta',
        header: 'ugaz.c_delta',
        numeric: true,
        accessor: (r) => {
          const b = prevBy.get(r.row)
          return r.has && b && b.vol > 0 ? (r.day.vol - b.vol) / b.vol : 0
        },
        cell: (r) => {
          const b = prevBy.get(r.row)
          return r.has && b ? <Delta now={Math.floor(r.day.vol)} before={Math.floor(b.vol)} /> : <span className="text-[var(--color-ink-tertiary)]">{DASH}</span>
        },
      },
      num('monthVol', 'ugaz.c_month_vol', (r) => r.month.vol, fmtVol),
      num('monthSum', 'ugaz.c_month_sum', (r) => r.month.sum, fmtSumShort),
      num('monthOps', 'ugaz.c_month_ops', (r) => r.month.ops, formatNumber),
      num('yearVol', 'ugaz.c_year_vol', (r) => r.year.vol, fmtVol),
    ]
  }, [prevBy, t])

  const total = summary.data?.total
  const footer = total && {
    name: <span className="font-semibold">{t('ugaz.total')}</span>,
    dayVol: fmtVol(total.day.vol),
    daySum: fmtSumShort(total.day.sum),
    dayOps: formatNumber(total.day.ops),
    delta: prev.data ? <Delta now={Math.floor(total.day.vol)} before={Math.floor(prev.data.total.vol)} /> : null,
    monthVol: fmtVol(total.month.vol),
    monthSum: fmtSumShort(total.month.sum),
    monthOps: formatNumber(total.month.ops),
    yearVol: fmtVol(total.year.vol),
  }

  // the station boxes and the shares follow one period switch
  const scoped: { rows: { row: number; name: string; nums: UgazNums | null }[]; total: UgazNums } | undefined =
    scope === 'all'
      ? allTime.data && { rows: allTime.data.rows.map((r) => ({ row: r.row, name: r.name, nums: r.has ? r : null })), total: allTime.data.total }
      : summary.data && { rows: rows.map((r) => ({ row: r.row, name: r.name, nums: r.has ? r[scope] : null })), total: summary.data.total[scope] }
  const scopeLabel = scope === 'day' ? dayLabel(date, locale) : scope === 'month' ? monthName : scope === 'year' ? String(y) : allTime.data ? t('ugaz.since', { y: allTime.data.from }) : t('ugaz.p_all')
  const shareOf = (v: number) => (scoped && scoped.total.vol > 0 ? v / scoped.total.vol : 0)
  const shareRows = (scoped?.rows ?? []).flatMap((r) => (r.nums ? [{ row: r.row, name: r.name, vol: r.nums.vol }] : [])).sort((a, b) => b.vol - a.vol)

  const dispRow = disp.data?.rows.find((r) => r.row === selected)
  const dispMax = Math.max(1, ...(dispRow?.stations ?? []).flatMap((s) => (s.dispensers ?? []).map((d) => d.vol)))
  const periodOptions = (['day', 'month', 'year'] as const).map((p) => ({ value: p, label: t(`ugaz.p_${p}`) }))

  const head = (
    <PageTitle
      title="uGaz"
      sub={t('ugaz.subtitle')}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={date === yesterday} onClick={() => setDate(yesterday)}>
            {t('ugaz.yesterday')}
          </Chip>
          <Chip active={live} onClick={() => setDate(today)}>
            {t('fid.today')}
          </Chip>
          <DateNav date={date} onChange={setDate} />
        </div>
      }
    />
  )

  if (status.data?.configured === false) {
    return (
      <div>
        {head}
        <section className={cn(card, 'flex items-start gap-3 p-5 text-[14px] text-[var(--color-ink-secondary)]')}>
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[var(--color-warning-ink)]" />
          {t('ugaz.not_configured')}
        </section>
      </div>
    )
  }

  return (
    <div>
      {head}

      {error && (
        <section className={cn(card, 'mb-5')}>
          <ErrorState message={errorText(error, t)} onRetry={retry} />
        </section>
      )}
      {warnings.length > 0 && (
        <section role="status" className="mb-5 flex items-start gap-3 rounded-2xl bg-[var(--color-warning-soft)] px-5 py-3.5 text-[13.5px] text-[var(--color-warning-ink)]">
          <TriangleAlert size={17} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{t('ugaz.warn_title')}</p>
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <PeriodCard label={t('ugaz.p_day')} sub={dayLabel(date, locale)} nums={total?.day} before={prev.data?.total} live={live} perCar />
        <PeriodCard label={t('ugaz.p_month')} sub={monthName} nums={total?.month} />
        <PeriodCard label={t('ugaz.p_year')} sub={String(y)} nums={total?.year} />
      </div>

      <section className="mt-6">
        <CardHead
          title={t('ugaz.boxes_title')}
          sub={scopeLabel}
          right={<Seg value={scope} onChange={setScope} options={(['day', 'month', 'year', 'all'] as const).map((p) => ({ value: p, label: t(`ugaz.p_${p}`) }))} />}
        />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {(scoped?.rows ?? rows.map((r) => ({ row: r.row, name: r.name, nums: undefined }))).map((r) => (
            <StationBox
              key={r.row}
              icon={Fuel}
              color={COLORS[(r.row - 1) % COLORS.length]}
              name={r.name}
              nums={r.nums}
              share={r.nums ? shareOf(r.nums.vol) : undefined}
              selected={r.row === selected}
              onClick={() => setPicked(r.row)}
            />
          ))}
          {!scoped && rows.length === 0 && Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-[136px] w-full rounded-xl" />)}
          <StationBox icon={Sigma} color="var(--color-primary)" name={t('ugaz.total')} nums={scoped?.total} />
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className={cn(card, 'min-w-0 p-5')}>
          <CardHead
            title={t('ugaz.chart_title')}
            sub={`${monthName} · ${t(mx.label)}`}
            right={
              <div className="flex flex-wrap gap-2">
                <Seg
                  value={chartMode}
                  onChange={setChartMode}
                  options={[
                    { value: 'stations', label: t('ugaz.by_station') },
                    { value: 'total', label: t('ugaz.total') },
                  ]}
                />
                <Seg value={metric} onChange={setMetric} options={(['vol', 'sum', 'ops'] as const).map((k) => ({ value: k, label: t(METRICS[k].label) }))} />
              </div>
            }
          />
          <div className="mt-4">
            {!chart ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ErrorBoundary label={t('common.chart_load_failed')}>
                {chartMode === 'total' ? (
                  <TrendChart data={chart.points.map((p) => ({ label: String(p.label), title: String(p.title), value: Number(p.total) }))} seriesName={t('ugaz.total')} format={(v) => mx.text(v, t)} height={300} />
                ) : (
                  <MultiLineChart data={chart.points} series={chart.series} format={(v) => mx.text(v, t)} height={300} dim={hover ? `r${hover}` : null} />
                )}
              </ErrorBoundary>
            )}
          </div>
          {chart && chartMode === 'stations' && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {chart.series.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onMouseEnter={() => setHover(s.row)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(s.row)}
                  onBlur={() => setHover(null)}
                  onClick={() => setPicked(s.row)}
                  className={cn('flex items-center gap-1.5 text-[12.5px] transition-opacity', s.row === selected ? 'font-semibold text-[var(--color-ink)]' : 'text-[var(--color-ink-secondary)]', hover && hover !== s.row && 'opacity-40')}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </button>
              ))}
            </div>
          )}
          {monthTo === today && <p className="mt-3 text-[13px] text-[var(--color-ink-tertiary)]">{t('ugaz.unfinished', { d: dayLabel(today, locale) })}</p>}
        </section>

        <section className={cn(card, 'p-5')}>
          <CardHead title={t('ugaz.share_title')} sub={t('ugaz.share_sub', { p: scopeLabel })} />
          <div className="mt-4 space-y-4">
            {!scoped
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
              : shareRows.map((r) => (
                  <div key={r.row}>
                    <p className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span className="truncate font-semibold text-[var(--color-ink)]">{r.name}</span>
                      <span className="shrink-0 font-mono text-[13px] text-[var(--color-ink-secondary)]">
                        {fmtVol(r.vol)} · {Math.round(shareOf(r.vol) * 100)}%
                      </span>
                    </p>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[var(--color-track)]">
                      <span className="block h-full rounded-full" style={{ width: `${(r.vol / (shareRows[0]?.vol || 1)) * 100}%`, background: COLORS[(r.row - 1) % COLORS.length] }} />
                    </span>
                  </div>
                ))}
          </div>
        </section>
      </div>

      <div className="mt-5">
        <DataTable
          columns={columns}
          data={rows}
          loading={!summary.data && !summary.error}
          getRowId={(r) => String(r.row)}
          selectedId={selected === null ? undefined : String(selected)}
          onRowClick={(r) => setPicked(r.row)}
          footer={footer || undefined}
          index={false}
          title={
            <div>
              <p className="text-[16px] font-semibold text-[var(--color-ink)]">{t('ugaz.table_title')}</p>
              <p className="text-[13px] text-[var(--color-ink-tertiary)]">{t('ugaz.table_sub')}</p>
            </div>
          }
        />
      </div>

      <section className={cn(card, 'mt-5 p-5')}>
        <CardHead
          title={t('ugaz.disp_title')}
          sub={dispRow?.has ? `${fmtVol(dispRow.vol)} ${t('ugaz.m3')} · ${fmtSum(dispRow.sum)} · ${formatNumber(dispRow.ops)} ${t('ugaz.cars')}` : undefined}
          right={
            <div className="flex flex-wrap items-center gap-2">
              {rows.length > 0 && (
                <select
                  aria-label={t('ugaz.c_station')}
                  value={selected ?? ''}
                  onChange={(e) => setPicked(Number(e.target.value))}
                  className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-[13px] font-medium text-[var(--color-ink)]"
                >
                  {rows.map((r) => (
                    <option key={r.row} value={r.row}>
                      {r.row}. {r.name}
                    </option>
                  ))}
                </select>
              )}
              <Seg value={dispPeriod} onChange={setDispPeriod} options={periodOptions} />
            </div>
          }
        />
        <div className="mt-4 space-y-5">
          {!disp.data ? (
            <Skeleton className="h-[120px] w-full" />
          ) : !dispRow?.has ? (
            <p className="py-4 text-center text-[13px] text-[var(--color-ink-tertiary)]">{t('ugaz.no_data')}</p>
          ) : (
            dispRow.stations.map((s) => {
              const list = [...(s.dispensers ?? [])].sort((a, b) => Number(a.number) - Number(b.number))
              return (
                <div key={s.id}>
                  <p className="flex items-baseline justify-between gap-3 text-[12.5px] text-[var(--color-ink-tertiary)]">
                    <span className="truncate font-semibold uppercase tracking-[0.06em]">{s.name}</span>
                    <span className="shrink-0 font-mono">
                      {fmtVol(s.vol)} {t('ugaz.m3')}
                    </span>
                  </p>
                  {list.length === 0 ? (
                    <p className="mt-2 text-[13px] text-[var(--color-ink-tertiary)]">{t('ugaz.disp_empty')}</p>
                  ) : (
                    <div className="mt-2.5 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                      {list.map((d) => (
                        <div key={d.number}>
                          <p className="flex items-baseline justify-between gap-3 text-[13.5px]">
                            <span className="font-semibold text-[var(--color-ink)]">{t('ugaz.disp_n', { n: d.number })}</span>
                            <span className="shrink-0 font-mono text-[13px] text-[var(--color-ink)]">
                              {fmtVol(d.vol)} <span className="text-[var(--color-ink-tertiary)]">{t('ugaz.m3')}</span>
                            </span>
                          </p>
                          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[var(--color-track)]">
                            <span className="block h-full rounded-full" style={{ width: `${(d.vol / dispMax) * 100}%`, background: COLORS[((selected ?? 1) - 1) % COLORS.length] }} />
                          </span>
                          <p className="mt-1 text-[12.5px] text-[var(--color-ink-tertiary)]">
                            {fmtSum(d.sum)} · {formatNumber(d.ops)} {t('ugaz.cars')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
