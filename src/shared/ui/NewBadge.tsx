import { useState } from 'react'
import { isFresh } from '@/shared/lib/fresh'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

/**
 * "Yangi" pill for something that just shipped. Pass the release date; the badge disappears on its own after
 * NEW_BADGE_DAYS (3) — nothing to remove later. Use it on a menu item, a card title, a tab…
 *   <NewBadge since="2026-10-12" />
 * `dot` renders just a small dot (for the collapsed sidebar).
 */
export function NewBadge({ since, dot, className }: { since: string; dot?: boolean; className?: string }) {
  const { t } = useI18n()
  const [now] = useState(() => Date.now())
  if (!isFresh(since, now)) return null
  if (dot) {
    return <span aria-label={t('common.new')} className={cn('absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-lime)] ring-2 ring-[var(--color-surface)]', className)} />
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full bg-[var(--color-lime)]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-[var(--color-lime)]',
        className,
      )}
    >
      {t('common.new')}
    </span>
  )
}
