import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors',
        active ? 'bg-[var(--color-ink)] text-[var(--color-bg)]' : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)]',
      )}
    >
      {children}
    </button>
  )
}
