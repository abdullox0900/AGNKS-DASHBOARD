import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, CircleAlert, CircleCheck, Clock, Download, LogOut, UserX } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { FaceWait, Person, REASON_KEYS, StateLabel, dstate, useFaceDate, useNote, type DState } from '@/features/faceid/ui'
import { useFaceData } from '@/features/faceid/useFaceData'
import { BRANCHES, countOf, nowLabel, dayLabel, dayRecords, scanEvents, todayStr, workedLabel, type DayRecord } from '@/features/faceid/mock'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const card = 'fid-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]'
const th = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-tertiary)]'
type Mode = 'all' | 'here' | 'late' | 'left'

/** A stat card inside the top band. */
function Stat({ icon: Icon, label, value, sub, tone }: { icon: typeof UserX; label: string; value: number; sub?: string; tone?: string }) {
  return (
    <div className="min-h-[112px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-3.5">
      <p className="flex items-center gap-2 text-[13.5px] text-[var(--color-ink-secondary)]">
        <Icon size={17} className={tone} /> {label}
      </p>
      <p className="tnum mt-1.5 text-[34px] font-bold leading-none">{value}</p>
      {sub && <p className="mt-2 text-[12.5px] text-[var(--color-ink-secondary)]">{sub}</p>}
    </div>
  )
}

function AbsentRow({ r, date }: { r: DayRecord; date: string }) {
  const { t } = useI18n()
  const { note, reason } = useNote(r, date)
  return (
    <Link to={`/faceid/employees/${r.employee.id}`} className="flex items-center gap-3 border-t border-[var(--color-border)] px-4 py-2.5 first:border-0 hover:bg-[var(--color-surface-alt)]">
      <Person e={r.employee} size={42} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{r.employee.name}</span>
        <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">
          {BRANCHES[r.employee.branch].name} · {note || t(REASON_KEYS[reason ?? 'none'])}
        </span>
      </span>
      <CircleAlert size={16} className="text-[var(--color-danger)]" />
    </Link>
  )
}

