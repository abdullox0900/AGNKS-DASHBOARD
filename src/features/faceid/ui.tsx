import { NavLink, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import { addDays, dayLabel, todayStr, type Employee, type Status } from './mock'
import type { DictKey } from '@/shared/config/dictionaries'

export const STATUS_META: Record<Status, { label: DictKey; dot: string; chip: string; cell: string }> = {
  came: { label: 'fid.s_came', dot: 'bg-[var(--color-success)]', chip: 'bg-[var(--color-success-soft)] text-[var(--color-success)]', cell: 'bg-[var(--color-success-soft)] text-[var(--color-success)]' },
  late: { label: 'fid.s_late', dot: 'bg-[var(--color-amber)]', chip: 'bg-[var(--color-amber-soft)] text-[var(--color-amber)]', cell: 'bg-[var(--color-amber-soft)] text-[var(--color-amber)]' },
  absent: { label: 'fid.s_absent', dot: 'bg-[var(--color-danger)]', chip: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]', cell: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]' },
  pending: { label: 'fid.s_pending', dot: 'border border-[var(--color-ink-tertiary)] bg-transparent', chip: 'border border-[var(--color-border)] text-[var(--color-ink-tertiary)]', cell: 'bg-[var(--color-surface-alt)] text-[var(--color-ink-tertiary)]' },
  off: { label: 'fid.s_off', dot: 'bg-[var(--color-ink-tertiary)]', chip: 'bg-[var(--color-surface-alt)] text-[var(--color-ink-tertiary)]', cell: 'bg-[var(--color-surface-alt)] text-[var(--color-ink-tertiary)]' },
}

const initials = (n: string) =>
  n
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')

/** Round initials badge standing in for the face photo; the dot shows today's status. */
export function Person({ e, size = 34, status }: { e: Pick<Employee, 'name'>; size?: number; status?: Status }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary)]"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(e.name)}
      {status && <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-surface)]', STATUS_META[status].dot)} />}
    </span>
  )
}

export function StatusChip({ status, extra }: { status: Status; extra?: string }) {
  const { t } = useI18n()
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium', STATUS_META[status].chip)}>
      {t(STATUS_META[status].label)}
      {extra ? ` · ${extra}` : ''}
    </span>
  )
}

export function Legend() {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--color-ink-secondary)]">
      {(['came', 'late', 'absent', 'off'] as Status[]).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', STATUS_META[s].dot)} /> {t(STATUS_META[s].label)}
        </span>
      ))}
    </div>
  )
}

export function Tile({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
      <p className="text-[12px] font-medium text-[var(--color-ink-secondary)]">{label}</p>
      <p className={cn('tnum mt-0.5 text-[26px] font-bold leading-tight', tone ?? 'text-[var(--color-ink)]')}>{value}</p>
    </div>
  )
}

const TABS: { to: string; label: DictKey; end?: boolean }[] = [
  { to: '/faceid', label: 'fid.tab_today', end: true },
  { to: '/faceid/branches', label: 'fid.tab_branches' },
  { to: '/faceid/log', label: 'fid.tab_log' },
  { to: '/faceid/timesheet', label: 'fid.tab_timesheet' },
  { to: '/faceid/unrecognized', label: 'fid.tab_unrecognized' },
]

export function FaceTabs({ unrecognized }: { unrecognized?: number }) {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const keep = params.get('d') ? `?d=${params.get('d')}` : ''
  return (
    <nav className="inline-flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5 text-[13px] font-medium">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={`${tab.to}${tab.to === '/faceid/timesheet' ? '' : keep}`}
          end={tab.end}
          className={({ isActive }) => cn('flex items-center gap-1.5 rounded-md px-3.5 py-1.5', isActive ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]')}
        >
          {t(tab.label)}
          {tab.to === '/faceid/unrecognized' && !!unrecognized && <span className="tnum rounded-full bg-[var(--color-amber)] px-1.5 text-[10.5px] font-bold text-[var(--color-bg)]">{unrecognized}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

/** The chosen day lives in the URL (`?d=2026-11-13`) so a link or a reload keeps it. */
export function useFaceDate(): [string, (d: string) => void] {
  const [params, setParams] = useSearchParams()
  const today = todayStr()
  const raw = params.get('d')
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw <= today ? raw : today
  const set = (d: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p)
      if (d >= today) next.delete('d')
      else next.set('d', d)
      return next
    })
  return [date, set]
}

export function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const { t, locale } = useI18n()
  const today = todayStr()
  const label = dayLabel(date, locale)
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] p-0.5 text-[13px]">
      <button type="button" onClick={() => onChange(addDays(date, -1))} aria-label={t('fid.prev_day')} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]">
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[150px] rounded-md bg-[var(--color-surface-alt)] px-3 py-1.5 text-center font-medium text-[var(--color-ink)]">{date === today ? `${t('fid.today')}, ${label}` : label}</span>
      <button
        type="button"
        disabled={date >= today}
        onClick={() => onChange(addDays(date, 1))}
        aria-label={t('fid.next_day')}
        className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)] disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
