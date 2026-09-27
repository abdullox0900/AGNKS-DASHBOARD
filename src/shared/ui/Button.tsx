import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/shared/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[var(--color-primary)] text-[var(--color-primary-ink)] hover:opacity-90 disabled:opacity-40',
  secondary:
    'bg-transparent border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] disabled:opacity-40',
  ghost: 'bg-transparent text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-90',
}

const sizeClasses: Record<Size, string> = {
  md: 'h-10 px-4 text-[14px]',
  sm: 'h-8 px-3 text-[13px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
})
