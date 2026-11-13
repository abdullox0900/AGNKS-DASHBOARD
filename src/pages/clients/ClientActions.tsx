import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { apiAdjustClient, apiBlockClient, apiRenameClient, apiUnblockClient } from '@/shared/api/client'
import { useI18n } from '@/app/providers/I18nProvider'

const label = 'mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-tertiary)]'
const input = 'h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-primary)]'

/** SEO-only management of a client: rename, balance correction (with a reason), block / unblock. */
export function ClientActions({ id, name: initialName, blocked, blockedReason, onChanged }: { id: string; name: string; blocked: boolean; blockedReason?: string | null; onChanged: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const [name, setName] = useState(initialName)
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [blocking, setBlocking] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function run(key: string, action: () => Promise<unknown>, message: string, after?: () => void) {
    setBusy(key)
    try {
      await action()
      show(message)
      after?.()
      onChanged()
    } catch {
      show(t('common.error_generic'))
    } finally {
      setBusy(null)
    }
  }
  const amount = Number(delta.replace(/[^\d-]/g, ''))

  return (
    <div className="space-y-5">
      <div>
        <label className={label}>{t('cd.name')}</label>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
          <Button variant="secondary" className="h-11 px-5" loading={busy === 'name'} disabled={!name.trim() || name === initialName} onClick={() => run('name', () => apiRenameClient(id, name.trim()), t('clients.name_updated'))}>
            {t('common.save')}
          </Button>
        </div>
      </div>

      <div>
        <label className={label}>{t('cd.adjust')}</label>
        <div className="flex gap-2">
          <input inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value.replace(/(?!^[-+])[^\d\s]/g, ''))} placeholder={t('cd.adjust_ph')} className={`${input} font-mono`} />
          <Button
            variant="secondary"
            className="h-11 px-5"
            loading={busy === 'adjust'}
            disabled={!amount || note.trim().length < 3}
            onClick={() =>
              run('adjust', () => apiAdjustClient(id, amount, note.trim()), t('clients.balance_updated'), () => {
                setDelta('')
                setNote('')
              })
            }
          >
            {t('cd.adjust_btn')}
          </Button>
        </div>
        {!!amount && <input autoFocus value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder={t('cd.adjust_note_ph')} className={`${input} mt-2 w-full`} />}
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        {blocked ? (
          <div className="space-y-2">
            {blockedReason && <p className="text-[13px] text-[var(--color-ink-secondary)]">{t('clients.blocked_reason_line', { reason: blockedReason })}</p>}
            <button type="button" disabled={busy === 'unblock'} onClick={() => run('unblock', () => apiUnblockClient(id), t('clients.unblocked'))} className="text-[14px] font-semibold text-[var(--color-success)] hover:underline disabled:opacity-50">
              {t('cd.unblock_link')}
            </button>
          </div>
        ) : !blocking ? (
          <button type="button" onClick={() => setBlocking(true)} className="text-[14px] font-semibold text-[var(--color-danger)] hover:underline">
            {t('cd.block_link')}
          </button>
        ) : (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              rows={2}
              placeholder={t('clients.block_reason_ph')}
              className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-transparent px-3.5 py-2.5 text-[13.5px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-danger)]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setBlocking(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" loading={busy === 'block'} disabled={reason.trim().length < 3} onClick={() => run('block', () => apiBlockClient(id, reason.trim()), t('clients.blocked_toast'), () => setReason(''))}>
                {t('clients.block_short')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
