import type { CSSProperties } from 'react'
import { cn } from '@/shared/lib/cn'

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-[var(--color-border)]', className)}
      style={{ animationDuration: '1.4s', ...style }}
    />
  )
}
