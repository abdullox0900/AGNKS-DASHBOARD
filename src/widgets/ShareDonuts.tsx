import useSWR from 'swr'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { DonutChart } from '@/shared/ui/charts/lazy'
import { CHART_PALETTE } from '@/shared/ui/charts/shared'
import { apiAnalyticsCashiers, apiAnalyticsStations } from '@/shared/api/analytics'
import type { Filter } from '@/shared/api/client'
import { formatMoneyFull, formatMoneyShort } from '@/shared/lib/format'
import { useI18n } from '@/app/providers/I18nProvider'

interface Item {
  name: string
  value: number
}

const MAX_SLICES = 6
const OTHER_COLOR = 'var(--color-border-strong)'

/** Biggest slices keep their own colour, the rest collapse into one grey "other" slice. */
function toSlices(items: Item[], otherLabel: string) {
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value)
  const head = sorted.slice(0, sorted.length > MAX_SLICES ? MAX_SLICES - 1 : MAX_SLICES)
  const tail = sorted.slice(head.length)
  const slices = head.map((it, i) => ({ ...it, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
  if (tail.length > 0) slices.push({ name: otherLabel, value: tail.reduce((n, it) => n + it.value, 0), color: OTHER_COLOR })
  return slices
}

function ShareCard({ title, subtitle, items, loading }: { title: string; subtitle: string; items: Item[]; loading: boolean }) {
  const { t } = useI18n()
  const slices = toSlices(items, t('donut.other'))
  const total = slices.reduce((n, s) => n + s.value, 0)

  // nothing to share in this period — the neighbouring card simply takes the whole row
  if (!loading && total === 0) return null

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{title}</h3>
        <p className="text-[12px] text-[var(--color-ink-tertiary)]">{subtitle}</p>
      </div>
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="flex flex-1 flex-col items-center gap-6 sm:flex-row">
          <DonutChart
            data={slices}
            format={formatMoneyFull}
            center={
              <>
                <span className="tnum text-[19px] font-bold leading-tight text-[var(--color-ink)]">{formatMoneyShort(total)}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink-tertiary)]">{t('chart.total')}</span>
              </>
            }
          />
          <ul className="w-full min-w-0 flex-1 space-y-2.5">
            {slices.map((s) => (
              <li key={s.name} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-ink)]" title={s.name}>
                  {s.name}
                </span>
                <span className="tnum shrink-0 font-mono text-[12px] text-[var(--color-ink-secondary)]" title={formatMoneyFull(s.value)}>
                  {formatMoneyShort(s.value)}
                </span>
                <span className="tnum w-10 shrink-0 text-right font-mono text-[12px] font-semibold text-[var(--color-ink)]">{Math.round((s.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

const keyOf = (name: string, f: Filter) => [name, f.stationIds?.join(',') ?? 'all', f.from.toISOString(), f.to.toISOString()]

/** Turnover share per station (same request as the ranking, so it is served from the SWR cache). */
export function StationShareDonut({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const { data, isLoading } = useSWR(keyOf('station-rank', filters), () => apiAnalyticsStations(filters), { keepPreviousData: true })
  return <ShareCard title={t('donut.stations_title')} subtitle={t('donut.stations_sub')} items={(data ?? []).map((r) => ({ name: r.name, value: r.sum }))} loading={isLoading} />
}

/** Share of the bonus spent at each cashier. */
export function CashierShareDonut({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const { data, isLoading } = useSWR(keyOf('cashier-share', filters), () => apiAnalyticsCashiers(filters), { keepPreviousData: true })
  return <ShareCard title={t('donut.cashiers_title')} subtitle={t('donut.cashiers_sub')} items={(data ?? []).map((r) => ({ name: r.firstName, value: r.sum }))} loading={isLoading} />
}
