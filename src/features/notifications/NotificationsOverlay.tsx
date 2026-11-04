import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, X } from 'lucide-react'
import { Skeleton } from '@/shared/ui/Skeleton'
import { GROUP_META, GroupHeader, GroupIcon, NotificationRow } from './NotificationRow'
import { useNotifications, type NotificationKind } from './useNotifications'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const PER_GROUP = 50

/**
 * Everything that waits for a person, on a screen of its own: it covers the whole window (header included) until it is
 * closed. The three numbers on top filter the list; a row opens the page where that thing is handled.
 */
export function NotificationsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { groups, total, isLoading } = useNotifications()
  const [only, setOnly] = useState<NotificationKind | null>(null)

  useEffect(() => {
    if (!open) return
    setOnly(null)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const go = (href: string) => {
    onClose()
    navigate(href)
  }
  const shown = only ? groups.filter((g) => g.kind === only) : groups

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t('notif.title')} className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)] animate-[notif-in_160ms_ease-out]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6">
        <h2 className="flex items-center gap-2 text-[18px] font-bold text-[var(--color-ink)]">
          {t('notif.title')}
          {total > 0 && <span className="tnum rounded-full bg-[var(--color-amber)] px-2 py-0.5 text-[12px] font-bold text-[var(--color-bg)]">{total}</span>}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.cancel')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-secondary)] outline-none transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)]"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-6">
          <p className="text-[13px] text-[var(--color-ink-tertiary)]">{t('notif.subtitle')}</p>

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
              <div className="flex flex-col items-center gap-2 py-24 text-center">
                <CheckCircle2 size={40} className="text-[var(--color-success)]" />
                <p className="text-[16px] font-semibold text-[var(--color-ink)]">{t('notif.empty')}</p>
                <p className="text-[13px] text-[var(--color-ink-tertiary)]">{t('notif.empty_hint')}</p>
              </div>
            ) : (
              shown.map((g) => (
                <section key={g.kind} className="mb-6">
                  <GroupHeader group={g} onOpen={go} />
                  <div className="border-t border-[var(--color-border)]">
                    {g.items.slice(0, PER_GROUP).map((item) => (
                      <NotificationRow key={item.id} item={item} onOpen={go} />
                    ))}
                  </div>
                  {g.count > PER_GROUP && (
                    <button type="button" onClick={() => go(g.href)} className="mt-1 px-2.5 text-[12.5px] font-medium text-[var(--color-primary)] hover:underline">
                      {t('notif.more', { n: g.count - PER_GROUP })}
                    </button>
                  )}
                </section>
              ))
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes notif-in { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: translateY(0);} }`}</style>
    </div>,
    document.body,
  )
}
