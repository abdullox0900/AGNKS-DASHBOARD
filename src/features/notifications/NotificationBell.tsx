import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useI18n } from '@/app/providers/I18nProvider'
import { NotificationsOverlay } from './NotificationsOverlay'
import { useNotifications } from './useNotifications'

/** The bell in the top bar: a number while something waits for a person; a click opens the full-screen list. */
export function NotificationBell() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const { total } = useNotifications()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('notif.title')}
        title={t('notif.title')}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-ink-secondary)] outline-none transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)]"
      >
        <Bell size={17} />
        {total > 0 && (
          <span className="tnum absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-amber)] px-1 text-[10.5px] font-bold text-[var(--color-bg)]">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>
      <NotificationsOverlay open={open} onClose={() => setOpen(false)} />
    </>
  )
}
