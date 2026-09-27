import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fuel, KeyRound } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { apiLogin, apiRecoveryLogin } from '@/shared/api/client'
import { ApiError } from '@/shared/api/errors'
import { useAuthStore } from '@/shared/config/authStore'
import { PhoneInput } from '@/shared/ui/PhoneInput'
import { toE164 } from '@/shared/lib/phone'

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  const [mode, setMode] = useState<'password' | 'recovery'>('password')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { accessToken, user } =
        mode === 'password' ? await apiLogin(toE164(phone), password) : await apiRecoveryLogin(toE164(phone), recoveryCode)
      setSession({
        userId: user.id,
        firstName: user.firstName,
        phone: user.phone,
        role: user.role,
        stationId: user.stationId,
        stationName: user.stationName,
        accessToken,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? mode === 'password'
            ? "Telefon yoki parol noto'g'ri"
            : "Telefon yoki zapas kod noto'g'ri"
          : 'Xatolik yuz berdi',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)]">
            <Fuel size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[var(--color-ink)]">AGNKS Dashboard</p>
            <p className="text-[12px] text-[var(--color-ink-tertiary)]">Rahbarlar paneli</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Telefon</label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              autoFocus
              className="h-11 rounded-lg border border-[var(--color-border)] px-3 text-[14px]"
            />
          </div>
          {mode === 'password' ? (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Parol</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-[var(--color-border)] px-3 text-[14px] outline-none focus:border-[var(--color-primary)]"
                placeholder="••••••••"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Zapas kod</label>
              <input
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                className="h-11 w-full rounded-lg border border-[var(--color-border)] px-3 font-mono text-[14px] outline-none focus:border-[var(--color-primary)]"
                placeholder="000000-000000"
              />
            </div>
          )}
          {error && <p className="text-[13px] font-medium text-[var(--color-danger)]">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Kirish
          </Button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'password' ? 'recovery' : 'password')
              setError(null)
            }}
            className="flex w-full items-center justify-center gap-1.5 pt-1 text-[12.5px] font-medium text-[var(--color-ink-tertiary)] hover:text-[var(--color-primary)]"
          >
            <KeyRound size={13} />
            {mode === 'password' ? 'Parolni unutdingizmi? Zapas kod bilan kirish' : 'Parol bilan kirish'}
          </button>
        </form>
      </div>
    </div>
  )
}
