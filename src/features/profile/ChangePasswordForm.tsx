import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { apiChangePassword } from '@/shared/api/client'
import { ApiError } from '@/shared/api/errors'
import { useI18n } from '@/app/providers/I18nProvider'

export function ChangePasswordForm({ phone, onDone }: { phone: string | null; onDone: () => void }) {
  const { t } = useI18n()
  const { show } = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = phone && current.length >= 6 && next.length >= 6 && next === confirm

  async function handleSubmit() {
    if (!canSubmit || !phone) return
    setSubmitting(true)
    setError(null)
    try {
      await apiChangePassword(phone, current, next)
      show(t('topbar.password_updated'))
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? t('topbar.wrong_current') : t('common.error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('topbar.current_password')}</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('topbar.new_password')}</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('topbar.repeat_password')}</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
        {next && confirm && next !== confirm && (
          <p className="mt-1 text-[12px] font-medium text-[var(--color-danger)]">{t('topbar.passwords_mismatch')}</p>
        )}
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--color-danger)]">{error}</p>}
      <Button className="w-full" disabled={!canSubmit} loading={submitting} onClick={handleSubmit}>
        {t('common.save')}
      </Button>
    </div>
  )
}
