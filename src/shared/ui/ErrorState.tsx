import { AlertCircle } from 'lucide-react'
import { useI18n } from '@/app/providers/I18nProvider'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <AlertCircle size={26} className="text-[var(--color-ink-tertiary)]" />
      <p className="max-w-[280px] text-[14px] text-[var(--color-ink-secondary)]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-[13px] font-semibold text-[var(--color-primary)] hover:opacity-70">
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}
