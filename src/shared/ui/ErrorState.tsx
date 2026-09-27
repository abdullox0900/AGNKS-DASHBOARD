import { AlertCircle } from 'lucide-react'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <AlertCircle size={26} className="text-[var(--color-ink-tertiary)]" />
      <p className="max-w-[280px] text-[14px] text-[var(--color-ink-secondary)]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-[13px] font-semibold text-[var(--color-primary)] hover:opacity-70">
          Qayta urinish
        </button>
      )}
    </div>
  )
}
