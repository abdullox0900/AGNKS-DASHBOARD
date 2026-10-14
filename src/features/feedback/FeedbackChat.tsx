import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR, { useSWRConfig } from 'swr'
import { Ban, CheckCircle2, Send, ShieldCheck, Trash2, X } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useToast } from '@/shared/ui/Toast'
import { apiDeleteFeedback, apiFeedbackReply, apiFeedbackThread, apiResolveFeedback, apiUnblockClient } from '@/shared/api/client'
import { useFeedbackTemplates } from '@/shared/api/hooks'
import { usePermission } from '@/shared/lib/permissions'
import { formatDateTime } from '@/shared/lib/dates'
import { formatPhone } from '@/shared/lib/phone'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import { KIND_LABEL, KIND_TONE } from './kinds'

/**
 * One conversation with a client, like a messenger: the client's messages on the left, ours on the right.
 * Answer by typing or by tapping a ready-made reply (it lands in the box — edit it or send it as is).
 */
export function FeedbackChat({ id, onChanged, onDeleted }: { id: string; onChanged: () => void; onDeleted: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const { mutate: globalMutate } = useSWRConfig()
  const canReply = usePermission('disputes.decide')
  const canOpenClient = usePermission('clients.detail')
  const canUnblock = usePermission('clients.edit')
  const canDelete = usePermission('feedback.delete')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { data: templates } = useFeedbackTemplates()
  const { data: thread, mutate } = useSWR(['feedback-thread', id], () => apiFeedbackThread(id), { refreshInterval: 8_000, revalidateOnFocus: true })
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<'send' | 'resolve' | 'unblock' | 'delete' | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const count = thread?.messages.length ?? 0

  // opening a thread marks it seen on the server — refresh the list and the red number in the menu
  useEffect(() => {
    if (!thread) return
    onChanged()
    void globalMutate('/admin/feedback/unread-count')
  }, [thread?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [count, id])

  async function send() {
    const body = text.trim()
    if (!body || busy) return
    setBusy('send')
    try {
      await apiFeedbackReply(id, body)
      setText('')
      await mutate()
      onChanged()
    } catch {
      show(t('common.error_generic'))
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    setBusy('delete')
    try {
      await apiDeleteFeedback(id)
      show(t('fbchat.deleted'))
      void globalMutate('/admin/feedback/unread-count')
      onDeleted()
    } catch {
      show(t('common.error_generic'))
      setBusy(null)
    }
  }

  async function run(kind: 'resolve' | 'unblock', action: () => Promise<unknown>, message: string) {
    setBusy(kind)
    try {
      await action()
      show(message)
      await mutate()
      onChanged()
    } catch {
      show(t('common.error_generic'))
    } finally {
      setBusy(null)
    }
  }

  if (!thread) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="ml-auto h-12 w-2/3" />
      </div>
    )
  }

  const c = thread.client
  const open = thread.status === 'open'
  const ru = c.lang === 'ru'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--color-border)] px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {canOpenClient ? (
            <Link to={`/clients/${c.id}`} className="text-[16px] font-bold text-[var(--color-ink)] underline-offset-2 hover:text-[var(--color-primary)] hover:underline">
              {c.name}
            </Link>
          ) : (
            <span className="text-[16px] font-bold text-[var(--color-ink)]">{c.name}</span>
          )}
          <Badge tone={KIND_TONE[thread.kind]}>{t(KIND_LABEL[thread.kind])}</Badge>
          <Badge tone={open ? 'warning' : 'success'}>{open ? t('feedback.status.open') : t('feedback.status.closed')}</Badge>
          {c.blocked && <Badge tone="danger">{t('common.blocked')}</Badge>}
          {canDelete && (
            <span className="ml-auto flex items-center gap-1">
              {confirmDelete ? (
                <>
                  <span className="text-[12px] text-[var(--color-ink-secondary)]">{t('fbchat.delete_ask')}</span>
                  <Button size="sm" variant="danger" loading={busy === 'delete'} onClick={() => void remove()}>
                    {t('changelog.confirm_delete')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} aria-label={t('common.cancel')}>
                    <X size={14} />
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label={t('fbchat.delete')} title={t('fbchat.delete')}>
                  <Trash2 size={14} />
                </Button>
              )}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-tertiary)]">
          {c.phone ? formatPhone(c.phone) : '—'} · {ru ? 'Русский' : "O'zbekcha"}
        </p>
        {c.blocked && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-[var(--color-danger-soft)] px-2.5 py-1.5 text-[12.5px] text-[var(--color-ink)]">
            <Ban size={14} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
            <span>{c.blockedReason ? t('fbchat.blocked_reason', { reason: c.blockedReason }) : t('fbchat.blocked_no_reason')}</span>
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {thread.messages.map((m, i) => {
          const mine = m.sender === 'staff'
          const day = new Date(m.at).toDateString()
          const showDay = i === 0 || new Date(thread.messages[i - 1].at).toDateString() !== day
          return (
            <div key={m.id}>
              {showDay && <p className="my-2 text-center text-[11.5px] text-[var(--color-ink-tertiary)]">{formatDateTime(m.at)}</p>}
              <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed',
                    mine ? 'rounded-br-md bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'rounded-bl-md bg-[var(--color-surface-alt)] text-[var(--color-ink)]',
                  )}
                >
                  {m.text}
                </div>
                <span className="mt-0.5 px-1 text-[10.5px] text-[var(--color-ink-tertiary)]">{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {canReply ? (
        <div className="border-t border-[var(--color-border)] px-5 pb-4 pt-3">
          {templates && templates.length > 0 && (
            <div className="mb-2.5">
              <p className="mb-1 text-[11.5px] font-medium text-[var(--color-ink-tertiary)]">{t('fbchat.templates')}</p>
              <div className="flex max-h-[76px] flex-wrap gap-1.5 overflow-y-auto">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    title={ru && tpl.textRu ? tpl.textRu : tpl.textUz}
                    onClick={() => setText(ru && tpl.textRu ? tpl.textRu : tpl.textUz)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[12.5px] text-[var(--color-ink-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              rows={2}
              maxLength={1000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              placeholder={t('fbchat.placeholder')}
              className="min-h-[52px] flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-[13.5px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-primary)]"
            />
            <Button onClick={() => void send()} disabled={!text.trim()} loading={busy === 'send'} aria-label={t('fbchat.send')}>
              <Send size={16} /> {t('fbchat.send')}
            </Button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {open && (
              <Button variant="ghost" size="sm" loading={busy === 'resolve'} onClick={() => void run('resolve', () => apiResolveFeedback(id), t('disputes.marked'))}>
                <CheckCircle2 size={14} /> {t('disputes.mark_reviewed')}
              </Button>
            )}
            {c.blocked && canUnblock && (
              <Button variant="secondary" size="sm" loading={busy === 'unblock'} onClick={() => void run('unblock', () => apiUnblockClient(c.id), t('clients.unblocked'))}>
                <ShieldCheck size={14} /> {t('fbchat.unblock')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="border-t border-[var(--color-border)] px-5 py-3 text-[12.5px] text-[var(--color-ink-tertiary)]">{t('fbchat.read_only')}</p>
      )}
    </div>
  )
}
