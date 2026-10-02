import { useState } from 'react'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { useI18n } from '@/app/providers/I18nProvider'
import { useToast } from '@/shared/ui/Toast'
import { Hint } from '@/shared/ui/Menu'

const btn = 'flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-ink-tertiary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-ink)]'

/** Table cell: masked password with show / copy; "not saved" for accounts created before passwords were stored. */
export function PasswordCell({ password }: { password: string | null }) {
  const { t } = useI18n()
  const { show } = useToast()
  const [visible, setVisible] = useState(false)

  if (!password) {
    return (
      <Hint label={t('admins.password_unknown_hint')}>
        <span className="text-[12.5px] text-[var(--color-ink-tertiary)]">{t('admins.password_unknown')}</span>
      </Hint>
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="min-w-[92px] font-mono text-[12.5px] text-[var(--color-ink)]">{visible ? password : '••••••••'}</span>
      <button
        title={visible ? t('common.hide') : t('common.show')}
        onClick={(e) => {
          e.stopPropagation()
          setVisible((v) => !v)
        }}
        className={btn}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      <button
        title={t('common.copy')}
        onClick={(e) => {
          e.stopPropagation()
          void navigator.clipboard.writeText(password)
          show(t('common.copied'))
        }}
        className={btn}
      >
        <Copy size={14} />
      </button>
    </span>
  )
}
