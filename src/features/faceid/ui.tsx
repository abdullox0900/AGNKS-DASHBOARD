import { useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleX, Clock, LogOut, type LucideIcon } from 'lucide-react'
import { useToast } from '@/shared/ui/Toast'
import { apiFaceSaveNote } from '@/shared/api/faceid'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import { LIVE, addDays, dayLabel, defaultNote, todayStr, type DayRecord, type Employee, type Reason, type Status } from './mock'
import { useNotes } from './notes'
import type { FaceLoad } from './useFaceData'
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

/** The face photo when TimeFace has one, otherwise round initials. */
export function Person({ e, size = 34 }: { e: Pick<Employee, 'name' | 'photo'>; size?: number }) {
  const [broken, setBroken] = useState(false)
  const h = hue(e.name)
  if (e.photo && !broken) {
    return <img src={e.photo} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className="shrink-0 rounded-full bg-[var(--color-surface-alt)] object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.34, background: `hsl(${h} 50% 50% / 0.16)`, color: `hsl(${h} 60% 62%)` }}
    >
      {initials(e.name)}
    </span>
  )
}

// ---------- manager notes (reason for a late / absent day) ----------
export const REASON_KEYS: Record<Reason, DictKey> = { sick: 'fid.rs_sick', leave: 'fid.rs_leave', none: 'fid.rs_none', trip: 'fid.rs_trip', other: 'fid.rs_other' }
const REASONS = Object.keys(REASON_KEYS) as Reason[]

export function useNote(r: DayRecord, date: string) {
  const key = `${r.employee.id}|${date}`
  const stored = useNotes((s) => s.notes[key])
  const set = useNotes((s) => s.set)
  const note = stored ? stored.note : LIVE.on ? '' : defaultNote(r)
  const reason = ((stored ? stored.reason : r.reason) ?? null) as Reason | null
  /** live: saved on the server first (throws if it refused); sample: memory only */
  const save = async (text: string, why: Reason | null) => {
    if (LIVE.on) await apiFaceSaveNote({ employeeId: r.employee.id, date, reason: why, note: text || null })
    set(key, { note: text, reason: why })
    r.reason = why ?? undefined
  }
  return { note, reason, save }
}

/** Inline editor: the note, plus the reason for an absent day. Enter or ✓ saves. */
export function NoteEditor({ r, date, onDone, width = 190 }: { r: DayRecord; date: string; onDone: () => void; width?: number }) {
  const { t } = useI18n()
  const { show } = useToast()
  const { note, reason, save } = useNote(r, date)
  const [text, setText] = useState(note)
  const [why, setWhy] = useState<Reason | ''>(reason ?? '')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try {
      await save(text.trim(), why || null)
      show(t('fid.note_saved'))
      onDone()
    } catch {
      show(t('fid.err_note'))
      setBusy(false)
    }
  }
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {r.status === 'absent' && (
        <select value={why} onChange={(e) => setWhy(e.target.value as Reason | '')} className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 text-[12.5px] text-[var(--color-ink)] outline-none">
          <option value="">{t('fid.reason')}</option>
          {REASONS.map((k) => (
            <option key={k} value={k}>
              {t(REASON_KEYS[k])}
            </option>
          ))}
        </select>
      )}
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !busy && void submit()}
        placeholder={t('fid.note_ph')}
        style={{ width }}
        className="h-8 min-w-0 rounded-md border border-[var(--color-primary)] bg-[var(--color-bg)] px-2 text-[12.5px] text-[var(--color-ink)] outline-none"
      />
      <button type="button" disabled={busy} aria-label={t('common.save')} onClick={() => void submit()} className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-primary)] text-[var(--color-primary-ink)] disabled:opacity-50">
        <Check size={14} />
      </button>
    </span>
  )
}

/** What a FaceID screen shows until its data is here (or when TimeFace could not be reached). */
export function FaceWait({ load }: { load: FaceLoad }) {
  const { t } = useI18n()
  if (load.error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
        <CircleAlert size={26} className="text-[var(--color-amber)]" />
        <p className="max-w-sm text-[14px] text-[var(--color-ink-secondary)]">{t('fid.err_unavailable')}</p>
        <button type="button" onClick={load.retry} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-[13px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]">
          {t('common.retry')}
        </button>
      </div>
    )
  }
  return <p className="py-20 text-center text-[14px] text-[var(--color-ink-tertiary)]">{t('common.loading')}</p>
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
