import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle2, Maximize2 } from 'lucide-react'
import { PopoverContent, PopoverRoot, PopoverTrigger } from '@/shared/ui/Menu'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useI18n } from '@/app/providers/I18nProvider'
import { GroupHeader, NotificationRow } from './NotificationRow'
import { useNotifications } from './useNotifications'

const PER_GROUP = 4

/** The bell in the top bar: a number while something waits for a person, a short list when opened. */
export function NotificationBell() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { groups, total, isLoading } = useNotifications()

  function go(href: string) {
    setOpen(false)
    navigate(href)
  }

  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t('notif.title')}
        title={t('notif.title')}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-ink-secondary)] outline-none transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)] data-[state=open]:bg-[var(--color-surface-alt)]"
      >
        <Bell size={17} />
        {total > 0 && (
          <span className="tnum absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-amber)] px-1 text-[10.5px] font-bold text-[var(--color-bg)]">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] max-w-[calc(100vw-24px)] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <p className="text-[14px] font-bold text-[var(--color-ink)]">
            {t('notif.title')} {total > 0 && <span className="tnum ml-1 text-[var(--color-ink-tertiary)]">{total}</span>}
          </p>
          <button type="button" onClick={() => go('/notifications')} className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-primary)] hover:underline">
            <Maximize2 size={12} /> {t('notif.full')}
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-1.5">
          {isLoading && groups.length === 0 ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <CheckCircle2 size={28} className="text-[var(--color-success)]" />
              <p className="text-[13.5px] font-medium text-[var(--color-ink)]">{t('notif.empty')}</p>
              <p className="text-[12px] text-[var(--color-ink-tertiary)]">{t('notif.empty_hint')}</p>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.kind}>
                <GroupHeader group={g} onOpen={go} />
                {g.items.slice(0, PER_GROUP).map((item) => (
                  <NotificationRow key={item.id} item={item} onOpen={go} compact />
                ))}
                {g.count > PER_GROUP && (
                  <button type="button" onClick={() => go(g.href)} className="w-full px-2.5 py-1.5 text-left text-[12px] text-[var(--color-ink-tertiary)] hover:text-[var(--color-primary)]">
                    {t('notif.more', { n: g.count - PER_GROUP })}
                  </button>
                )}
              </section>
            ))
          )}
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
}
