import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Drawer } from '@/shared/ui/Drawer'
import { Chip } from '@/shared/ui/Chip'
import { Card } from '@/shared/ui/Card'
import { Avatar } from '@/shared/ui/Avatar'
import { Skeleton } from '@/shared/ui/Skeleton'
import { FeedbackChat } from '@/features/feedback/FeedbackChat'
import { KIND_LABEL, KIND_TONE } from '@/features/feedback/kinds'
import { TemplatesManager } from '@/features/feedback/TemplatesManager'
import { useMediaQuery } from '@/shared/lib/useMediaQuery'
import { MessagesSquare, Settings2 } from 'lucide-react'
import { useFeedback } from '@/shared/api/hooks'
import { formatDateShort } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/cn'
import { usePermission } from '@/shared/lib/permissions'
import { useI18n } from '@/app/providers/I18nProvider'

/**
 * Taklif va shikoyat — the conversations with clients, like a messenger: the list on the left, the open chat on the right.
 * (The old "receipt / spend dispute" tab is gone: clients no longer file those.)
 */
export function DisputesPage() {
  const { t } = useI18n()
  const wide = useMediaQuery('(min-width: 1024px)')
  const [statusFilter, setStatusFilter] = useState<'open' | undefined>('open')
  const { data, isLoading, error, mutate } = useFeedback(statusFilter)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // wide screens open the first conversation straight away, and move on to the next one when the open one leaves the list
  // (resolved, deleted…); narrow screens open nothing until a row is tapped
  const stillListed = !!selectedId && !!data?.some((f) => f.id === selectedId)
  const activeId = stillListed ? selectedId : wide ? (data?.[0]?.id ?? null) : null
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const canEditTemplates = usePermission('feedback.templates')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Chip active={statusFilter === 'open'} onClick={() => setStatusFilter('open')}>
            {t('feedback.status.open')}
          </Chip>
          <Chip active={statusFilter === undefined} onClick={() => setStatusFilter(undefined)}>
            {t('common.all')}
          </Chip>
        </div>
        {canEditTemplates && (
          <Button variant="secondary" size="sm" onClick={() => setTemplatesOpen(true)}>
            <Settings2 size={14} /> {t('fbchat.manage_templates')}
          </Button>
        )}
      </div>

      <div className={cn('grid gap-4', wide && 'grid-cols-[minmax(320px,400px)_1fr]')} style={wide ? { height: 'calc(100vh - 215px)', minHeight: 420 } : undefined}>
        <Card padded={false} className="min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="p-6 text-center text-[13px] text-[var(--color-danger)]">{t('common.load_failed')}</p>
          ) : !data || data.length === 0 ? (
            <p className="p-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">{t('disputes.empty_feedback')}</p>
          ) : (
            <ul>
              {data.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => setSelectedId(f.id)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors',
                      activeId === f.id ? 'bg-[var(--color-primary-soft)]' : 'hover:bg-[var(--color-surface-alt)]',
                    )}
                  >
                    <Avatar name={f.clientName} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn('truncate text-[13.5px] text-[var(--color-ink)]', f.unread ? 'font-bold' : 'font-medium')}>{f.clientName}</span>
                        <span className="shrink-0 text-[11px] text-[var(--color-ink-tertiary)]">{formatDateShort(f.lastActivityAt)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge tone={KIND_TONE[f.kind]}>{t(KIND_LABEL[f.kind])}</Badge>
                        {f.status === 'resolved' && <span className="text-[11px] text-[var(--color-success)]">{t('feedback.status.closed')}</span>}
                      </div>
                      <p className={cn('mt-1 line-clamp-2 break-words text-[12.5px]', f.unread ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-secondary)]')}>
                        {f.lastSender === 'staff' && <span className="text-[var(--color-primary)]">{t('fbchat.you')}: </span>}
                        {f.preview}
                      </p>
                    </div>
                    {f.unread && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-danger)]" aria-label={t('fbchat.new')} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {wide && (
          <Card padded={false} className="min-h-0 overflow-hidden">
            {activeId ? (
              <FeedbackChat key={activeId} id={activeId} onChanged={() => mutate()} onDeleted={() => { setSelectedId(null); void mutate() }} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--color-ink-tertiary)]">
                <MessagesSquare size={34} strokeWidth={1.5} />
                <p className="text-[13px]">{t('fbchat.select')}</p>
              </div>
            )}
          </Card>
        )}
      </div>

      {!wide && (
        <Drawer open={!!activeId} onClose={() => setSelectedId(null)} title={t('nav.feedback')} width={460}>
          {activeId && (
            <div className="-mx-5 -my-4" style={{ height: 'calc(100vh - 62px)' }}>
              <FeedbackChat key={activeId} id={activeId} onChanged={() => mutate()} onDeleted={() => { setSelectedId(null); void mutate() }} />
            </div>
          )}
        </Drawer>
      )}

      <Drawer open={templatesOpen} onClose={() => setTemplatesOpen(false)} title={t('fbchat.manage_templates')} width={480}>
        {templatesOpen && <TemplatesManager />}
      </Drawer>
    </div>
  )
}
