import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Phone } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { apiLogin } from '@/shared/api/client'
import { ApiError } from '@/shared/api/errors'
import { useAuthStore } from '@/shared/config/authStore'
import { PhoneInput } from '@/shared/ui/PhoneInput'
import { toE164 } from '@/shared/lib/phone'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import { PreferencesBar } from '@/features/preferences/PreferencesBar'
import { LoginArt } from './LoginArt'
import { WelcomeReveal } from './WelcomeReveal'
import { discardLoginSound, playLoginSound, prepareLoginSound } from '@/shared/lib/loginSound'

const fieldClass =
  'flex h-12 w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[14.5px] transition-colors hover:border-[var(--color-border-strong)] focus-within:border-[var(--color-primary)] focus-within:shadow-[0_0_0_3px_var(--color-primary-soft)]'

const rise = (delay: number) => ({ '--delay': `${delay}s` }) as React.CSSProperties

export function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [welcome, setWelcome] = useState<{ name: string; x: number; y: number } | null>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const timer = useRef<number>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const sound = prepareLoginSound() // must be created inside the submit gesture, before any await
    try {
      const { accessToken, user } = await apiLogin(toE164(phone), password)
      const session = {
        userId: user.id,
        firstName: user.firstName,
        phone: user.phone,
        role: user.role,
        stationId: user.stationId,
        stationName: user.stationName,
        accessToken,
      }
      // play the welcome reveal first; the session is stored right before leaving so the guard doesn't cut it short
      const box = submitRef.current?.getBoundingClientRect()
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      playLoginSound(sound)
      setWelcome({
        name: user.firstName,
        x: box ? box.left + box.width / 2 : window.innerWidth / 2,
        y: box ? box.top + box.height / 2 : window.innerHeight / 2,
      })
      timer.current = window.setTimeout(
        () => {
          setSession(session)
          navigate('/', { replace: true })
        },
        reduced ? 250 : 2300,
      )
    } catch (err) {
      discardLoginSound(sound)
      setError(err instanceof ApiError ? t('login.err_password') : t('common.error_generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-[var(--color-bg)] lg:grid-cols-2">
      <main className="relative flex flex-col px-6 py-8 sm:px-12">
        <div className="flex justify-end">
          <PreferencesBar />
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="login-rise text-[22px] font-bold leading-tight tracking-tight text-[var(--color-ink)]" style={rise(0.12)}>
            {t('login.title')}
          </h1>
          <p className="login-rise mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-ink-secondary)]" style={rise(0.18)}>
            {t('login.welcome')}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div className="login-rise" style={rise(0.26)}>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('common.phone')}</label>
              <div className={fieldClass}>
                <Phone size={17} className="shrink-0 text-[var(--color-ink-tertiary)]" />
                <PhoneInput value={phone} onChange={setPhone} autoFocus className="h-full border-0 text-[14.5px]" />
              </div>
            </div>

            <div className="login-rise" style={rise(0.32)}>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-secondary)]" htmlFor="login-password">
                {t('common.password')}
              </label>
              <div className={fieldClass}>
                <Lock size={17} className="shrink-0 text-[var(--color-ink-tertiary)]" />
                <input
                  id="login-password"
                  type={reveal ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-full min-w-0 flex-1 bg-transparent text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)]"
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? t('login.hide_password') : t('login.show_password')}
                  className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-tertiary)] outline-none transition-colors hover:text-[var(--color-ink)] focus-visible:bg-[var(--color-surface-alt)]"
                >
                  {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[13px] font-medium text-[var(--color-danger)]">
                {error}
              </p>
            )}

            <div className="login-rise pt-1" style={rise(0.38)}>
              <Button
                ref={submitRef}
                type="submit"
                loading={loading}
                disabled={phone.length < 9 || password.length === 0}
                className={cn('h-12 w-full rounded-xl text-[15px] font-semibold')}
              >
                {t('login.submit')}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center font-mono text-[11px] tracking-wide text-[var(--color-ink-tertiary)]">AGNKS · CMG</p>
      </main>

      <LoginArt />
      {welcome && <WelcomeReveal {...welcome} />}
    </div>
  )
}
