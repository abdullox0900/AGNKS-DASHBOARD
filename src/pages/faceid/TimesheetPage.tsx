import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { Legend, Person, STATUS_META } from '@/features/faceid/ui'
import { BRANCHES, EMPLOYEES, MONTH_NAMES, MONTH_NAMES_RU, dow, monthDays, monthTotals, todayStr } from '@/features/faceid/mock'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** "Oylik tabel": employees × days of the month, one coloured cell per day; totals on the right. */
export function TimesheetPage() {
  const { t, locale } = useI18n()
  const { show } = useToast()
  const currentYm = todayStr().slice(0, 7)
  const [ym, setYm] = useState(currentYm)
  const [branch, setBranch] = useState('all')
  const [y, m] = ym.split('-').map(Number)
  const dayCount = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const wd = locale === 'ru' ? ['В', 'П', 'В', 'С', 'Ч', 'П', 'С'] : ['Y', 'D', 'S', 'C', 'P', 'J', 'S']
  const list = EMPLOYEES.filter((e) => branch === 'all' || String(e.branch) === branch)
  const groups = BRANCHES.map((b) => ({ b, emps: list.filter((e) => e.branch === b.id) })).filter((g) => g.emps.length)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] p-0.5 text-[13px]">
          <button type="button" onClick={() => setYm(shiftMonth(ym, -1))} aria-label={t('fid.prev_month')} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[130px] rounded-md bg-[var(--color-surface-alt)] px-3 py-1.5 text-center font-medium text-[var(--color-ink)]">
            {(locale === 'ru' ? MONTH_NAMES_RU : MONTH_NAMES)[m - 1]} {y}
          </span>
          <button type="button" disabled={ym >= currentYm} onClick={() => setYm(shiftMonth(ym, 1))} aria-label={t('fid.next_month')} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)] disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]">
          <option value="all">{t('fid.all_branches')}</option>
          {BRANCHES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => show(t('fid.sample_toast'))}>
            <Download size={14} /> Excel
          </Button>
          <Button variant="ghost" size="sm" onClick={() => show(t('fid.sample_toast'))}>
            <Download size={14} /> PDF
          </Button>
        </div>
      </div>
      <div className="mt-3">
        <Legend />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" style={{ boxShadow: 'var(--shadow-card)' }}>
        <table className="w-max min-w-full border-separate border-spacing-0 text-[12px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[190px] border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-tertiary)]">{t('fid.c_employee')}</th>
              {Array.from({ length: dayCount }, (_, i) => {
                const d = `${ym}-${String(i + 1).padStart(2, '0')}`
                const sun = dow(d) === 0
                return (
                  <th key={i} className={cn('border-b border-[var(--color-border)] px-px py-1.5 text-center font-medium', sun ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink-secondary)]')}>
                    <span className="tnum block">{i + 1}</span>
                    <span className="block text-[10px] opacity-70">{wd[dow(d)]}</span>
                  </th>
                )
              })}
              {(['fid.tt_days', 'fid.tt_late', 'fid.tt_hours'] as const).map((k) => (
                <th key={k} className="border-b border-l border-[var(--color-border)] px-2.5 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-tertiary)]">
                  {t(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(({ b, emps }) => (
              <>
                <tr key={`g${b.id}`}>
                  <td colSpan={dayCount + 4} className="sticky left-0 bg-[var(--color-surface-alt)] px-3 py-1.5 text-[12px] font-bold text-[var(--color-ink)]">
                    {b.name} <span className="font-medium text-[var(--color-ink-tertiary)]">· {emps.length}</span>
                  </td>
                </tr>
                {emps.map((e) => {
                  const days = monthDays(e, ym)
                  const tot = monthTotals(days)
                  return (
                    <tr key={e.id} className="group">
                      <td className="sticky left-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 group-hover:bg-[var(--color-surface-alt)]">
                        <Link to={`/faceid/employees/${e.id}`} className="flex items-center gap-2.5">
                          <Person e={e} size={26} />
                          <span className="truncate text-[13px] font-medium text-[var(--color-ink)] hover:text-[var(--color-primary)]">{e.name}</span>
                        </Link>
                      </td>
                      {days.map((d, i) => (
                        <td key={i} className="border-b border-[var(--color-border)] px-px py-1 text-center">
                          {d ? (
                            <span title={`${i + 1}: ${d.in ? `${d.in}${d.out ? ' – ' + d.out : ''}` : t(STATUS_META[d.status].label)}`} className={cn('mx-auto flex h-[22px] w-[22px] items-center justify-center rounded-[5px] text-[10px] font-bold', STATUS_META[d.status].cell)}>
                              {d.status === 'came' ? '✓' : d.status === 'late' ? 'L' : d.status === 'absent' ? 'A' : '·'}
                            </span>
                          ) : (
                            <span className="mx-auto block h-[22px] w-[22px] rounded-[5px] border border-dashed border-[var(--color-border)] opacity-50" />
                          )}
                        </td>
                      ))}
                      <td className="tnum border-b border-l border-[var(--color-border)] px-2.5 text-right font-semibold text-[var(--color-ink)]">{tot.days}</td>
                      <td className={cn('tnum border-b border-[var(--color-border)] px-2.5 text-right', tot.late ? 'font-semibold text-[var(--color-amber)]' : 'text-[var(--color-ink-tertiary)]')}>{tot.late}</td>
                      <td className="tnum whitespace-nowrap border-b border-[var(--color-border)] px-2.5 text-right text-[var(--color-ink-secondary)]">{Math.round(tot.workedMin / 60)} s</td>
                    </tr>
                  )
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
