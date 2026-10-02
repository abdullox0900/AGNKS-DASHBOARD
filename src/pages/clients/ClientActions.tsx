import { useState } from 'react'
import { Ban, CheckCircle2 } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { apiAdjustClient, apiBlockClient, apiRenameClient, apiUnblockClient } from '@/shared/api/client'
import { useI18n } from '@/app/providers/I18nProvider'

/** SEO-only management of a client: rename, balance correction, block / unblock. */
export function ClientActions({ id, name: initialName, blocked, onChanged }: { id: string; name: string; blocked: boolean; onChanged: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const [name, setName] = useState(initialName)
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
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

      <Button
        variant={blocked ? 'secondary' : 'danger'}
        className="w-full"
        loading={submitting}
        onClick={() =>
          run(() => (blocked ? apiUnblockClient(id) : apiBlockClient(id)), blocked ? t('clients.unblocked') : t('clients.blocked_toast'))
        }
      >
        {blocked ? (
          <>
            <CheckCircle2 size={15} /> {t('clients.unblock_btn')}
          </>
        ) : (
          <>
            <Ban size={15} /> {t('clients.block_btn')}
          </>
        )}
      </Button>
    </div>
  )
}
