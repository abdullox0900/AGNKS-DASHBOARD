import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, KeyRound, UserRound } from 'lucide-react'
import { GlobalFiltersBar } from '@/features/global-filters/GlobalFiltersBar'
import { useAuthStore } from '@/shared/config/authStore'
import { Drawer } from '@/shared/ui/Drawer'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/shared/ui/Menu'
import { Avatar } from '@/shared/ui/Avatar'
import { NewBadge } from '@/shared/ui/NewBadge'
import { useProfile } from '@/shared/api/hooks'
import { ChangePasswordForm } from '@/features/profile/ChangePasswordForm'
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
  const { data: profile } = useProfile()
  const [passwordOpen, setPasswordOpen] = useState(false)

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6">
      <GlobalFiltersBar />

      <div className="flex items-center gap-3">
      <PreferencesBar />
      <Menu>
        <MenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)] data-[state=open]:bg-[var(--color-surface-alt)]">
          <Avatar src={profile?.avatar} name={profile?.firstName ?? firstName} size={32} />
          <div className="text-left">
            <p className="text-[13px] font-medium text-[var(--color-ink)]">{profile?.firstName ?? firstName}</p>
            <p className="text-[11px] text-[var(--color-ink-tertiary)]">{role ? t(ROLE_LABEL[role]) : ''}</p>
          </div>
          <ChevronDown size={14} className="text-[var(--color-ink-tertiary)]" />
        </MenuTrigger>
        <MenuContent align="end" className="w-52">
          <MenuItem onSelect={() => navigate('/profile')}>
            <UserRound size={14} /> {t('profile.menu')} <NewBadge since="2026-10-12" className="ml-auto" />
          </MenuItem>
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
