import { cn } from '@/shared/lib/cn'
import { useAlerts } from '@/shared/api/hooks'
import type { Filter } from '@/shared/api/client'
import { useI18n } from '@/app/providers/I18nProvider'

/** "Tizim: normal" chip — turns amber with a count while something needs attention. */
export function SystemStatus({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const { data } = useAlerts(filters)
  const count = data?.items.length ?? 0
  const ok = count === 0

  return (
    <span className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[12.5px] text-[var(--color-ink-secondary)]">
      <span className={cn('h-2 w-2 rounded-full', ok ? 'bg-[var(--color-lime)]' : 'bg-[var(--color-amber)]')} />
      {ok ? t('overview.status_ok') : t('overview.status_attention', { n: count })}
    </span>
  )
}
