import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { formatLocal, toLocalDigits } from '@/shared/lib/phone'

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  /** the 9 local digits, e.g. "900431160" */
  value: string
  onChange: (digits: string) => void
  /** size/border/background classes for the outer box */
  className?: string
}

/** Phone field with a fixed, non-deletable "+998" prefix; the rest is typed as "90 043 11 60". */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, onChange, className, ...rest },
  ref,
) {
  return (
    <label className={cn('flex w-full cursor-text items-center gap-1.5 focus-within:border-[var(--color-primary)]', className)}>
      <span className="shrink-0 select-none font-medium text-[var(--color-ink)]">+998</span>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="90 123 45 67"
        {...rest}
        value={formatLocal(value)}
        onChange={(e) => onChange(toLocalDigits(e.target.value))}
        className="tnum min-w-0 flex-1 bg-transparent text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)]"
      />
    </label>
  )
})
