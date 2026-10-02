import { Sparkles } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useActivePromotions } from '@/shared/api/hooks'
import { formatDateTime } from '@/shared/lib/dates'
import type { Filter } from '@/shared/api/client'
import { useI18n } from '@/app/providers/I18nProvider'

export function ActivePromotions({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const { data, isLoading } = useActivePromotions(filters)

  if (isLoading) return <Skeleton className="h-12 w-full" />
  if (!data || data.length === 0) return null

  return (
    <Card padded={false} className="px-5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-[var(--color-ink)]">{t('promos.active')}</span>
        {data.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-amber-soft)] px-3 py-1 text-[12.5px] font-medium text-[var(--color-amber-strong)]">
            <Sparkles size={12} />
            {p.name} · {p.rateBps / 100}% · {t('promos.until', { when: formatDateTime(p.endsAt) })}
          </span>
        ))}
      </div>
    </Card>
  )
}
