import type { ReactNode } from 'react'

export function EmptyState({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      {icon && <div className="text-[var(--color-ink-tertiary)]">{icon}</div>}
      <p className="max-w-[280px] text-[14px] text-[var(--color-ink-secondary)]">{title}</p>
      {action}
    </div>
  )
}
