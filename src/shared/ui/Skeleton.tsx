import type { CSSProperties } from 'react'
import LoadingSkeleton from 'react-loading-skeleton'
import { cn } from '@/shared/lib/cn'

/** react-loading-skeleton with the dashboard palette; size/shape still come from Tailwind classes. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <LoadingSkeleton
      containerClassName="block leading-none"
      className={cn('rounded-lg', className)}
      style={style}
      baseColor="var(--color-skeleton-base)"
      highlightColor="var(--color-skeleton-highlight)"
    />
  )
}
