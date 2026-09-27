import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-[var(--color-surface-alt)] text-[var(--color-ink-secondary)] border-[var(--color-border)]',
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning-ink)] border-transparent',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent',
  primary: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-transparent',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-medium', toneClasses[tone])}>
      {children}
    </span>
  )
}
