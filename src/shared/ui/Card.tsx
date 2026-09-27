import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <div
      className={cn('rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]', padded && 'p-5', className)}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {children}
    </div>
  )
}