/** "Umumiy": today at a glance — four numbers, branches, the day's table, scans, late and absent. */
export function FaceOverviewPage() {
  const { t, locale } = useI18n()
  const { show } = useToast()
  const [date] = useFaceDate()
  const load = useFaceData({ day: date, events: date })
  const isToday = date === todayStr()
  const records = dayRecords(date)
  const staff = records.filter((r) => r.status !== 'off')
  const [mode, setMode] = useState<Mode>('all')
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => setSlot(document.getElementById('fid-hero')), [])
  if (!load.ready) return <FaceWait load={load} />

  const st = (r: DayRecord) => dstate(r, isToday)
  const came = staff.filter((r) => r.status === 'came' || r.status === 'late')
  const nHere = isToday ? staff.filter((r) => r.now).length : came.length
  const nLeft = staff.filter((r) => isToday && r.out).length
  const nLate = countOf(staff, 'late')
  const nAbsent = countOf(staff, 'absent')
  const nPending = countOf(staff, 'pending')
  const lateHere = staff.filter((r) => r.now && r.status === 'late').length
  const known = staff.filter((r) => !(isToday && !BRANCHES[r.employee.branch].terminal.online))
  const attendance = known.length ? Math.round((came.length / known.length) * 100) : 0
  const dateText = dayLabel(date, locale)

  const order = (r: DayRecord) => ({ here: 0, late: 1, left: 2, absent: 3, pending: 4 })[st(r)]
  const match: Record<Mode, (r: DayRecord) => boolean> = {
    all: () => true,
    here: (r) => (isToday ? !!r.now : r.status === 'came' || r.status === 'late'),
    late: (r) => r.status === 'late',
    left: (r) => st(r) === 'left',
  }
  const sorted = staff.filter(match[mode]).sort((a, b) => order(a) - order(b) || a.employee.name.localeCompare(b.employee.name))
  const pick = (g: number, n: number) => sorted.filter((r) => order(r) === g).slice(0, n)
  const rows = mode === 'all' ? [...pick(0, 4), ...pick(1, 2), ...pick(2, 2), ...pick(3, 1), ...pick(4, 1)] : sorted.slice(0, 9)
  const chips: { id: Mode; label: string; n: number }[] = [
    { id: 'all', label: t('fid.f_all'), n: staff.length },
    { id: 'here', label: isToday ? t('fid.f_here') : t('fid.t_came'), n: staff.filter(match.here).length },
    { id: 'late', label: t('fid.f_late'), n: nLate },
    ...(isToday ? [{ id: 'left' as Mode, label: t('fid.f_left'), n: nLeft }] : []),
  ]

  const feed = scanEvents(date).slice(0, 6)
  const lates = staff.filter((r) => r.status === 'late').sort((a, b) => (a.in ?? '').localeCompare(b.in ?? ''))
  const absents = staff.filter((r) => r.status === 'absent')

  return (
    <div>
      {slot &&
        createPortal(
          <div className="mt-5 grid gap-6 pb-1 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-end">
            <div>
              <p className="text-[13px] text-[var(--color-ink-secondary)]">
                {dateText} · {t('fid.attendance', { p: attendance })}
              </p>
              <p className="mt-1 flex items-end gap-3">
                <span className="tnum text-[84px] font-bold leading-[0.9] tracking-tight">{nHere}</span>
                <span className="pb-1">
                  <span className="tnum block text-[30px] font-semibold leading-none text-[var(--color-ink-tertiary)]">/ {staff.length}</span>
                  <span className="mt-1 block text-[14px] font-medium">{isToday ? t('fid.hero_now') : t('fid.hero_came')}</span>
                </span>
              </p>
            </div>
            <div className={cn('grid gap-3 sm:grid-cols-2 xl:ml-auto xl:w-full xl:max-w-[760px]', isToday ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
              <Stat icon={CircleCheck} label={isToday ? t('fid.col_here') : t('fid.t_came')} value={nHere} tone="text-[var(--color-success)]" sub={lateHere || (!isToday && nLate) ? t('fid.of_late', { n: isToday ? lateHere : nLate }) : undefined} />
              {isToday && <Stat icon={LogOut} label={t('fid.col_left')} value={nLeft} />}
              <Stat icon={UserX} label={t('fid.col_absent')} value={nAbsent} />
              {isToday ? <Stat icon={Clock} label={t('fid.t_pending')} value={nPending} /> : <Stat icon={Clock} label={t('fid.col_late')} value={nLate} />}
            </div>
          </div>,
          slot,
        )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
      {/* branches */}
      <section className={cn(card, 'overflow-hidden')}>
        <div className="flex items-center justify-between px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('fid.branches')}</h3>
          <Button variant="ghost" size="sm" onClick={() => show(t('fid.sample_toast'))}>
            <Download size={14} /> Excel
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead className="bg-[var(--color-surface-alt)]/60">
              <tr>
                <th className={th}>{t('fid.col_branch')}</th>
                <th className={th}>{t('fid.col_terminal')}</th>
                <th className={cn(th, 'text-right')}>{t('fid.col_here')}</th>
                <th className={cn(th, 'text-right')}>{t('fid.col_late')}</th>
                <th className={cn(th, 'text-right')}>{t('fid.col_left')}</th>
                <th className={cn(th, 'text-right')}>{t('fid.col_absent')}</th>
                <th className={cn(th, 'text-right')}>{t('fid.col_total')}</th>
                <th className={cn(th, 'pr-5 text-right')}>{t('fid.col_att')}</th>
              </tr>
            </thead>
            <tbody>
              {BRANCHES.map((b) => {
                const list = staff.filter((r) => r.employee.branch === b.id)
                const blind = isToday && !b.terminal.online
                const cm = list.filter((r) => r.status === 'came' || r.status === 'late').length
                const num = (n: number, tone?: string) => (blind ? <span className="text-[var(--color-ink-tertiary)]">—</span> : <span className={cn('tnum', tone)}>{n}</span>)
                return (
                  <tr key={b.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]">
                    <td className="px-3 py-3 pl-5 font-semibold text-[var(--color-ink)]">
                      <Link to={`/faceid/branches#b${b.id}`}>{b.name}</Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center gap-2 text-[13px]', b.terminal.online ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-tertiary)]')}>
                        <span className={cn('h-2 w-2 rounded-full', b.terminal.online ? 'bg-[var(--color-success)]' : 'border border-[var(--color-ink-tertiary)]')} />
                        {b.terminal.online ? t('fid.on') : t('fid.off')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">{num(isToday ? list.filter((r) => r.now).length : cm)}</td>
                    <td className="px-3 py-3 text-right">{num(countOf(list, 'late'), 'text-[var(--color-amber)]')}</td>
                    <td className="px-3 py-3 text-right">{num(isToday ? list.filter((r) => r.out).length : 0)}</td>
                    <td className="px-3 py-3 text-right">{num(countOf(list, 'absent'), 'text-[var(--color-danger)]')}</td>
                    <td className="tnum px-3 py-3 text-right text-[var(--color-ink-secondary)]">{list.length}</td>
                    <td className="px-3 py-3 pr-5 text-right font-semibold">{blind ? <span className="text-[var(--color-ink-tertiary)]">—</span> : <span className="tnum">{list.length ? Math.round((cm / list.length) * 100) : 0}%</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* day table */}
      <section className={cn(card, 'overflow-hidden')}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('fid.day_sheet')}</h3>
          <div className="flex gap-1.5">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setMode(c.id)}
                className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium', mode === c.id ? 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'border-[var(--color-border)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]')}
              >
                {c.label} <span className="tnum opacity-70">{c.n}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[13.5px]">
            <thead className="bg-[var(--color-surface-alt)]/60">
              <tr>
                <th className={cn(th, 'pl-5')}>{t('fid.c_employee')}</th>
                <th className={th}>{t('fid.in')}</th>
                <th className={th}>{t('fid.out')}</th>
                <th className={th}>{t('fid.col_branch')}</th>
                <th className={th}>{t('fid.col_span')}</th>
                <th className={th}>{t('fid.col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employee.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]">
                  <td className="px-3 py-2.5 pl-5">
                    <Link to={`/faceid/employees/${r.employee.id}`} className="flex items-center gap-3">
                      <Person e={r.employee} size={42} />
                      <span>
                        <span className="block font-semibold text-[var(--color-ink)]">{r.employee.name}</span>
                        <span className="block text-[12px] text-[var(--color-ink-tertiary)]">{r.employee.position}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn('tnum font-semibold', r.status === 'late' ? 'text-[var(--color-amber)]' : 'text-[var(--color-ink)]')}>{r.in ?? '—'}</span>
                  </td>
                  <td className="tnum px-3 py-2.5 text-[var(--color-ink-tertiary)]">{r.out ?? '—'}</td>
                  <td className="px-3 py-2.5 font-medium text-[var(--color-ink)]">{BRANCHES[r.employee.branch].name}</td>
                  <td className="tnum px-3 py-2.5 text-[var(--color-ink-secondary)]">{r.worked !== undefined ? workedLabel(r.worked) : '—'}</td>
                  <td className="px-3 py-2.5">
                    <StateLabel state={st(r)} isToday={isToday} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-[12.5px]">
          <span className="text-[var(--color-ink-tertiary)]">{t('fid.asof', { date: dateText, time: isToday ? nowLabel() : '23:59' })}</span>
          <Link to="/faceid/employees" className="font-medium text-[var(--color-primary)]">
            {t('fid.see_all', { n: staff.length })} →
          </Link>
        </div>
      </section>

        </div>
      {/* passes / late / absent */}
      <div className="space-y-4">
        <section className={cn(card, 'flex min-h-[220px] flex-col overflow-hidden')}>
          <h3 className="flex items-center justify-between px-5 py-3.5 text-[15px] font-semibold text-[var(--color-ink)]">
            {t('fid.passes')}
            <span className="tnum rounded-md bg-[var(--color-surface-alt)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-ink-secondary)]">{scanEvents(date).length}</span>
          </h3>
          {feed.length === 0 && <p className="flex flex-1 items-center justify-center border-t border-[var(--color-border)] px-5 text-[13px] text-[var(--color-ink-tertiary)]">{t('fid.none')}</p>}
          {feed.map((ev) => (
            <Link key={ev.id} to={`/faceid/employees/${ev.employee.id}`} className="flex items-center gap-3 border-t border-[var(--color-border)] px-4 py-2.5 hover:bg-[var(--color-surface-alt)]">
              <Person e={ev.employee} size={42} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{ev.employee.name}</span>
                <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">{ev.branch.name}</span>
              </span>
              <span className="tnum text-[13px] text-[var(--color-ink-secondary)]">{ev.time}</span>
              <span className={ev.kind === 'in' ? 'text-[var(--color-success)]' : 'text-[var(--color-ink-tertiary)]'} title={ev.kind === 'in' ? t('fid.in') : t('fid.out')}>
                {ev.kind === 'in' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
              </span>
            </Link>
          ))}
        </section>

        <section className={cn(card, 'flex min-h-[220px] flex-col overflow-hidden')}>
          <h3 className="flex items-center justify-between px-5 py-3.5 text-[15px] font-semibold text-[var(--color-ink)]">
            {t('fid.lates')}
            <span className="tnum rounded-md bg-[var(--color-surface-alt)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-ink-secondary)]">{lates.length}</span>
          </h3>
          {lates.length === 0 && <p className="flex flex-1 items-center justify-center border-t border-[var(--color-border)] px-5 text-[13px] text-[var(--color-ink-tertiary)]">{t('fid.all_ok')}</p>}
          {lates.slice(0, 6).map((r) => (
            <Link key={r.employee.id} to={`/faceid/employees/${r.employee.id}`} className="flex items-center gap-3 border-t border-[var(--color-border)] px-4 py-2.5 hover:bg-[var(--color-surface-alt)]">
              <Person e={r.employee} size={42} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{r.employee.name}</span>
                <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">
                  {BRANCHES[r.employee.branch].name} · {r.employee.position}
                </span>
              </span>
              <span className="tnum text-[13px] font-semibold text-[var(--color-amber)]">{r.in}</span>
              <CircleAlert size={16} className="text-[var(--color-amber)]" />
            </Link>
          ))}
        </section>

        <section className={cn(card, 'flex min-h-[220px] flex-col overflow-hidden')}>
          <h3 className="flex items-center justify-between px-5 py-3.5 text-[15px] font-semibold text-[var(--color-ink)]">
            {t('fid.absentees')}
            <span className="tnum rounded-md bg-[var(--color-surface-alt)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-ink-secondary)]">{absents.length}</span>
          </h3>
          {absents.length === 0 && <p className="flex flex-1 items-center justify-center border-t border-[var(--color-border)] px-5 text-[13px] text-[var(--color-ink-tertiary)]">{t('fid.all_ok')}</p>}
          {absents.slice(0, 6).map((r) => (
            <AbsentRow key={r.employee.id} r={r} date={date} />
          ))}
        </section>
      </div>
      </div>
    </div>
  )
}

export type { DState }
