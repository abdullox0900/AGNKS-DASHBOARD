import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, KeyRound } from 'lucide-react'
import { GlobalFiltersBar } from '@/features/global-filters/GlobalFiltersBar'
import { useAuthStore } from '@/shared/config/authStore'
import { Drawer } from '@/shared/ui/Drawer'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { apiChangePassword } from '@/shared/api/client'
import { ApiError } from '@/shared/api/errors'

const ROLE_LABEL: Record<string, string> = {
  root_admin: 'Root admin',
  branch_manager: 'Filial rahbari',
  seo: 'SEO',
}

export function Topbar() {
  const navigate = useNavigate()
  const firstName = useAuthStore((s) => s.firstName)
  const phone = useAuthStore((s) => s.phone)
  const role = useAuthStore((s) => s.role)
  const logout = useAuthStore((s) => s.logout)
  const [menuOpen, setMenuOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6">
      <GlobalFiltersBar />

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--color-surface-alt)]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[13px] font-semibold text-[var(--color-primary)]">
            {firstName?.[0] ?? '?'}
          </div>
          <div className="text-left">
            <p className="text-[13px] font-medium text-[var(--color-ink)]">{firstName}</p>
            <p className="text-[11px] text-[var(--color-ink-tertiary)]">{role ? ROLE_LABEL[role] : ''}</p>
          </div>
          <ChevronDown size={14} className="text-[var(--color-ink-tertiary)]" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5"
            style={{ boxShadow: 'var(--shadow-popover)' }}
          >
            <button
              onClick={() => {
                setMenuOpen(false)
                setPasswordOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]"
            >
              <KeyRound size={14} /> Parolni o'zgartirish
            </button>
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
            >
              <LogOut size={14} /> Chiqish
            </button>
          </div>
        )}
      </div>

      <Drawer open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Parolni o'zgartirish">
        <ChangePasswordForm phone={phone} onDone={() => setPasswordOpen(false)} />
      </Drawer>
    </header>
  )
}

function ChangePasswordForm({ phone, onDone }: { phone: string | null; onDone: () => void }) {
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
      show('Parol yangilandi')
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? "Joriy parol noto'g'ri" : 'Xatolik yuz berdi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Joriy parol</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Yangi parol</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Yangi parolni takrorlang</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-primary)]"
        />
        {next && confirm && next !== confirm && (
          <p className="mt-1 text-[12px] font-medium text-[var(--color-danger)]">Parollar mos emas</p>
        )}
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--color-danger)]">{error}</p>}
      <Button className="w-full" disabled={!canSubmit} loading={submitting} onClick={handleSubmit}>
        Saqlash
      </Button>
    </div>
  )
}
