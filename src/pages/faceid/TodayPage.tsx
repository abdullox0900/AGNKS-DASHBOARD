import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { Person, useFaceDate } from '@/features/faceid/ui'
import { BRANCHES, NOW_H, NOW_LABEL, SHIFT_START, countOf, dayRecords, scanEvents, todayStr, workedLabel, type DayRecord } from '@/features/faceid/mock'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
const card = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]'
const cap = 'text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-tertiary)]'

type Mode = 'all' | 'here' | 'late' | 'left'

/** Where a record sits in "today's" four buckets. */
const isHere = (r: DayRecord) => !!r.now
const isLeft = (r: DayRecord) => !!r.out && r.status !== 'absent'

function Square({ className }: { className: string }) {
  return <span className={cn('inline-block h-2.5 w-2.5 rounded-[3px]', className)} />
}

/** Stacked share bar: here / left / absent, the rest stays empty (still expected). */
function SplitBar({ here, left, absent, total, className }: { here: number; left: number; absent: number; total: number; className?: string }) {
  const w = (n: number) => (total ? `${(n / total) * 100}%` : '0%')
  return (
    <div className={cn('flex h-2 overflow-hidden rounded-full bg-[var(--color-track)]', className)}>
      <span className="bg-[var(--color-success)]" style={{ width: w(here) }} />
      <span className="bg-[var(--color-ink-tertiary)]/60" style={{ width: w(left) }} />
      <span className="bg-[var(--color-danger)]" style={{ width: w(absent) }} />
    </div>
  )
}

const HOUR_FROM = 6
const HOUR_TO = 22
const pos = (min: number) => `${Math.min(100, Math.max(0, ((min / 60 - HOUR_FROM) / (HOUR_TO - HOUR_FROM)) * 100))}%`

