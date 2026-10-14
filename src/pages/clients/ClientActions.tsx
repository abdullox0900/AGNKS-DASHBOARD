import { useState } from 'react'
import { Ban, CheckCircle2 } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { apiAdjustClient, apiBlockClient, apiRenameClient, apiUnblockClient } from '@/shared/api/client'
import { useI18n } from '@/app/providers/I18nProvider'

/** SEO-only management of a client: rename, balance correction, block / unblock. */
export function ClientActions({ id, name: initialName, blocked, blockedReason, onChanged }: { id: string; name: string; blocked: boolean; blockedReason?: string | null; onChanged: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const [name, setName] = useState(initialName)
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function run(action: () => Promise<unknown>, message: string, after?: () => void) {
    setSubmitting(true)
    try {
      await action()
      show(message)
      after?.()
      onChanged()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('common.name')}</label>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 flex-1 rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]" />
          <Button
            size="sm"
            loading={submitting}
            disabled={!name || name === initialName}
            onClick={() => run(() => apiRenameClient(id, name), t('clients.name_updated'))}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('clients.adjust_label')}</label>
        <input
          inputMode="numeric"
          value={delta}
          onChange={(e) => setDelta(e.target.value.replace(/(?!^-)[^\d]/g, ''))}
          placeholder={t('clients.adjust_ph')}
          className="mb-2 h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('common.reason_required')}
          rows={2}
          className="mb-2 w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
        <Button
          size="sm"
          className="w-full"
          loading={submitting}
          disabled={!delta || !note}
          onClick={() =>
            run(() => apiAdjustClient(id, Number(delta), note), t('clients.balance_updated'), () => {
              setDelta('')
              setNote('')
            })
          }
        >
          {t('clients.adjust_btn')}
        </Button>
      </div>

      {blocked ? (
        <div className="space-y-2">
          {blockedReason && <p className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[13px] text-[var(--color-ink)]">{t('clients.blocked_reason_line', { reason: blockedReason })}</p>}
          <Button variant="secondary" className="w-full" loading={submitting} onClick={() => run(() => apiUnblockClient(id), t('clients.unblocked'))}>
            <CheckCircle2 size={15} /> {t('clients.unblock_btn')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('clients.block_reason')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            rows={2}
            placeholder={t('clients.block_reason_ph')}
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-danger)]"
          />
          <p className="text-[11.5px] text-[var(--color-ink-tertiary)]">{t('clients.block_reason_hint')}</p>
          <Button variant="danger" className="w-full" loading={submitting} disabled={reason.trim().length < 3} onClick={() => run(() => apiBlockClient(id, reason.trim()), t('clients.blocked_toast'), () => setReason(''))}>
            <Ban size={15} /> {t('clients.block_btn')}
          </Button>
        </div>
      )}
    </div>
  )
}
