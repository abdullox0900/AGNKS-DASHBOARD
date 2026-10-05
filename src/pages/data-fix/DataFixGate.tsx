import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { KeyRound, Lock } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'
import { apiGateSetup, apiGateStatus, apiGateUnlock } from '@/shared/api/dataFix'
import { ApiError } from '@/shared/api/errors'
import { useI18n } from '@/app/providers/I18nProvider'

const inputClass = 'h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]'
const labelClass = 'mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]'

/** The lock in front of "Ma'lumotlarni tuzatish": its own password, asked every time the page is opened. */
export function DataFixGate({ onUnlocked }: { onUnlocked: () => void }) {
  const { t } = useI18n()
  const { data, error, mutate } = useSWR('data-fix-gate', apiGateStatus, { revalidateOnFocus: false, revalidateOnMount: true, revalidateIfStale: true, dedupingInterval: 0 })
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const setup = data ? !data.configured : false

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (setup) {
      if (password.length < 8) return setMessage(t('fix.gate_short'))
      if (password !== repeat) return setMessage(t('fix.gate_mismatch'))
    }
    setBusy(true)
    try {
      if (setup) {
        await apiGateSetup(password, loginPw)
        void globalMutate('data-fix-gate', { configured: true }, false) // never show the setup form again
      } else await apiGateUnlock(password)
      onUnlocked()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RATE_LIMITED') setMessage(t('fix.gate_locked_out'))
      else if (err instanceof ApiError && err.code === 'AUTH_INVALID_CREDENTIALS') setMessage(t('fix.gate_wrong'))
      else if (err instanceof ApiError && err.details?.message === 'gate_already_set') void mutate()
      else setMessage(t('common.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-[420px]">
      <Card>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          {setup ? <KeyRound size={22} /> : <Lock size={22} />}
        </div>
        {!data && !error ? (
          <Skeleton className="h-40 w-full" />
        ) : error ? (
          <p className="text-[13px] font-medium text-[var(--color-danger)]">{t('common.load_failed')}</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <h1 className="text-[19px] font-bold text-[var(--color-ink)]">{setup ? t('fix.gate_setup_title') : t('fix.gate_title')}</h1>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-ink-tertiary)]">{setup ? t('fix.gate_setup_sub') : t('fix.gate_sub')}</p>
            </div>
            <div>
              <label className={labelClass}>{setup ? t('fix.gate_new') : t('fix.gate_password')}</label>
              <input type="password" autoFocus autoComplete={setup ? 'new-password' : 'off'} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </div>
            {setup && (
              <>
                <div>
                  <label className={labelClass}>{t('fix.gate_repeat')}</label>
                  <input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('fix.gate_login_pw')}</label>
                  <input type="password" autoComplete="current-password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} className={inputClass} />
                </div>
              </>
            )}
            {message && <p className="text-[13px] font-medium text-[var(--color-danger)]">{message}</p>}
            <Button type="submit" className="w-full" loading={busy} disabled={!password || (setup && (!repeat || !loginPw))}>
              {setup ? t('fix.gate_create') : t('fix.gate_open')}
            </Button>
            {!setup && <p className="text-[11.5px] text-[var(--color-ink-tertiary)]">{t('fix.gate_forgot')}</p>}
          </form>
        )}
      </Card>
    </div>
  )
}
