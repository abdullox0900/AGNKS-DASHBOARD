import { Search } from 'lucide-react'

export function SearchInput({ value, onChange, placeholder, className = 'w-full sm:w-[300px]' }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={`flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-ink-tertiary)] focus-within:border-[var(--color-primary)] ${className}`}>
      <Search size={15} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)]" />
    </label>
  )
}
