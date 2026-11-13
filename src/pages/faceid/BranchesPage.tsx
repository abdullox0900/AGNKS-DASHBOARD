import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { Person, StatusChip, useFaceDate } from '@/features/faceid/ui'
import { BRANCHES, STATUS_ORDER, countOf, dayRecords, here, todayStr } from '@/features/faceid/mock'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

/** "Filiallar": one box per branch with its employees — who came, when, who left. */
export function BranchesPage() {
  const { t } = useI18n()
  const [date] = useFaceDate()
  const isToday = date === todayStr()
  const records = dayRecords(date)
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {BRANCHES.map((b) => {
        const list = records.filter((r) => r.employee.branch === b.id)
        const staff = list.filter((r) => r.status !== 'off')
        const h = here(list)
        const late = countOf(list, 'late')
        const absent = countOf(list, 'absent')
        const pct = staff.length ? Math.round((h / staff.length) * 100) : 0
        const rows = [...list].sort((a, c) => STATUS_ORDER[a.status] - STATUS_ORDER[c.status] || a.employee.name.localeCompare(c.employee.name))
        return (
          <section key={b.id} id={`b${b.id}`} className="scroll-mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" style={{ boxShadow: 'var(--shadow-card)' }}>
            <header className="px-5 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-bold text-[var(--color-ink)]">{b.name}</p>
                  <p className={cn('mt-0.5 flex items-center gap-1.5 text-[12px]', b.terminal.online ? 'text-[var(--color-ink-tertiary)]' : 'font-medium text-[var(--color-danger)]')}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', b.terminal.online ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]')} />
                    {b.terminal.name} · {b.terminal.online ? t('fid.online') : t('fid.offline')}
                  </p>
                </div>
                <p className="tnum text-right text-[26px] font-bold leading-none text-[var(--color-ink)]">
                  {h}
                  <span className="text-[15px] font-medium text-[var(--color-ink-tertiary)]"> / {staff.length}</span>
                </p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-track)]">
                <div className="h-full rounded-full bg-[var(--color-success)]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11.5px] font-medium">
                {late > 0 && <span className="rounded-full bg-[var(--color-amber-soft)] px-2 py-0.5 text-[var(--color-amber)]">{t('fid.s_late')}: {late}</span>}
                {absent > 0 && <span className="rounded-full bg-[var(--color-danger-soft)] px-2 py-0.5 text-[var(--color-danger)]">{t('fid.s_absent')}: {absent}</span>}
                {late === 0 && absent === 0 && <span className="rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-[var(--color-success)]">{t('fid.all_ok')}</span>}
              </div>
              {!b.terminal.online && isToday && (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--color-amber-soft)] px-3 py-2 text-[12.5px] text-[var(--color-ink)]">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0 text-[var(--color-amber)]" />
                  {t('fid.offline_note', { n: b.terminal.lastSeenMin ?? 0 })}
                </p>
              )}
            </header>

            <div className="mt-3 border-t border-[var(--color-border)]">
              <div className="grid grid-cols-[minmax(0,1fr)_56px_56px_104px] items-center gap-x-3 bg-[var(--color-surface-alt)]/60 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-tertiary)]">
                <span>{t('fid.c_employee')}</span>
                <span>{t('fid.c_in')}</span>
                <span>{t('fid.c_out')}</span>
                <span className="text-right">{t('fid.col_status')}</span>
              </div>
              {rows.map((r) => (
                <Link
                  key={r.employee.id}
                  to={`/faceid/employees/${r.employee.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_56px_56px_104px] items-center gap-x-3 border-t border-[var(--color-border)] px-5 py-2 hover:bg-[var(--color-surface-alt)]"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Person e={r.employee} size={30} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium text-[var(--color-ink)]">{r.employee.name}</span>
                      <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">{r.employee.position}</span>
                    </span>
                  </span>
                  <span className={cn('tnum text-[13px] font-semibold', r.status === 'late' ? 'text-[var(--color-amber)]' : 'text-[var(--color-ink)]')}>{r.in ?? '—'}</span>
                  <span className="tnum text-[13px] text-[var(--color-ink-secondary)]">{r.out ?? (r.now ? <span className="text-[var(--color-success)]">{t('fid.at_work')}</span> : '—')}</span>
                  <span className="text-right">
                    {isToday && r.out && r.status === 'came' ? (
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[var(--color-surface-alt)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--color-ink-secondary)]">{t('fid.s_left')}</span>
                    ) : (
                      <StatusChip status={r.status} />
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
