import { useI18n } from '@/app/providers/I18nProvider'
import { Hint } from '@/shared/ui/Menu'
import { cn } from '@/shared/lib/cn'

/** "▲ 12.4%" change versus the previous equal-length period; renders nothing when both are zero. */
export function Delta({ now, before, className }: { now: number; before: number | undefined; className?: string }) {
  const { t } = useI18n()
  if (before === undefined) return null
  if (before <= 0) {
    return now > 0 ? <span className={cn('font-mono text-[11.5px] font-semibold text-[var(--color-primary)]', className)}>{t('delta.new')}</span> : null
  }
  const pct = ((now - before) / before) * 100
  const up = pct >= 0
  return (
    <Hint label={t('delta.vs_prev')}>
      <span className={cn('inline-flex items-center gap-0.5 font-mono text-[11.5px] font-semibold', up ? 'text-[var(--color-lime)]' : 'text-[var(--color-danger)]', className)}>
        {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
      </span>
    </Hint>
  )
}
