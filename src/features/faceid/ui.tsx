import { NavLink, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleX, Clock, LogOut, type LucideIcon } from 'lucide-react'
import { create } from 'zustand'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import { addDays, dayLabel, defaultNote, todayStr, type DayRecord, type Employee, type Status } from './mock'
import type { DictKey } from '@/shared/config/dictionaries'

/** Display state of one day: what the table shows. "late" stays at work, "left" has scanned out. */
export type DState = 'here' | 'late' | 'left' | 'absent' | 'pending'

export const dstate = (r: DayRecord, isToday: boolean): DState => {
  if (r.status === 'absent') return 'absent'
  if (r.status === 'pending' || r.status === 'off') return 'pending'
  if (isToday && r.out) return 'left'
  return r.status === 'late' ? 'late' : 'here'
}

export const DSTATE_META: Record<DState, { icon: LucideIcon; text: string; bg: string }> = {
  here: { icon: CircleCheck, text: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-soft)]' },
  late: { icon: CircleAlert, text: 'text-[var(--color-amber)]', bg: 'bg-[var(--color-amber-soft)]' },
  left: { icon: LogOut, text: 'text-[var(--color-ink-secondary)]', bg: 'bg-[var(--color-surface-alt)]' },
  absent: { icon: CircleX, text: 'text-[var(--color-danger)]', bg: 'bg-[var(--color-danger-soft)]' },
  pending: { icon: Clock, text: 'text-[var(--color-ink-tertiary)]', bg: 'bg-[var(--color-surface-alt)]' },
}

/** Icon + coloured word — never colour alone. */
export function StateLabel({ state, isToday = true }: { state: DState; isToday?: boolean }) {
  const { t } = useI18n()
  const m = DSTATE_META[state]
  const label = state === 'here' ? (isToday ? t('fid.col_here') : t('fid.s_came')) : state === 'late' ? t('fid.col_late') : state === 'left' ? t('fid.col_left') : state === 'absent' ? t('fid.col_absent') : t('fid.t_pending')
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium', m.text)}>
      <m.icon size={16} />
      {label}
    </span>
  )
}

/** Arrival time with "x min early / late" under it. */
export function ArrivalCell({ r }: { r: DayRecord }) {
  const { t } = useI18n()
  if (!r.in) return <span className="text-[var(--color-ink-tertiary)]">—</span>
  return (
    <span className="block leading-tight">
      <span className={cn('tnum block text-[13px] font-semibold', r.status === 'late' ? 'text-[var(--color-amber)]' : 'text-[var(--color-ink)]')}>{r.in}</span>
      {(r.late || r.early) && <span className={cn('block text-[11.5px]', r.late ? 'text-[var(--color-amber)]' : 'text-[var(--color-success)]')}>{r.late ? t('fid.late_by', { n: r.late }) : t('fid.early', { n: r.early! })}</span>}
    </span>
  )
}

export const hoursLabel = (min?: number, now?: boolean, t?: (k: DictKey) => string) =>
  now ? (t ? t('fid.at_work') : '…') : min === undefined ? '—' : `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

const hue = (n: string) => {
  let h = 0
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360
  return h
}
const initials = (n: string) =>
  n
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')

/** Round initials badge standing in for the face photo. */
export function Person({ e, size = 34 }: { e: Pick<Employee, 'name'>; size?: number }) {
  const h = hue(e.name)
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.34, background: `hsl(${h} 50% 50% / 0.16)`, color: `hsl(${h} 60% 62%)` }}
    >
      {initials(e.name)}
    </span>
  )
}

// ---------- manager notes (sample: lives in memory until the section is connected) ----------
interface NoteState {
  notes: Record<string, string>
  set: (key: string, text: string) => void
}
export const useNotes = create<NoteState>((set) => ({ notes: {}, set: (key, text) => set((s) => ({ notes: { ...s.notes, [key]: text } })) }))
export const noteKey = (r: DayRecord, date: string) => `${r.employee.id}|${date}`
export function useNote(r: DayRecord, date: string): [string, (text: string) => void] {
  const stored = useNotes((s) => s.notes[noteKey(r, date)])
  const set = useNotes((s) => s.set)
  return [stored ?? defaultNote(r), (text) => set(noteKey(r, date), text)]
}

// ---------- shell ----------
const TABS: { to: string; label: DictKey; end?: boolean }[] = [
  { to: '/faceid', label: 'fid.tab_overview', end: true },
  { to: '/faceid/employees', label: 'fid.tab_employees' },
  { to: '/faceid/branches', label: 'fid.tab_branches' },
  { to: '/faceid/analytics', label: 'fid.tab_analytics' },
]

export function FaceTabs() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const keep = params.get('d') ? `?d=${params.get('d')}` : ''
  return (
    <nav className="flex flex-wrap gap-1.5 text-[13.5px] font-medium">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={`${tab.to}${tab.to === '/faceid/analytics' ? '' : keep}`}
          end={tab.end}
          className={({ isActive }) => cn('rounded-lg px-3.5 py-2 transition-colors', isActive ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]')}
        >
          {t(tab.label)}
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

export type { Status }
