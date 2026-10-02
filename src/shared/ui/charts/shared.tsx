import type { ReactNode } from 'react'
import { useI18n } from '@/app/providers/I18nProvider'

export const CHART_PALETTE = ['var(--chart-1)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-6)']

export const axisTick = { fill: 'var(--color-ink-tertiary)', fontSize: 11 }

interface TipItem {
  name?: string | number
  value?: number | string
  dataKey?: string | number
  color?: string
  payload?: Record<string, unknown>
}

export interface TipProps {
  active?: boolean
  payload?: ReadonlyArray<TipItem>
  label?: string | number
}

/** Floating tooltip card shared by every chart. */
export function ChartTooltip({
  active,
  payload,
  label,
  title,
  format,
}: TipProps & {
  /** overrides the x label (e.g. a full date) */
  title?: (label: string | number, item: TipItem) => ReactNode
  format?: (value: number, item: TipItem) => ReactNode
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      className="min-w-[140px] rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-[12.5px]"
      style={{ boxShadow: 'var(--shadow-popover)' }}
    >
      <p className="mb-1.5 font-semibold text-[var(--color-ink)]">{title ? title(label ?? '', payload[0]) : label}</p>
      <div className="space-y-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 text-[var(--color-ink-secondary)]">
              <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="tnum font-semibold text-[var(--color-ink)]">{format ? format(Number(item.value), item) : item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Compact axis numbers: 1 500 000 → "1.5 mln", 12 000 → "12 ming". */
export function useAxisFormat() {
  const { t } = useI18n()
  const trim = (n: number) => String(Math.round(n * 10) / 10)
  return (v: number) => {
    const a = Math.abs(v)
    // non-breaking space: recharts wraps axis labels at plain spaces
    if (a >= 1_000_000_000) return `${trim(v / 1_000_000_000)}\u00A0${t('common.mlrd')}`
    if (a >= 1_000_000) return `${trim(v / 1_000_000)}\u00A0${t('common.mln')}`
    if (a >= 1_000) return `${trim(v / 1_000)}\u00A0${t('common.k')}`
    return String(v)
  }
}

export const gridProps = { vertical: false, stroke: 'var(--color-border)', strokeDasharray: '3 6' } as const
