import { ChevronRight, ClipboardList, Coins, MessageSquareWarning, ScanFace } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { formatSeen } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import { KIND_LABEL, KIND_TONE } from '@/features/feedback/kinds'
import type { NotificationGroup, NotificationItem, NotificationKind } from './useNotifications'
import type { DictKey } from '@/shared/config/dictionaries'

export const GROUP_META: Record<NotificationKind, { title: DictKey; icon: React.ComponentType<{ size?: number; className?: string }>; tone: string }> = {
  review: { title: 'notif.g_review', icon: ClipboardList, tone: 'bg-[var(--color-amber-soft)] text-[var(--color-amber)]' },
  support: { title: 'notif.g_support', icon: MessageSquareWarning, tone: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' },
  large: { title: 'notif.g_large', icon: Coins, tone: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]' },
  faceid: { title: 'notif.g_faceid', icon: ScanFace, tone: 'bg-[var(--color-amber-soft)] text-[var(--color-amber)]' },
}

export function GroupIcon({ kind, size = 32 }: { kind: NotificationKind; size?: number }) {
  const meta = GROUP_META[kind]
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-lg', meta.tone)} style={{ width: size, height: size }}>
      <meta.icon size={Math.round(size * 0.5)} />
    </span>
  )
}

/** One waiting thing: who, what, when. Clicking it opens the page where it is handled. */
export function NotificationRow({ item, onOpen, compact }: { item: NotificationItem; onOpen: (href: string) => void; compact?: boolean }) {
  const { t } = useI18n()
  const when = formatSeen(item.at, { today: t('clients.today'), yesterday: t('clients.yesterday') })
  return (
    <button
      type="button"
      onClick={() => onOpen(item.href)}
      className={cn('group flex w-full items-start gap-3 rounded-lg px-2.5 text-left outline-none transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)]', compact ? 'py-2' : 'py-3')}
    >
      {item.photo ? <img src={item.photo} alt="" loading="lazy" className="shrink-0 rounded-full object-cover" style={{ width: compact ? 28 : 34, height: compact ? 28 : 34 }} /> : <GroupIcon kind={item.kind} size={compact ? 28 : 34} />}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{item.title}</span>
          {item.feedbackKind && <Badge tone={KIND_TONE[item.feedbackKind]}>{t(KIND_LABEL[item.feedbackKind])}</Badge>}
          {item.amount !== undefined && <span className="tnum text-[12.5px] font-semibold text-[var(--color-danger)]">{formatMoneyFull(item.amount)}</span>}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-[var(--color-ink-secondary)]">{item.detail || '—'}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="whitespace-nowrap text-[11.5px] text-[var(--color-ink-tertiary)]">{when}</span>
        <ChevronRight size={14} className="text-[var(--color-ink-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
    </button>
  )
}

export function GroupHeader({ group, onOpen }: { group: NotificationGroup; onOpen: (href: string) => void }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 pb-1 pt-3">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-tertiary)]">
        {t(GROUP_META[group.kind].title)} <span className="tnum ml-1 text-[var(--color-ink-secondary)]">{group.count}</span>
      </p>
      <button type="button" onClick={() => onOpen(group.href)} className="text-[12px] font-medium text-[var(--color-primary)] hover:underline">
        {t('notif.open_page')}
      </button>
    </div>
  )
}
