import type { ReactNode } from 'react'

/** Page heading: big title, one quiet line under it, actions on the right. */
export function PageTitle({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-[28px] font-bold tracking-tight text-[var(--color-ink)]">{title}</h1>
        {sub && <p className="mt-0.5 text-[13.5px] text-[var(--color-ink-tertiary)]">{sub}</p>}
      </div>
      {right}
    </div>
  )
}
