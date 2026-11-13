import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleX, Clock, Pencil } from 'lucide-react'
import { FaceWait, NoteEditor, Person, REASON_KEYS, useNote } from '@/features/faceid/ui'
import { useFaceData } from '@/features/faceid/useFaceData'
import { BRANCHES, MONTH_NAMES, MONTH_NAMES_RU, SHIFT_HOURS, dow, employeeById, monthDays, monthTotals, todayStr, workedLabel, type DayRecord } from '@/features/faceid/mock'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const card = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]'
const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function Kpi({ icon: Icon, label, value, extra, tone }: { icon: typeof Clock; label: string; value: string | number; extra?: string; tone: string }) {
  return (
    <div className={cn(card, 'flex items-center gap-3.5 px-4 py-3.5')}>
      <Icon size={22} className={tone} />
      <div>
        <p className="text-[12.5px] text-[var(--color-ink-secondary)]">{label}</p>
        <p className="tnum text-[24px] font-bold leading-tight text-[var(--color-ink)]">
          {value}
          {extra && <span className="ml-1.5 text-[12.5px] font-medium text-[var(--color-ink-tertiary)]">{extra}</span>}
        </p>
      </div>
    </div>
  )
}

const CELL: Record<string, string> = {
  came: 'border-[var(--color-success)]/30 bg-[var(--color-success-soft)] text-[var(--color-success)]',
  late: 'border-[var(--color-amber)]/30 bg-[var(--color-amber-soft)] text-[var(--color-amber)]',
  absent: 'border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  now: 'border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
  off: 'border-transparent bg-[var(--color-surface-alt)] text-[var(--color-ink-tertiary)]',
}

