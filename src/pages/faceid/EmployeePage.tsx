import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Person, STATUS_META, StatusChip, Tile } from '@/features/faceid/ui'
import { BRANCHES, MONTH_NAMES, MONTH_NAMES_RU, dow, employeeById, monthDays, monthTotals, todayStr, workedLabel } from '@/features/faceid/mock'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** One employee: the month as a calendar, the month's numbers and the latest scans. */
export function EmployeePage() {
  const { t, locale } = useI18n()
  const { id } = useParams()
  const e = employeeById(id ?? '')
  const currentYm = todayStr().slice(0, 7)
  const [ym, setYm] = useState(currentYm)

  if (!e) return <p className="py-20 text-center text-[14px] text-[var(--color-ink-tertiary)]">{t('fid.none')}</p>
  const [y, m] = ym.split('-').map(Number)
  const days = monthDays(e, ym)
  const tot = monthTotals(days)
  const branch = BRANCHES[e.branch]
  const wd = locale === 'ru' ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] : ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
  // Monday-first calendar: blank cells before the 1st
  const lead = (dow(`${ym}-01`) + 6) % 7
  const recent = [...days].map((d, i) => ({ d, day: i + 1 })).filter((x) => x.d && x.d.status !== 'off').slice(-6).reverse()

  return (
    <div className="w-full max-w-5xl">
      <Link to="/faceid/log" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-ink-tertiary)] hover:text-[var(--color-primary)]">
        <ChevronLeft size={14} /> {t('fid.title')}
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Person e={e} size={64} />
          <div>
            <h2 className="text-[24px] font-bold tracking-tight text-[var(--color-ink)]">{e.name}</h2>
            <p className="mt-0.5 text-[13.5px] text-[var(--color-ink-secondary)]">
              {e.position} · {branch.name}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--color-ink-tertiary)]">
              <span className={cn('h-1.5 w-1.5 rounded-full', branch.terminal.online ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]')} /> {branch.terminal.name}
            </p>
          </div>
        </div>
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
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile label={t('fid.e_days')} value={tot.days} tone="text-[var(--color-success)]" />
        <Tile label={t('fid.e_late')} value={<>{tot.late}<span className="ml-1.5 text-[13px] font-medium text-[var(--color-ink-tertiary)]">{t('fid.min', { n: tot.lateMin })}</span></>} tone="text-[var(--color-amber)]" />
        <Tile label={t('fid.e_absent')} value={tot.absent} tone="text-[var(--color-danger)]" />
        <Tile label={t('fid.e_avg_in')} value={tot.avgIn} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11.5px] font-medium text-[var(--color-ink-tertiary)]">
            {wd.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {Array.from({ length: lead }).map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {days.map((d, i) => (
              <div
                key={i}
                className={cn('flex min-h-[64px] flex-col rounded-lg border p-1.5', d ? 'border-transparent' : 'border-dashed border-[var(--color-border)]', d && STATUS_META[d.status].cell)}
              >
                <span className="tnum text-[12px] font-bold">{i + 1}</span>
                {d?.in && (
                  <span className="tnum mt-auto text-[10.5px] font-medium leading-tight opacity-90">
                    {d.in}
                    <br />
                    {d.out ?? '…'}
                  </span>
                )}
                {d?.status === 'absent' && <span className="mt-auto text-[10.5px] font-semibold">{t('fid.s_absent')}</span>}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-tertiary)]">{t('fid.e_recent')}</h3>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5" style={{ boxShadow: 'var(--shadow-card)' }}>
            {recent.map(({ d, day }) => (
              <div key={day} className="flex items-center gap-3 rounded-lg px-2.5 py-2">
                <span className="tnum w-12 text-[12.5px] text-[var(--color-ink-tertiary)]">
                  {String(day).padStart(2, '0')}.{String(m).padStart(2, '0')}
                </span>
                <span className="tnum flex-1 text-[13px] text-[var(--color-ink)]">
                  {d!.in ?? '—'} <span className="text-[var(--color-ink-tertiary)]">→ {d!.out ?? (d!.now ? t('fid.at_work') : '—')}</span>
                  <span className="ml-2 text-[11.5px] text-[var(--color-ink-tertiary)]">{workedLabel(d!.worked)}</span>
                </span>
                <StatusChip status={d!.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
