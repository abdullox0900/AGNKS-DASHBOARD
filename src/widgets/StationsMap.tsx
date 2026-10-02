import { useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { useStations } from '@/shared/api/hooks'
import { apiAnalyticsStations } from '@/shared/api/analytics'
import type { Filter } from '@/shared/api/client'
import { FERGANA_CLIP, FERGANA_DISTRICTS, FERGANA_OUTLINE, FERGANA_ROADS, FERGANA_SIZE, projectFergana } from '@/shared/geo/fergana'
import { hasCoords, mapUrl } from '@/shared/lib/coords'
import { formatMoneyShort, formatNumber } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const PAD = 40
const pctX = (x: number) => ((x + PAD) / (FERGANA_SIZE.width + PAD * 2)) * 100
const pctY = (y: number) => ((y + PAD) / (FERGANA_SIZE.height + PAD * 2)) * 100

/** Line map of Farg'ona region with every station that has coordinates pinned on it. */
export function StationsMap({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const { data: stations, isLoading } = useStations()
  const { data: stats } = useSWR(
    ['station-map', filters.from.toISOString(), filters.to.toISOString()],
    () => apiAnalyticsStations({ stationIds: null, from: filters.from, to: filters.to }),
    { keepPreviousData: true },
  )
  const [active, setActive] = useState<string | null>(null)
  const [roads, setRoads] = useState(false)

  const points = (stations ?? [])
    .filter(hasCoords)
    .map((s, i) => ({ s, n: i + 1, ...projectFergana(s.lat, s.lng) }))
  const statById = new Map((stats ?? []).map((r) => [r.stationId, r]))
  const current = points.find((p) => p.s.id === active)

  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('map.title')}</h3>
          <p className="text-[12px] text-[var(--color-ink-tertiary)]">{t('map.subtitle')}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={roads}
          onClick={() => setRoads((v) => !v)}
          className="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1 text-[12.5px] text-[var(--color-ink-secondary)] outline-none transition-colors hover:text-[var(--color-ink)] focus-visible:bg-[var(--color-surface-alt)]"
        >
          {t('map.roads')}
          <span className={cn('relative h-5 w-9 rounded-full transition-colors duration-200', roads ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border-strong)]')}>
            <span className={cn('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-[var(--color-surface)] transition-transform duration-200', roads && 'translate-x-4')} />
          </span>
        </button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[360px] w-full" />
      ) : points.length === 0 ? (
        <EmptyState title={t('map.empty')} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative">
            <svg
              viewBox={`${-PAD} ${-PAD} ${FERGANA_SIZE.width + PAD * 2} ${FERGANA_SIZE.height + PAD * 2}`}
              className="h-auto w-full"
              role="img"
              aria-label={t('map.title')}
            >
              <path d={FERGANA_DISTRICTS} fill="none" stroke="var(--color-border-strong)" strokeWidth={1.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <defs>
                <clipPath id="fergana-clip">
                  <path d={FERGANA_CLIP} />
                </clipPath>
              </defs>
              <g clipPath="url(#fergana-clip)">
              {FERGANA_ROADS.map((r, i) => (
                <path
                  key={i}
                  d={r.d}
                  pathLength={1}
                  fill="none"
                  stroke="var(--chart-3)"
                  strokeWidth={r.main ? 4 : 2.5}
                  strokeLinecap="butt"
                  strokeLinejoin="round"
                  strokeOpacity={r.main ? 0.95 : 0.7}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: roads ? 0 : 1.01,
                    visibility: roads ? 'visible' : 'hidden',
                    transition: `stroke-dashoffset ${roads ? 1800 : 600}ms cubic-bezier(.4,0,.2,1) ${roads ? i * 70 : 0}ms, visibility 0s linear ${roads ? 0 : 600}ms`,
                  }}
                />
              ))}
              </g>
              <path d={FERGANA_OUTLINE} fill="none" stroke="var(--color-primary)" strokeOpacity={0.85} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

            </svg>

            {points.map(({ s, n, x, y }) => {
              const on = s.id === active
              const idle = s.status !== 'active'
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-label={s.name}
                  onMouseEnter={() => setActive(s.id)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(s.id)}
                  onBlur={() => setActive(null)}
                  onClick={() => window.open(mapUrl(s.lat, s.lng), '_blank', 'noreferrer')}
                  className={cn(
                    'absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--color-surface)] font-mono text-[11px] font-bold outline-none transition-transform duration-200',
                    idle ? 'bg-[var(--color-surface-alt)] text-[var(--color-ink-tertiary)]' : 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]',
                    on && 'z-20 scale-125',
                  )}
                  style={{
                    left: `${pctX(x)}%`,
                    top: `${pctY(y)}%`,
                    boxShadow: idle ? undefined : `0 0 0 ${on ? 8 : 5}px color-mix(in srgb, var(--color-primary) 18%, transparent)`,
                  }}
                >
                  {n}
                </button>
              )
            })}

            {current && (
              <div
                className="pointer-events-none absolute z-10 w-[220px] -translate-x-1/2 -translate-y-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-[12px]"
                style={{
                  left: `${pctX(current.x)}%`,
                  top: `calc(${pctY(current.y)}% - 22px)`,
                  boxShadow: 'var(--shadow-popover)',
                }}
              >
                <p className="font-semibold text-[var(--color-ink)]">{current.s.name}</p>
                <p className="mt-0.5 text-[var(--color-ink-tertiary)]">{current.s.address}</p>
                <p className="mt-1.5 font-mono text-[var(--color-ink-secondary)]">
                  {formatMoneyShort(statById.get(current.s.id)?.sum ?? 0)} · {t('chart.receipts_n', { n: formatNumber(statById.get(current.s.id)?.count ?? 0) })}
                </p>
              </div>
            )}
          </div>

          <ol className="space-y-1 self-start">
            {points.map(({ s, n }) => (
              <li key={s.id}>
                <a
                  href={mapUrl(s.lat, s.lng)}
                  target="_blank"
                  rel="noreferrer"
                  onMouseEnter={() => setActive(s.id)}
                  onMouseLeave={() => setActive(null)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-2.5 py-2 outline-none transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)]',
                    active === s.id && 'bg-[var(--color-surface-alt)]',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold',
                      s.status === 'active' ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-ink-tertiary)]',
                    )}
                  >
                    {n}
                  </span>
                  <span className="min-w-0 line-clamp-2 text-[13px] leading-snug text-[var(--color-ink)]" title={s.name}>
                    {s.name}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  )
}