/** "Bugun": big counter, branches table, who is late, live scans and the day timeline. */
export function TodayPage() {
  const { t } = useI18n()
  const [date] = useFaceDate()
  const isToday = date === todayStr()
  const records = dayRecords(date)
  const staff = records.filter((r) => r.status !== 'off')
  const [mode, setMode] = useState<Mode>('all')

  const came = records.filter((r) => r.status === 'came' || r.status === 'late')
  const nHere = records.filter(isHere).length
  const nLeft = records.filter(isLeft).length
  const nLate = countOf(records, 'late')
  const nAbsent = countOf(records, 'absent')
  const nPending = countOf(records, 'pending')
  const lateHere = records.filter((r) => isHere(r) && r.status === 'late').length

  const stats = isToday
    ? [
        { label: t('fid.col_here'), n: nHere, sq: 'bg-[var(--color-success)]', sub: lateHere ? t('fid.of_late', { n: lateHere }) : undefined },
        { label: t('fid.col_left'), n: nLeft, sq: 'bg-[var(--color-ink-tertiary)]/60' },
        { label: t('fid.col_absent'), n: nAbsent, sq: 'bg-[var(--color-danger)]' },
        { label: t('fid.t_pending'), n: nPending, sq: 'border border-[var(--color-ink-tertiary)]' },
      ]
    : [
        { label: t('fid.t_came'), n: came.length, sq: 'bg-[var(--color-success)]' },
        { label: t('fid.t_late'), n: nLate, sq: 'bg-[var(--color-amber)]' },
        { label: t('fid.col_absent'), n: nAbsent, sq: 'bg-[var(--color-danger)]' },
      ]

  const lates = records.filter((r) => r.status === 'late').sort((a, b) => toMin(a.in!) - toMin(b.in!))
  const feed = scanEvents(date).slice(0, 7)
  const offline = BRANCHES.filter((b) => !b.terminal.online)

  // ---- day timeline rows
  const order = (r: DayRecord) => (r.status === 'late' && r.now ? 1 : r.now ? 0 : isLeft(r) ? 2 : r.status === 'absent' ? 3 : 4)
  const modeOf: Record<Mode, (r: DayRecord) => boolean> = {
    all: (r) => r.status !== 'off',
    here: (r) => (isToday ? isHere(r) : r.status === 'came' || r.status === 'late'),
    late: (r) => r.status === 'late',
    left: (r) => isLeft(r),
  }
  const sorted = staff.filter(modeOf[mode]).sort((a, b) => order(a) - order(b) || a.employee.name.localeCompare(b.employee.name))
  // "all": a mixed sample (working, late, left, absent, expected) instead of ten people in the same state
  const pick = (g: number, n: number) => sorted.filter((r) => order(r) === g).slice(0, n)
  const rows = mode === 'all' ? [...pick(0, 3), ...pick(1, 2), ...pick(2, 3), ...pick(3, 1), ...pick(4, 1)] : sorted.slice(0, 10)
  const tabs: { id: Mode; label: string; n?: number }[] = [
    { id: 'all', label: t('fid.f_all'), n: staff.length },
    { id: 'here', label: isToday ? t('fid.f_here') : t('fid.t_came'), n: modeOf.here ? staff.filter(modeOf.here).length : 0 },
    { id: 'late', label: t('fid.f_late'), n: nLate },
    ...(isToday ? [{ id: 'left' as Mode, label: t('fid.f_left'), n: nLeft }] : []),
  ]

  return (
    <div>
      {/* hero */}
      <div className={cn(card, 'grid gap-6 p-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center')} style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-end gap-4">
          <div className="rounded-2xl bg-[var(--color-primary-soft)] px-6 py-3">
            <span className="tnum text-[64px] font-bold leading-none tracking-tight text-[var(--color-primary)]">{isToday ? nHere : came.length}</span>
          </div>
          <p className="pb-1">
            <span className="tnum block text-[22px] font-semibold text-[var(--color-ink-tertiary)]">/ {staff.length}</span>
            <span className="block text-[13px] font-medium text-[var(--color-ink-secondary)]">{isToday ? t('fid.hero_now') : t('fid.hero_came')}</span>
          </p>
        </div>
        <div>
          <div className={cn('grid gap-4', stats.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
            {stats.map((s) => (
              <div key={s.label} className="border-l-2 border-[var(--color-border)] pl-3">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-tertiary)]">
                  <Square className={s.sq} />
                  {s.label}
                </p>
                <p className="tnum mt-1 text-[32px] font-bold leading-none text-[var(--color-ink)]">{s.n}</p>
                {s.sub && <p className="mt-1.5 text-[12px] font-medium text-[var(--color-amber)]">{s.sub}</p>}
              </div>
            ))}
          </div>
          <SplitBar here={isToday ? nHere : came.length} left={isToday ? nLeft : 0} absent={nAbsent} total={staff.length} className="mt-4 h-2.5" />
        </div>
      </div>

      {offline.length > 0 && isToday && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[var(--color-amber)]/40 bg-[var(--color-amber-soft)] px-4 py-2.5 text-[13px]">
          <span className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-[var(--color-amber)]">
            <TriangleAlert size={14} /> {t('fid.warn')}
          </span>
          <span className="text-[var(--color-ink)]">
            <span className="font-medium">{t('fid.warn_terminals', { n: offline.length })}</span> {offline.map((b) => b.name).join(', ')}
          </span>
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          {/* branches table */}
          <section className={cn(card, 'overflow-hidden')} style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between px-5 pt-4">
              <h3 className={cap}>{t('fid.branches')}</h3>
              <Link to="/faceid/branches" className="text-[12.5px] font-medium text-[var(--color-primary)] hover:underline">
                {t('fid.view')} →
              </Link>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-tertiary)]">
                    <th className="px-5 py-2 font-semibold">{t('fid.col_branch')}</th>
                    <th className="px-2 py-2 font-semibold">{t('fid.col_terminal')}</th>
                    <th className="px-2 py-2 text-right font-semibold">{isToday ? t('fid.col_here') : t('fid.t_came')}</th>
                    <th className="px-2 py-2 text-right font-semibold">{t('fid.col_late')}</th>
                    {isToday && <th className="px-2 py-2 text-right font-semibold">{t('fid.col_left')}</th>}
                    <th className="px-2 py-2 text-right font-semibold">{t('fid.col_absent')}</th>
                    <th className="px-2 py-2 text-right font-semibold">{t('fid.col_total')}</th>
                    <th className="w-[22%] px-5 py-2 font-semibold">{t('fid.col_split')}</th>
                  </tr>
                </thead>
                <tbody>
                  {BRANCHES.map((b) => {
                    const list = records.filter((r) => r.employee.branch === b.id && r.status !== 'off')
                    const h = list.filter(isHere).length
                    const l = list.filter(isLeft).length
                    const ab = countOf(list, 'absent')
                    const cm = list.filter((r) => r.status === 'came' || r.status === 'late').length
                    const lt = countOf(list, 'late')
                    return (
                      <tr key={b.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-alt)]">
                        <td className="px-5 py-2.5">
                          <Link to={`/faceid/branches#b${b.id}`} className="font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)]">
                            {b.name}
                          </Link>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={cn('inline-flex items-center gap-1.5 text-[12px]', b.terminal.online ? 'text-[var(--color-ink-secondary)]' : 'font-medium text-[var(--color-danger)]')}>
                            <span className={cn('h-2 w-2 rounded-full', b.terminal.online ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]')} />
                            {b.terminal.online ? t('fid.online') : t('fid.offline')}
                          </span>
                        </td>
                        <td className="tnum px-2 py-2.5 text-right font-semibold text-[var(--color-ink)]">{isToday ? h : cm}</td>
                        <td className={cn('tnum px-2 py-2.5 text-right', lt ? 'font-semibold text-[var(--color-amber)]' : 'text-[var(--color-ink-tertiary)]')}>{lt}</td>
                        {isToday && <td className="tnum px-2 py-2.5 text-right text-[var(--color-ink-secondary)]">{l}</td>}
                        <td className={cn('tnum px-2 py-2.5 text-right', ab ? 'font-semibold text-[var(--color-danger)]' : 'text-[var(--color-ink-tertiary)]')}>{ab}</td>
                        <td className="tnum px-2 py-2.5 text-right text-[var(--color-ink-secondary)]">{list.length}</td>
                        <td className="px-5 py-2.5">
                          <SplitBar here={isToday ? h : cm} left={isToday ? l : 0} absent={ab} total={list.length} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* day timeline */}
          <section className={cn(card, 'overflow-hidden')} style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
              <h3 className={cap}>{t('fid.day_sheet')}</h3>
              <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5 text-[12.5px] font-medium">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMode(tab.id)}
                    className={cn('flex items-center gap-1.5 rounded-md px-3 py-1', mode === tab.id ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]')}
                  >
                    {tab.label}
                    <span className="tnum opacity-70">{tab.n}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[minmax(150px,1.25fr)_46px_46px_minmax(130px,1.6fr)_74px_88px] items-end gap-x-3 border-b border-[var(--color-border)] px-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-tertiary)]">
                  <span>{t('fid.c_employee')}</span>
                  <span>{t('fid.in')}</span>
                  <span>{t('fid.out')}</span>
                  <span className="relative h-4">
                    {[6, 10, 14, 18, 22].map((h) => (
                      <span key={h} className={cn('tnum absolute', h === 22 ? '-translate-x-full' : '-translate-x-1/2')} style={{ left: pos(h * 60) }}>
                        {String(h).padStart(2, '0')}
                      </span>
                    ))}
                  </span>
                  <span>{t('fid.col_span')}</span>
                  <span>{t('fid.col_status')}</span>
                </div>
                {rows.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">{t('fid.none')}</p>}
                {rows.map((r) => {
                  const left = isLeft(r)
                  const start = r.in ? toMin(r.in) : null
                  const end = r.out ? toMin(r.out) : r.now ? Math.round(NOW_H * 60) : null
                  const tone = r.status === 'late' ? 'bg-[var(--color-amber)]' : left ? 'bg-[var(--color-ink-tertiary)]/60' : 'bg-[var(--color-success)]'
                  const state = r.status === 'absent' ? 'absent' : r.status === 'pending' ? 'pending' : left ? 'left' : r.status === 'late' ? 'late' : 'came'
                  const stateLabel = state === 'left' ? t('fid.s_left') : state === 'came' ? (isToday ? t('fid.col_here') : t('fid.s_came')) : t(`fid.s_${state}`)
                  const stateDot = state === 'left' ? 'bg-[var(--color-ink-tertiary)]/60' : state === 'pending' ? 'border border-[var(--color-ink-tertiary)]' : state === 'absent' ? 'bg-[var(--color-danger)]' : state === 'late' ? 'bg-[var(--color-amber)]' : 'bg-[var(--color-success)]'
                  return (
                    <Link
                      key={r.employee.id}
                      to={`/faceid/employees/${r.employee.id}`}
                      className="grid grid-cols-[minmax(150px,1.25fr)_46px_46px_minmax(130px,1.6fr)_74px_88px] items-center gap-x-3 border-b border-[var(--color-border)] px-5 py-2.5 last:border-0 hover:bg-[var(--color-surface-alt)]"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Person e={r.employee} size={30} />
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-medium text-[var(--color-ink)]">{r.employee.name}</span>
                          <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">
                            {BRANCHES[r.employee.branch].name} · {r.employee.position}
                          </span>
                        </span>
                      </span>
                      <span className={cn('tnum text-[13px] font-semibold', r.status === 'late' ? 'text-[var(--color-amber)]' : 'text-[var(--color-ink)]')}>{r.in ?? '—'}</span>
                      <span className="tnum text-[13px] text-[var(--color-ink-tertiary)]">{r.out ?? '—'}</span>
                      <span className="relative h-5">
                        {[6, 10, 14, 18, 22].map((h) => (
                          <span key={h} className="absolute top-0 h-full w-px bg-[var(--color-border)]" style={{ left: pos(h * 60) }} />
                        ))}
                        <span className="absolute top-0 h-full w-px bg-[var(--color-ink-tertiary)]/40" style={{ left: pos(toMin(SHIFT_START)) }} />
                        {start !== null && end !== null && <span className={cn('absolute top-[6px] h-2 rounded-full', tone)} style={{ left: pos(start), width: `calc(${pos(end)} - ${pos(start)})` }} />}
                        {isToday && <span className="absolute -top-1 h-7 w-0.5 rounded bg-[var(--color-ink)]" style={{ left: pos(NOW_H * 60) }} />}
                      </span>
                      <span className="tnum whitespace-nowrap text-[12px] text-[var(--color-ink-secondary)]">{r.worked !== undefined ? workedLabel(r.worked) : '—'}</span>
                      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-ink)]">
                        <span className={cn('h-2 w-2 shrink-0 rounded-[3px]', stateDot)} />
                        {stateLabel}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-[12.5px]">
              <span className="text-[var(--color-ink-tertiary)]">{isToday && t('fid.now_label', { t: NOW_LABEL })}</span>
              <Link to="/faceid/log" className="font-medium text-[var(--color-primary)] hover:underline">
                {t('fid.see_all', { n: staff.length })}
              </Link>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className={cn(card, 'p-4')} style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className={cn(cap, 'mb-2 flex items-center justify-between')}>
              {t('fid.lates')} <span className="tnum text-[var(--color-ink-secondary)]">{lates.length}</span>
            </h3>
            {lates.length === 0 ? (
              <p className="py-5 text-center text-[13px] text-[var(--color-ink-tertiary)]">{t('fid.all_ok')}</p>
            ) : (
              lates.slice(0, 5).map((r) => (
                <Link key={r.employee.id} to={`/faceid/employees/${r.employee.id}`} className="flex items-center gap-3 border-b border-[var(--color-border)] py-2 last:border-0">
                  <span className="tnum w-11 text-[13px] font-semibold text-[var(--color-amber)]">{r.in}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-[var(--color-ink)]">{r.employee.name}</span>
                    <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">
                      {BRANCHES[r.employee.branch].name} · {r.employee.position}
                    </span>
                  </span>
                  <span className="tnum text-[12px] text-[var(--color-amber)]">+{r.late}′</span>
                </Link>
              ))
            )}
            {nAbsent > 0 && (
              <Link to="/faceid/log" className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-3 py-2 text-[13px] font-medium text-[var(--color-ink)]">
                <Square className="bg-[var(--color-danger)]" />
                <span className="flex-1">{t('fid.absent_n', { n: nAbsent })}</span>
                <span className="text-[12.5px] text-[var(--color-danger)] underline">{t('fid.view')}</span>
              </Link>
            )}
          </section>

          <section className={cn(card, 'p-4')} style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className={cn(cap, 'mb-2 flex items-center justify-between')}>
              <span className="flex items-center gap-2">
                {t('fid.feed')}
                {isToday && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-[10.5px] font-semibold normal-case tracking-normal text-[var(--color-success)]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" /> {t('fid.live')}
                  </span>
                )}
              </span>
              <span className="tnum text-[var(--color-ink-secondary)]">{scanEvents(date).length}</span>
            </h3>
            {feed.map((ev) => (
              <Link key={ev.id} to={`/faceid/employees/${ev.employee.id}`} className="flex items-center gap-3 border-b border-[var(--color-border)] py-2 last:border-0">
                <span className="tnum w-11 text-[13px] text-[var(--color-ink-tertiary)]">{ev.time}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-[var(--color-ink)]">{ev.employee.name}</span>
                  <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">{ev.branch.name}</span>
                </span>
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em]',
                    ev.kind === 'in' ? 'bg-[var(--color-ink)] text-[var(--color-bg)]' : 'border border-[var(--color-border-strong,var(--color-border))] text-[var(--color-ink-secondary)]',
                  )}
                >
                  {ev.kind === 'in' ? t('fid.in') : t('fid.out')}
                </span>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
