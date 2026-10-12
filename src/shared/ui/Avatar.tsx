import { cn } from '@/shared/lib/cn'

/** A person's picture, or their first letter on the brand tint when they have none. */
export function Avatar({ src, name, size = 32, className }: { src?: string | null; name?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.42)) }
  if (src) {
    return <img src={src} alt={name ?? ''} style={style} className={cn('shrink-0 rounded-full object-cover', className)} />
  }
  return (
    <div style={style} className={cn('flex shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary)]', className)}>
      {name?.trim()?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}
