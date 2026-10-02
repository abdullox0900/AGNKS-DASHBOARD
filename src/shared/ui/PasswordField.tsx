import { useState } from 'react'
import { Copy, Eye, EyeOff, Wand2 } from 'lucide-react'
import { useI18n } from '@/app/providers/I18nProvider'
import { useToast } from '@/shared/ui/Toast'
import { generatePassword } from '@/shared/lib/password'
import { cn } from '@/shared/lib/cn'

const iconBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--color-ink-tertiary)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-ink)] disabled:opacity-40'

/** Password input with show/hide, copy and (optionally) a generator — readable by design, SEO needs to see what they set. */
export function PasswordField({
  value,
  onChange,
  generate,
  placeholder,
  autoComplete = 'new-password',
}: {
  value: string
  onChange: (v: string) => void
  /** show a generator button; 'digits' makes a 6-digit password (easy to type on a phone) */
  generate?: boolean | 'digits'
  placeholder?: string
  autoComplete?: string
}) {
  const { t } = useI18n()
  const { show } = useToast()
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex h-10 items-center gap-0.5 rounded-lg border border-[var(--color-border)] pl-3 pr-1 focus-within:border-[var(--color-primary)]">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn('min-w-0 flex-1 bg-transparent text-[13px] outline-none', visible && 'font-mono')}
      />
      {generate && (
        <button
          type="button"
          title={t('admins.generate')}
          className={iconBtn}
          onClick={() => {
            onChange(generate === 'digits' ? generatePassword(6, true) : generatePassword())
            setVisible(true)
          }}
        >
          <Wand2 size={15} />
        </button>
      )}
      <button
        type="button"
        title={t('common.copy')}
        disabled={!value}
        className={iconBtn}
        onClick={() => {
          void navigator.clipboard.writeText(value)
          show(t('common.copied'))
        }}
      >
        <Copy size={15} />
      </button>
      <button type="button" title={visible ? t('common.hide') : t('common.show')} className={iconBtn} onClick={() => setVisible((v) => !v)}>
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}
