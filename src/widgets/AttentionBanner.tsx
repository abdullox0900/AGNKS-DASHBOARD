import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight, Clock, TriangleAlert, XCircle } from 'lucide-react'
import { useAlerts } from '@/shared/api/hooks'
import type { AlertItem, Filter } from '@/shared/api/client'
import { formatMoneyFull } from '@/shared/lib/format'
import { useI18n } from '@/app/providers/I18nProvider'

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = { clock: Clock, alert: AlertTriangle, x: XCircle }

/** Shown only while something needs attention (large receipts, review queue, open disputes) — clicking a chip opens the page. */
export function AttentionBanner({ filters }: { filters: Filter }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data } = useAlerts(filters)
  if (!data || data.items.length === 0) return null

  const text = (item: AlertItem) =>
    item.type === 'review'
      ? t('alert.review', { n: item.count })
      : item.type === 'dispute'
        ? t('alert.dispute', { n: item.count })
        : t('alert.large', { n: item.count, threshold: formatMoneyFull(item.threshold ?? 0) })

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-[color-mix(in_srgb,var(--color-amber)_30%,transparent)] bg-[var(--color-amber-soft)] px-4 py-3">
      <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-amber-strong)]">
        <TriangleAlert size={16} /> {t('attention.title')}
      </span>
      {data.items.map((item, i) => {
        const Icon = ICONS[item.icon] ?? AlertTriangle
        return (
          <button
            key={i}
            onClick={() => navigate(item.href)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-alt)]"
          >
            <Icon size={13} className="text-[var(--color-amber)]" />
            {text(item)}
            <ChevronRight size={13} className="text-[var(--color-ink-tertiary)]" />
          </button>
        )
      })}
    </div>
  )
}
