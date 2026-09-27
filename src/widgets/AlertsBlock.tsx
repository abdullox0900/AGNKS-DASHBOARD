import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, XCircle } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useAlerts } from '@/shared/api/hooks'
import type { Filter } from '@/shared/api/client'

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  clock: Clock,
  alert: AlertTriangle,
  x: XCircle,
}

export function AlertsBlock({ filters }: { filters: Filter }) {
  const navigate = useNavigate()
  const { data, isLoading } = useAlerts(filters)

  return (
    <Card>
      <h2 className="mb-3 text-[14px] font-semibold text-[var(--color-ink)]">Diqqat talab qiladi</h2>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-[13px] text-[var(--color-ink-secondary)]">
          <CheckCircle2 size={16} className="text-[var(--color-ink-tertiary)]" />
          Hamma ko'rsatkichlar me'yorda
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {data.items.map((item, i) => {
            const Icon = ICONS[item.icon] ?? AlertTriangle
            return (
              <button
                key={i}
                onClick={() => navigate(item.href)}
                className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-[var(--color-surface-alt)]"
              >
                <Icon size={16} className="shrink-0 text-[var(--color-amber)]" />
                <span className="flex-1 text-[13px] text-[var(--color-ink)]">{item.text}</span>
                <ChevronRight size={15} className="shrink-0 text-[var(--color-ink-tertiary)]" />
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}
