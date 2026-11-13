import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Skeleton } from './Skeleton'

export interface StatItem {
  key: string
  label: ReactNode
  /** undefined while loading */
  value: ReactNode | undefined
  hint?: ReactNode
  tone?: string
  /** makes the cell a filter button */
  onClick?: () => void
  active?: boolean
}

/** One card split into equal cells: UPPERCASE label, big mono number, a quiet line under it. */
export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div
      className="dt-card grid overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] max-lg:!grid-cols-2 max-sm:!grid-cols-1"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      <div className={cn('contents')}>
        {items.map((it, i) => {
          const Tag = it.onClick ? 'button' : 'div'
          return (
            <Tag
              key={it.key}
              type={it.onClick ? 'button' : undefined}
              onClick={it.onClick}
              className={cn(
                'border-[var(--color-border)] px-6 py-5 text-left',
                'max-lg:border-b',
                it.onClick && 'transition-colors hover:bg-[var(--color-surface-alt)]',
                it.active && 'bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary-soft)]',
              )}
              style={{ borderLeftWidth: i > 0 ? 1 : 0 }}
              data-i={i}
            >
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-tertiary)]">{it.label}</p>
              <p className={cn('mt-1.5 font-mono text-[30px] font-bold leading-none tracking-tight', it.tone ?? 'text-[var(--color-ink)]')}>
                {it.value === undefined ? <Skeleton className="h-8 w-28" /> : it.value}
              </p>
              {it.hint !== undefined && <p className="mt-2 text-[13px] text-[var(--color-ink-tertiary)]">{it.hint || ' '}</p>}
            </Tag>
          )
        })}
      </div>
    </div>
  )
}
