import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, CircleCheck, CircleX, LogOut, Search, Users } from 'lucide-react'
import { ArrivalCell, FaceWait, Person, StateLabel, dstate, hoursLabel, useFaceDate, type DState } from '@/features/faceid/ui'
import { useFaceData } from '@/features/faceid/useFaceData'
import { BRANCHES, SHIFT_HOURS, dayRecords, monthDays, monthTotals, todayStr, type DayRecord } from '@/features/faceid/mock'
import { PageHead } from './FaceIdLayout'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const PAGE = 14
const th = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-tertiary)]'

/** "Xodimlar": everybody in one table, with a search and a state filter. */
export function EmployeesPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [date] = useFaceDate()
  const ym = date.slice(0, 7)
  const monthEnd = `${ym}-${String(new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5)), 0)).getUTCDate()).padStart(2, '0')}`
  const load = useFaceData({ day: date, range: [`${ym}-01`, monthEnd < todayStr() ? monthEnd : todayStr()] })
  const isToday = date === todayStr()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<DState | 'all'>('all')
  const [page, setPage] = useState(0)

  const all = dayRecords(date).filter((r) => r.status !== 'off')
  const st = (r: DayRecord) => dstate(r, isToday)
  const month = useMemo(() => new Map(all.map((r) => [r.employee.id, monthTotals(monthDays(r.employee, date.slice(0, 7)))])), [date, load.stamp]) // eslint-disable-line react-hooks/exhaustive-deps
  const needle = q.trim().toLowerCase()
  const list = all
    .filter((r) => (filter === 'all' ? true : filter === 'here' ? st(r) === 'here' || st(r) === 'late' : st(r) === filter))
    .filter((r) => !needle || r.employee.name.toLowerCase().includes(needle) || BRANCHES[r.employee.branch].name.toLowerCase().includes(needle))
  if (!load.ready) return <FaceWait load={load} />
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const cur = Math.min(page, pages - 1)
  const rows = list.slice(cur * PAGE, cur * PAGE + PAGE)
  const count = (f: DState | 'all') => all.filter((r) => (f === 'all' ? true : f === 'here' ? st(r) === 'here' || st(r) === 'late' : st(r) === f)).length

  const chips: { id: DState | 'all'; icon: typeof Users; title: string }[] = [
    { id: 'all', icon: Users, title: t('fid.f_all') },
    { id: 'here', icon: CircleCheck, title: t('fid.f_here') },
    { id: 'late', icon: CircleAlert, title: t('fid.f_late') },
    ...(isToday ? [{ id: 'left' as const, icon: LogOut, title: t('fid.f_left') }] : []),
    { id: 'absent', icon: CircleX, title: t('fid.col_absent') },
  ]

  return (
    <div>
      <PageHead
        title={t('fid.emp_title')}
        sub={t('fid.emp_sub', { n: all.length, b: BRANCHES.length })}
        right={
          <label className="flex h-10 w-full max-w-[300px] items-center gap-2 fid-card rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-ink-tertiary)] sm:w-[280px]">
            <Search size={16} />
            <input value={q} onChange={(e) => (setQ(e.target.value), setPage(0))} placeholder={t('fid.emp_search')} className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)]" />
          </label>
        }
      />

      <section className="overflow-hidden fid-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('fid.emp_all')}</h3>
          <div className="flex gap-1.5">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.title}
                onClick={() => (setFilter(c.id), setPage(0))}
                className={cn('flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium', filter === c.id ? 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'border-[var(--color-border)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]')}
              >
                <c.icon size={15} />
                <span className="tnum">{count(c.id)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13.5px]">
            <thead className="bg-[var(--color-surface-alt)]/60">
              <tr>
                <th className={cn(th, 'pl-5')}>{t('fid.c_employee')}</th>
                <th className={th}>{t('fid.col_branch')}</th>
                <th className={th}>{t('fid.col_shift')}</th>
                <th className={th}>{t('fid.c_in')}</th>
                <th className={th}>{t('fid.c_out')}</th>
                <th className={th}>{t('fid.col_hours')}</th>
                <th className={th}>{t('fid.col_month')}</th>
                <th className={th}>{t('fid.col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = month.get(r.employee.id)
                return (
                  <tr key={r.employee.id} onClick={() => navigate(`/faceid/employees/${r.employee.id}`)} className="cursor-pointer border-t border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]">
                    <td className="px-3 py-2.5 pl-5">
                      <span className="flex items-center gap-3">
                        <Person e={r.employee} size={44} />
                        <span>
                          <span className="block font-semibold text-[var(--color-ink)]">{r.employee.name}</span>
                          <span className="block text-[12px] text-[var(--color-ink-tertiary)]">{r.employee.position}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[var(--color-ink)]">{BRANCHES[r.employee.branch].name}</td>
                    <td className="px-3 py-2.5">
                      <span className="block font-medium text-[var(--color-ink)]">{t(r.employee.shift === 'day' ? 'fid.shift_day' : 'fid.shift_night')}</span>
                      <span className="tnum block text-[12px] text-[var(--color-ink-tertiary)]">{SHIFT_HOURS[r.employee.shift]}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <ArrivalCell r={r} />
                    </td>
                    <td className="tnum px-3 py-2.5 text-[var(--color-ink-secondary)]">{r.out ?? '—'}</td>
                    <td className="tnum px-3 py-2.5 text-[var(--color-ink-secondary)]">{r.in ? hoursLabel(r.worked, r.now, t) : '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className="block font-medium text-[var(--color-ink)]">{t('fid.days_n', { n: m?.days ?? 0 })}</span>
                      <span className="block text-[12px] text-[var(--color-ink-tertiary)]">{t('fid.lates_n', { n: m?.late ?? 0 })}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StateLabel state={st(r)} isToday={isToday} />
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[var(--color-ink-tertiary)]">
                    {t('fid.none')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-[13px]">
          <span className="tnum text-[var(--color-ink-tertiary)]">{t('fid.page_of', { a: rows.length, b: list.length })}</span>
          <span className="flex gap-4 font-medium text-[var(--color-primary)]">
            {cur > 0 && (
              <button type="button" onClick={() => setPage(cur - 1)}>
                ← {t('fid.prev_page')}
              </button>
            )}
            {cur < pages - 1 && (
              <button type="button" onClick={() => setPage(cur + 1)}>
                {t('fid.next_page')} →
              </button>
            )}
          </span>
        </div>
      </section>
    </div>
  )
}
