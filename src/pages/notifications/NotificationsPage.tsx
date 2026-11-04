import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Skeleton } from '@/shared/ui/Skeleton'
import { GROUP_META, GroupHeader, GroupIcon, NotificationRow } from '@/features/notifications/NotificationRow'
import { useNotifications, type NotificationKind } from '@/features/notifications/useNotifications'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

/** Full-screen version of the bell: everything that waits for a person, grouped, with the three numbers on top as filters. */
export function NotificationsPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { groups, total, isLoading } = useNotifications()
  const [only, setOnly] = useState<NotificationKind | null>(null)

  const shown = only ? groups.filter((g) => g.kind === only) : groups

  return (
    <div className="w-full">
      <div>
        <h2 className="text-[26px] font-bold tracking-tight text-[var(--color-ink)]">{t('notif.title')}</h2>
        <p className="mt-1 text-[13px] text-[var(--color-ink-tertiary)]">{t('notif.subtitle')}</p>
      </div>

      {groups.length > 0 && (
        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
          {groups.map((g) => (
            <button
              key={g.kind}
              type="button"
              onClick={() => setOnly(only === g.kind ? null : g.kind)}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                only === g.kind ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]',
              )}
            >
              <GroupIcon kind={g.kind} size={38} />
              <span>
                <span className="block text-[12px] font-medium text-[var(--color-ink-secondary)]">{t(GROUP_META[g.kind].title)}</span>
                <span className="tnum block text-[24px] font-bold leading-tight text-[var(--color-ink)]">{g.count}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        {isLoading && groups.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <CheckCircle2 size={36} className="text-[var(--color-success)]" />
            <p className="text-[15px] font-semibold text-[var(--color-ink)]">{t('notif.empty')}</p>
            <p className="text-[13px] text-[var(--color-ink-tertiary)]">{t('notif.empty_hint')}</p>
          </div>
        ) : (
          shown.map((g) => (
            <section key={g.kind} className="mb-6">
              <GroupHeader group={g} onOpen={navigate} />
              <div className="border-t border-[var(--color-border)]">
                {g.items.slice(0, 50).map((item) => (
                  <NotificationRow key={item.id} item={item} onOpen={navigate} />
                ))}
              </div>
              {g.count > 50 && (
                <button type="button" onClick={() => navigate(g.href)} className="mt-1 px-2.5 text-[12.5px] font-medium text-[var(--color-primary)] hover:underline">
                  {t('notif.more', { n: g.count - 50 })}
                </button>
              )}
            </section>
          ))
        )}
      </div>
    </div>
  )
}
