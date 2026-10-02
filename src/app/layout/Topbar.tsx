import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, KeyRound } from 'lucide-react'
import { GlobalFiltersBar } from '@/features/global-filters/GlobalFiltersBar'
import { useAuthStore } from '@/shared/config/authStore'
import { Drawer } from '@/shared/ui/Drawer'
import { Button } from '@/shared/ui/Button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/shared/ui/Menu'
import { useToast } from '@/shared/ui/Toast'
import { apiChangePassword } from '@/shared/api/client'
import { ApiError } from '@/shared/api/errors'
import { PreferencesBar } from '@/features/preferences/PreferencesBar'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const ROLE_LABEL: Record<string, DictKey> = {
  root_admin: 'role.root_admin',
  branch_manager: 'role.branch_manager',
  seo: 'role.seo',
}

export function Topbar() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const firstName = useAuthStore((s) => s.firstName)
  const phone = useAuthStore((s) => s.phone)
  const role = useAuthStore((s) => s.role)
  const logout = useAuthStore((s) => s.logout)
  const [passwordOpen, setPasswordOpen] = useState(false)

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6">
      <GlobalFiltersBar />

      <div className="flex items-center gap-3">
      <PreferencesBar />
      <Menu>
        <MenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)] data-[state=open]:bg-[var(--color-surface-alt)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[13px] font-semibold text-[var(--color-primary)]">
            {firstName?.[0] ?? '?'}
          </div>
          <div className="text-left">
            <p className="text-[13px] font-medium text-[var(--color-ink)]">{firstName}</p>
            <p className="text-[11px] text-[var(--color-ink-tertiary)]">{role ? t(ROLE_LABEL[role]) : ''}</p>
          </div>
          <ChevronDown size={14} className="text-[var(--color-ink-tertiary)]" />
        </MenuTrigger>
        <MenuContent align="end" className="w-52">
          <MenuItem onSelect={() => setPasswordOpen(true)}>
            <KeyRound size={14} /> {t('topbar.change_password')}
          </MenuItem>
          <MenuItem
            danger
            onSelect={() => {
              logout()
              navigate('/login')
            }}
          >
            <LogOut size={14} /> {t('topbar.logout')}
          </MenuItem>
        </MenuContent>
      </Menu>
      </div>

      <Drawer open={passwordOpen} onClose={() => setPasswordOpen(false)} title={t('topbar.change_password')}>
        <ChangePasswordForm phone={phone} onDone={() => setPasswordOpen(false)} />
      </Drawer>
    </header>
  )
}

function ChangePasswordForm({ phone, onDone }: { phone: string | null; onDone: () => void }) {
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
