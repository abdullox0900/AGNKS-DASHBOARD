import { cn } from '@/shared/lib/cn'

export type SendTimeMode = 'none' | 'now' | 'start' | 'custom'

const LABELS: Record<SendTimeMode, string> = {
  none: 'Yubormaslik',
  now: 'Hozir',
  start: 'Aksiya boshlanganda',
  custom: 'Boshqa vaqt',
}

/** "When do clients get this message" — shared by the broadcast and promotion forms. */
export function SendTimePicker({
  modes,
  mode,
  onModeChange,
  customAt,
  onCustomAtChange,
}: {
  modes: SendTimeMode[]
  mode: SendTimeMode
  onModeChange: (mode: SendTimeMode) => void
  /** datetime-local value (browser local time = Tashkent for dashboard users) */
  customAt: string
  onCustomAtChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
              mode === m
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]',
            )}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>
      {mode === 'custom' && (
        <input
          type="datetime-local"
          value={customAt}
          min={toLocalInput(new Date())}
          onChange={(e) => onCustomAtChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-2 text-[13px]"
        />
      )}
    </div>
  )
}

/** Resolves the picker state to the ISO timestamp the API expects (null = don't send). */
export function resolveSendAt(mode: SendTimeMode, customAt: string, startsAtLocal?: string): string | null {
  if (mode === 'none') return null
  if (mode === 'now') return new Date().toISOString()
  if (mode === 'start') return startsAtLocal ? new Date(startsAtLocal).toISOString() : null
  return customAt ? new Date(customAt).toISOString() : null
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
