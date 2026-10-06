import { useState } from 'react'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Chip } from '@/shared/ui/Chip'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ErrorState } from '@/shared/ui/ErrorState'
import { apiAuditActors, apiAuditList, type AuditEntry, type AuditGroup } from '@/shared/api/audit'
import { formatDateTime } from '@/shared/lib/dates'
import { formatPhone } from '@/shared/lib/phone'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const GROUPS: AuditGroup[] = ['review', 'clients', 'staff', 'stations', 'rules', 'messages', 'security']

type Tone = 'success' | 'danger' | 'primary' | 'warning' | 'neutral'
const ACTIONS: Record<string, { label: DictKey; tone: Tone }> = {
  'review.approve': { label: 'audit.a.review_approve', tone: 'success' },
  'review.reject': { label: 'audit.a.review_reject', tone: 'danger' },
  'receipt.ack_large': { label: 'audit.a.ack_large', tone: 'neutral' },
  'client.rename': { label: 'audit.a.client_rename', tone: 'primary' },
  'client.adjust': { label: 'audit.a.client_adjust', tone: 'warning' },
  'client.block': { label: 'audit.a.client_block', tone: 'danger' },
  'client.unblock': { label: 'audit.a.client_unblock', tone: 'success' },
  'staff.create': { label: 'audit.a.staff_create', tone: 'success' },
  'staff.update': { label: 'audit.a.staff_update', tone: 'primary' },
  'staff.reset_pin': { label: 'audit.a.staff_reset', tone: 'warning' },
  'staff.remove': { label: 'audit.a.staff_remove', tone: 'danger' },
  'station.create': { label: 'audit.a.station_create', tone: 'success' },
  'station.update': { label: 'audit.a.station_update', tone: 'primary' },
  'station.delete': { label: 'audit.a.station_delete', tone: 'danger' },
  'terminal.create': { label: 'audit.a.terminal_create', tone: 'success' },
  'terminal.update': { label: 'audit.a.terminal_update', tone: 'primary' },
  'terminal.delete': { label: 'audit.a.terminal_delete', tone: 'danger' },
  'settings.update': { label: 'audit.a.settings_update', tone: 'primary' },
  'promotion.create': { label: 'audit.a.promo_create', tone: 'success' },
  'promotion.cancel': { label: 'audit.a.promo_cancel', tone: 'danger' },
  'broadcast.create': { label: 'audit.a.broadcast_create', tone: 'success' },
  'broadcast.cancel': { label: 'audit.a.broadcast_cancel', tone: 'warning' },
  'broadcast.delete': { label: 'audit.a.broadcast_delete', tone: 'danger' },
  'feedback.resolve': { label: 'audit.a.feedback_resolve', tone: 'success' },
  'dispute.resolve': { label: 'audit.a.dispute_resolve', tone: 'success' },
  'staff.regenerate_recovery_code': { label: 'audit.a.recovery', tone: 'neutral' },
  'data.delete': { label: 'audit.a.data_delete', tone: 'danger' },
  'datafix.gate_set': { label: 'audit.a.gate_set', tone: 'warning' },
  'datafix.gate_changed': { label: 'audit.a.gate_changed', tone: 'warning' },
  'datafix.unlock': { label: 'audit.a.unlock', tone: 'neutral' },
  'datafix.unlock_failed': { label: 'audit.a.unlock_failed', tone: 'danger' },
}

const ROLE_LABEL: Record<string, DictKey> = {
  seo: 'role.seo',
  root_admin: 'role.root_admin',
  branch_manager: 'role.branch_manager',
}

/** Harakatlar tarixi — who changed what in the dashboard, newest first. */
export function AuditPage() {
  const { t } = useI18n()
  const [group, setGroup] = useState<AuditGroup | undefined>(undefined)
  const [actor, setActor] = useState('')
  const { data: actors } = useSWR('audit-actors', apiAuditActors)
  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(
    (index, prev: { nextCursor: string | null } | null) => (prev && !prev.nextCursor ? null : ['audit', group, actor, index === 0 ? '' : prev?.nextCursor]),
    ([, g, a, cursor]) => apiAuditList({ group: (g as AuditGroup) || undefined, actor: (a as string) || undefined, cursor: (cursor as string) || undefined }),
    { revalidateFirstPage: true },
  )
  const rows = data?.flatMap((p) => p.items) ?? []
  const hasMore = !!data && !!data[data.length - 1]?.nextCursor

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={!group} onClick={() => setGroup(undefined)}>
          {t('common.all')}
        </Chip>
        {GROUPS.map((g) => (
          <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
            {t(`audit.g.${g}` as DictKey)}
          </Chip>
        ))}
        <select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          aria-label={t('audit.who')}
          className="ml-auto h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">{t('audit.all_people')}</option>
          {actors?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.count})
            </option>
          ))}
        </select>
      </div>

      <Card padded={false}>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={t('common.load_failed')} onRetry={() => mutate()} />
        ) : rows.length === 0 ? (
          <EmptyState title={t('audit.empty')} />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {rows.map((r) => (
              <Row key={r.id} entry={r} />
            ))}
          </ul>
        )}
      </Card>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setSize(size + 1)} loading={isValidating}>
            {t('cd.load_more')}
          </Button>
        </div>
      )}
    </div>
  )
}

function Row({ entry }: { entry: AuditEntry }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const meta = ACTIONS[entry.action]
  const role = entry.actorRole ? ROLE_LABEL[entry.actorRole] : undefined
  const canOpen = entry.changes.length > 0

  return (
    <li>
      <button
        type="button"
        onClick={() => canOpen && setOpen((v) => !v)}
        className={cn('flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left', canOpen && 'hover:bg-[var(--color-surface-alt)]')}
      >
        <span className="tnum w-[124px] shrink-0 text-[12.5px] text-[var(--color-ink-tertiary)]">{formatDateTime(entry.at)}</span>
        <span className="w-[210px] shrink-0">
          <Badge tone={meta?.tone ?? 'neutral'}>{meta ? t(meta.label) : entry.action}</Badge>
        </span>
        <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--color-ink)]">{entry.target ?? '—'}</span>
        <span className="min-w-[150px] text-[13px] text-[var(--color-ink-secondary)]">
          <span className="font-medium text-[var(--color-ink)]">{entry.actorName ?? t('audit.system')}</span>
          {role && <span className="ml-1.5 text-[var(--color-ink-tertiary)]">{t(role)}</span>}
          {entry.actorPhone && <span className="block text-[12px] text-[var(--color-ink-tertiary)]">{formatPhone(entry.actorPhone)}</span>}
        </span>
        <ChevronDown size={15} className={cn('shrink-0 text-[var(--color-ink-tertiary)] transition-transform', !canOpen && 'invisible', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-1 bg-[var(--color-surface-alt)] px-4 py-3 text-[12.5px]">
          {entry.changes.map((c) => (
            <p key={c.field} className="flex flex-wrap items-center gap-2">
              <span className="min-w-[110px] font-mono text-[var(--color-ink-tertiary)]">{c.field}</span>
              {c.from !== null && <span className="rounded bg-[var(--color-danger-soft)] px-1.5 py-0.5 text-[var(--color-danger)] line-through">{c.from}</span>}
              {c.from !== null && c.to !== null && <ArrowRight size={13} className="text-[var(--color-ink-tertiary)]" />}
              {c.to !== null && <span className="rounded bg-[var(--color-success-soft)] px-1.5 py-0.5 text-[var(--color-success)]">{c.to}</span>}
            </p>
          ))}
        </div>
      )}
    </li>
  )
}
