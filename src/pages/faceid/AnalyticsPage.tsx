import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, CircleX, Clock, HeartPulse, LogOut, Plane, Timer, TrendingUp, TriangleAlert, WifiOff, MoreHorizontal, Repeat, type LucideIcon } from 'lucide-react'
import { Person } from '@/features/faceid/ui'
import { BRANCHES, EMPLOYEES, analytics, type Reason } from '@/features/faceid/mock'
import { PageHead } from './FaceIdLayout'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const card = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]'
const PERIODS = [7, 30, 90] as const
const REASONS: Record<Reason, { icon: LucideIcon; key: 'fid.rs_sick' | 'fid.rs_leave' | 'fid.rs_none' | 'fid.rs_trip' | 'fid.rs_other' }> = {
  sick: { icon: HeartPulse, key: 'fid.rs_sick' },
  leave: { icon: CalendarDays, key: 'fid.rs_leave' },
  none: { icon: CircleX, key: 'fid.rs_none' },
  trip: { icon: Plane, key: 'fid.rs_trip' },
  other: { icon: MoreHorizontal, key: 'fid.rs_other' },
}

function Kpi({ icon: Icon, label, value, delta, goodWhenUp = true }: { icon: LucideIcon; label: string; value: string; delta: string; goodWhenUp?: boolean }) {
  const up = !delta.startsWith('−') && !delta.startsWith('-')
  const good = up === goodWhenUp
  return (
    <div className={cn(card, 'flex items-center gap-3.5 px-4 py-4')}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon size={20} />
      </span>
      <div>
        <p className="text-[12.5px] text-[var(--color-ink-secondary)]">{label}</p>
        <p className="tnum flex items-baseline gap-2 text-[26px] font-bold leading-tight text-[var(--color-ink)]">
          {value}
          <span className={cn('text-[12.5px] font-semibold', good ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]')}>{delta}</span>
        </p>
      </div>
    </div>
  )
}

const signed = (n: number, unit: string) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}${unit}`

/** "Analitika": trends over 7 / 30 / 90 days. */
export function FaceAnalyticsPage() {
  const { t, locale } = useI18n()
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const a = useMemo(() => analytics(days), [days])
  const peak = a.byHour.reduce((m, h) => (h.n > m.n ? h : m), a.byHour[0])
  const maxHour = Math.max(1, ...a.byHour.map((h) => h.n))
  const maxLate = Math.max(1, ...a.lates7.map((d) => d.n))
  const maxPeak = a.lates7.reduce((m, d) => (d.n > m.n ? d : m), a.lates7[0])
  const reasonTotal = a.reasons.reduce((s, r) => s + r.n, 0) || 1
  const maxFreq = Math.max(1, ...a.frequent.map((f) => f.n))
  const wd = locale === 'ru' ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] : ['Ya', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha']
  const attention = [
    { icon: WifiOff, title: t('fid.at_terminal'), sub: t('fid.at_terminal_sub', { n: a.attention.terminals }), n: a.attention.terminals, to: '/faceid/branches' },
    { icon: CircleX, title: t('fid.at_noreason'), sub: t('fid.at_noreason_sub'), n: a.attention.noReason, to: '/faceid/branches' },
    { icon: Repeat, title: t('fid.at_repeat'), sub: t('fid.at_repeat_sub'), n: a.attention.repeat, to: '/faceid/employees' },
    { icon: LogOut, title: t('fid.at_noexit'), sub: t('fid.at_noexit_sub'), n: a.attention.noExit, to: '/faceid/employees' },
  ]

  return (
    <div>
      <PageHead
        title={t('fid.an_title')}
        sub={t('fid.an_sub', { b: BRANCHES.length, n: EMPLOYEES.length })}
        right={
          <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-[13px] font-medium">
            {PERIODS.map((p) => (
              <button key={p} type="button" onClick={() => setDays(p)} className={cn('rounded-lg px-4 py-1.5', days === p ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]')}>
                {t(`fid.p_${p}` as const)}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={TrendingUp} label={t('fid.k_att')} value={`${a.attendance}%`} delta={signed(a.attendanceDelta, '%')} />
        <Kpi icon={Clock} label={t('fid.k_avg_in')} value={a.avgIn} delta={`${a.avgInDelta >= 0 ? '+' : '−'}${Math.abs(a.avgInDelta)} ${locale === 'ru' ? 'мин' : 'daq'}`} goodWhenUp={false} />
        <Kpi icon={TriangleAlert} label={t('fid.k_late_share')} value={`${a.lateShare}%`} delta={signed(a.lateShareDelta, '%')} goodWhenUp={false} />
        <Kpi icon={Timer} label={t('fid.k_hours')} value={a.avgWorked} delta={a.avgWorkedDelta} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className={cn(card, 'p-5')}>
          <h3 className="flex items-center justify-between text-[15px] font-semibold text-[var(--color-ink)]">
            {t('fid.ch_entries')}
            <span className="text-[12.5px] font-normal text-[var(--color-ink-tertiary)]">{t('fid.ch_peak', { h: `${String(peak.hour).padStart(2, '0')}:00` })}</span>
          </h3>
          <div className="mt-4 flex h-[220px] items-end gap-1.5">
            {a.byHour.map((h) => (
              <div key={h.hour} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="tnum text-[11px] text-[var(--color-ink-secondary)]">{h.n}</span>
                <div className={cn('w-full rounded-t-md', h.hour === peak.hour ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-track)]')} style={{ height: `${Math.max(2, (h.n / maxHour) * 82)}%` }} />
                <span className="tnum text-[11px] text-[var(--color-ink-tertiary)]">{String(h.hour).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={cn(card, 'p-5')}>
          <h3 className="flex items-center justify-between text-[15px] font-semibold text-[var(--color-ink)]">
            {t('fid.ch_top')}
            <span className="whitespace-nowrap text-[12.5px] font-normal text-[var(--color-ink-tertiary)]">{t(`fid.p_${days}` as const)}</span>
          </h3>
          <div className="mt-3">
            {a.top.map((x) => (
              <Link key={x.employee.id} to={`/faceid/employees/${x.employee.id}`} className="flex items-center gap-3 border-t border-[var(--color-border)] py-2.5 first:border-0">
                <Person e={x.employee} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{x.employee.name}</span>
                  <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">
                    {x.employee.position} · {BRANCHES[x.employee.branch].name}
                  </span>
                </span>
                <span className="text-right">
                  <span className="tnum block text-[14px] font-bold text-[var(--color-success)]">{x.pct}%</span>
                  <span className="tnum block text-[11.5px] text-[var(--color-ink-tertiary)]">
                    {x.onTime}/{x.days}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className={cn(card, 'p-5')}>
          <h3 className="flex items-center justify-between text-[15px] font-semibold text-[var(--color-ink)]">
            {t('fid.ch_lates7')}
            <span className="text-[12.5px] font-normal text-[var(--color-ink-tertiary)]">{t('fid.ch_total', { n: a.lates7.reduce((s, d) => s + d.n, 0) })}</span>
          </h3>
          <div className="mt-4 flex h-[220px] items-end gap-3">
            {a.lates7.map((d) => (
              <div key={d.dow} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="tnum text-[12px] font-medium text-[var(--color-ink-secondary)]">{d.n}</span>
                <div className={cn('w-full rounded-t-md', d === maxPeak ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-track)]')} style={{ height: `${Math.max(2, (d.n / maxLate) * 78)}%` }} />
                <span className="text-[12px] text-[var(--color-ink-tertiary)]">{wd[d.dow]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className={cn(card, 'p-5')}>
          <h3 className="flex items-center justify-between text-[15px] font-semibold text-[var(--color-ink)]">
            {t('fid.ch_reasons')}
            <span className="text-[12.5px] font-normal text-[var(--color-ink-tertiary)]">{t('fid.ch_cases', { p: days, n: a.reasons.reduce((s, r) => s + r.n, 0) })}</span>
          </h3>
          <div className="mt-3 space-y-3">
            {a.reasons.map((r) => {
              const m = REASONS[r.reason]
              return (
                <div key={r.reason} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-ink-secondary)]">
                    <m.icon size={17} />
                  </span>
                  <span className="w-[120px] shrink-0 text-[13.5px] font-medium text-[var(--color-ink)]">{t(m.key)}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-track)]">
                    <span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${(r.n / (a.reasons[0]?.n || 1)) * 100}%` }} />
                  </span>
                  <span className="tnum w-7 text-right text-[13.5px] font-semibold text-[var(--color-ink)]">{r.n}</span>
                  <span className="tnum w-9 text-right text-[12px] text-[var(--color-ink-tertiary)]">{Math.round((r.n / reasonTotal) * 100)}%</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className={cn(card, 'p-5')}>
          <h3 className="flex items-center justify-between text-[15px] font-semibold text-[var(--color-ink)]">
            {t('fid.ch_frequent')}
            <span className="text-[12.5px] font-normal text-[var(--color-ink-tertiary)]">{t(`fid.p_${days}` as const)}</span>
          </h3>
          <div className="mt-3">
            {a.frequent.map((f) => (
              <Link key={f.employee.id} to={`/faceid/employees/${f.employee.id}`} className="flex items-center gap-3 border-t border-[var(--color-border)] py-2.5 first:border-0">
                <Person e={f.employee} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{f.employee.name}</span>
                  <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">{BRANCHES[f.employee.branch].name}</span>
                </span>
                <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--color-track)]">
                  <span className="block h-full rounded-full bg-[var(--color-amber)]" style={{ width: `${(f.n / maxFreq) * 100}%` }} />
                </span>
                <span className="tnum w-[58px] text-right text-[13px] font-semibold text-[var(--color-amber)]">{t('fid.times', { n: f.n })}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={cn(card, 'p-5')}>
          <h3 className="flex items-center justify-between text-[15px] font-semibold text-[var(--color-ink)]">
            {t('fid.ch_attention')}
            <span className="text-[12.5px] font-normal text-[var(--color-ink-tertiary)]">{t('fid.today')}</span>
          </h3>
          <div className="mt-3">
            {attention.map((x) => (
              <Link key={x.title} to={x.to} className="flex items-center gap-3 border-t border-[var(--color-border)] py-3 first:border-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-ink-secondary)]">
                  <x.icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-[var(--color-ink)]">{x.title}</span>
                  <span className="block text-[12px] text-[var(--color-ink-tertiary)]">{x.sub}</span>
                </span>
                <span className="tnum text-[20px] font-bold text-[var(--color-primary)]">{x.n}</span>
                <ArrowRight size={15} className="text-[var(--color-ink-tertiary)]" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