function RecentRow({ r, date }: { r: DayRecord; date: string }) {
  const { t } = useI18n()
  const { note, reason } = useNote(r, date)
  const [editing, setEditing] = useState(false)
  const [, m, d] = date.split('-')
  const tone = r.status === 'late' ? 'text-[var(--color-amber)]' : r.status === 'absent' ? 'text-[var(--color-danger)]' : r.now ? 'text-[var(--color-ink-secondary)]' : 'text-[var(--color-success)]'
  const Icon = r.status === 'late' ? CircleAlert : r.status === 'absent' ? CircleX : r.now ? Clock : CircleCheck
  const label = r.status === 'late' ? t('fid.s_late') : r.status === 'absent' ? t('fid.s_absent') : r.now ? t('fid.col_here') : t('fid.s_came')
  const text = [reason ? t(REASON_KEYS[reason]) : '', note].filter(Boolean).join(' · ')
  return (
    <div className="border-t border-[var(--color-border)] px-5 py-3 first:border-0">
      <div className="flex items-center gap-3">
        <span className="tnum w-12 text-[13px] text-[var(--color-ink-tertiary)]">
          {d}.{m}
        </span>
        <span className="min-w-0 flex-1">
          <span className="tnum block text-[13.5px] font-medium text-[var(--color-ink)]">{r.in ? `${r.in} → ${r.out ?? t('fid.at_work')}` : '—'}</span>
          {r.worked !== undefined && r.in && <span className="tnum block text-[12px] text-[var(--color-ink-tertiary)]">{workedLabel(r.worked)}</span>}
        </span>
        <span className={cn('flex items-center gap-1.5 text-[13px] font-medium', tone)}>
          <Icon size={15} /> {label}
        </span>
        <button type="button" aria-label={t('fid.note')} onClick={() => setEditing((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-tertiary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-ink)]">
          <Pencil size={14} />
        </button>
      </div>
      <div className="pl-[60px]">
        {editing ? <NoteEditor r={r} date={date} width={170} onDone={() => setEditing(false)} /> : text && <p className="mt-1 text-[12px] text-[var(--color-ink-tertiary)]">{text}</p>}
      </div>
    </div>
  )
}

/** One employee: profile, the month's numbers, the month as a calendar and the latest days (with a reason note). */
export function EmployeePage() {
  const { t, locale } = useI18n()
  const { id } = useParams()
  const e = employeeById(id ?? '')
  const currentYm = todayStr().slice(0, 7)
  const [ym, setYm] = useState(currentYm)
  const last = ym === currentYm ? todayStr() : `${ym}-${String(new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5)), 0)).getUTCDate()).padStart(2, '0')}`
  const load = useFaceData({ range: [`${ym}-01`, last], day: ym === currentYm ? todayStr() : undefined })

  if (!load.ready) return <FaceWait load={load} />
  if (!e) return <p className="py-20 text-center text-[14px] text-[var(--color-ink-tertiary)]">{t('fid.none')}</p>
  const [y, m] = ym.split('-').map(Number)
  const days = monthDays(e, ym)
  const tot = monthTotals(days)
  const branch = BRANCHES[e.branch]
  const wd = locale === 'ru' ? ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'] : ['DU', 'SE', 'CH', 'PA', 'JU', 'SH', 'YA']
  const lead = (dow(`${ym}-01`) + 6) % 7
  const dateOf = (i: number) => `${ym}-${String(i + 1).padStart(2, '0')}`
  const recent = days.map((d, i) => ({ d, i })).filter((x) => x.d && x.d.status !== 'off' && x.d.status !== 'pending').slice(-7).reverse()

  return (
    <div>
      <Link to="/faceid/employees" className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink)]">
        <ChevronLeft size={15} /> {t('fid.back_employees')}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Person e={e} size={72} />
          <div>
            <h2 className="text-[26px] font-bold tracking-tight text-[var(--color-ink)]">{e.name}</h2>
            <p className="mt-0.5 text-[13.5px] text-[var(--color-ink-secondary)]">
              {e.position} · {branch.name} · {t('fid.shift_of', { s: t(e.shift === 'day' ? 'fid.shift_day' : 'fid.shift_night') })} <span className="tnum text-[var(--color-ink-tertiary)]">{SHIFT_HOURS[e.shift]}</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--color-ink-tertiary)]">
              <span className={cn('h-1.5 w-1.5 rounded-full', branch.terminal.online ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]')} />
              {branch.terminal.name} · {branch.terminal.online ? t('fid.on') : t('fid.off')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-[13.5px]">
          <button type="button" onClick={() => setYm(shiftMonth(ym, -1))} aria-label={t('fid.prev_month')} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[140px] text-center font-semibold text-[var(--color-ink)]">
            {(locale === 'ru' ? MONTH_NAMES_RU : MONTH_NAMES)[m - 1]} {y}
          </span>
          <button type="button" disabled={ym >= currentYm} onClick={() => setYm(shiftMonth(ym, 1))} aria-label={t('fid.next_month')} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)] disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={CalendarDays} label={t('fid.e_days')} value={tot.days} tone="text-[var(--color-primary)]" />
        <Kpi icon={CircleAlert} label={t('fid.e_late')} value={tot.late} extra={t('fid.min', { n: tot.lateMin })} tone="text-[var(--color-amber)]" />
        <Kpi icon={CircleX} label={t('fid.e_absent')} value={tot.absent} tone="text-[var(--color-danger)]" />
        <Kpi icon={Clock} label={t('fid.e_avg_in')} value={tot.avgIn} tone="text-[var(--color-primary)]" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className={cn(card, 'p-5')}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('fid.cal_title')}</h3>
            <span className="flex flex-wrap items-center gap-4 text-[12.5px] text-[var(--color-ink-secondary)]">
              <span className="flex items-center gap-1.5">
                <CircleCheck size={14} className="text-[var(--color-success)]" /> {t('fid.s_came')}
              </span>
              <span className="flex items-center gap-1.5">
                <CircleAlert size={14} className="text-[var(--color-amber)]" /> {t('fid.s_late')}
              </span>
              <span className="flex items-center gap-1.5">
                <CircleX size={14} className="text-[var(--color-danger)]" /> {t('fid.s_absent')}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-[11.5px] font-semibold tracking-[0.08em] text-[var(--color-ink-tertiary)]">
            {wd.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {Array.from({ length: lead }).map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {days.map((d, i) => {
              const key = !d ? '' : d.status === 'off' ? 'off' : d.status === 'absent' ? 'absent' : d.now ? 'now' : d.status === 'late' ? 'late' : d.status === 'came' ? 'came' : 'off'
              const Icon = key === 'absent' ? CircleX : key === 'late' ? CircleAlert : key === 'came' ? CircleCheck : key === 'now' ? Clock : null
              return (
                <div key={i} className={cn('flex min-h-[78px] flex-col rounded-xl border p-2', d ? CELL[key] : 'border-dashed border-[var(--color-border)] text-[var(--color-ink-tertiary)]')}>
                  <span className="flex items-center justify-between">
                    <span className="tnum text-[13px] font-bold text-[var(--color-ink)]">{i + 1}</span>
                    {Icon && <Icon size={14} />}
                  </span>
                  {d?.in && (
                    <span className="tnum mt-auto text-[11.5px] font-medium leading-tight">
                      <span className="block">{d.in}</span>
                      <span className="block opacity-70">{d.out ?? t('fid.at_work')}</span>
                    </span>
                  )}
                  {d?.status === 'absent' && <span className="mt-auto text-[11.5px] font-semibold">{t('fid.s_absent')}</span>}
                </div>
              )
            })}
          </div>
        </section>

        <section className={cn(card, 'self-start overflow-hidden')}>
          <h3 className="flex items-center justify-between px-5 py-4 text-[15px] font-semibold text-[var(--color-ink)]">
            {t('fid.e_recent')}
            <span className="text-[12.5px] font-normal text-[var(--color-ink-tertiary)]">
              {(locale === 'ru' ? MONTH_NAMES_RU : MONTH_NAMES)[m - 1]} {y}
            </span>
          </h3>
          {recent.map(({ d, i }) => (
            <RecentRow key={i} r={d!} date={dateOf(i)} />
          ))}
        </section>
      </div>
    </div>
  )
}
