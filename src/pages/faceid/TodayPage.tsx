import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, TriangleAlert } from 'lucide-react'
import { Drawer } from '@/shared/ui/Drawer'
import { Legend, Person, StatusChip, Tile, useFaceDate } from '@/features/faceid/ui'
import { BRANCHES, STATUS_ORDER, countOf, dayRecords, here, scanEvents, todayStr, type Branch, type DayRecord } from '@/features/faceid/mock'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

function EmployeeRow({ r, showBranch }: { r: DayRecord; showBranch?: boolean }) {
  const { t } = useI18n()
  return (
    <Link to={`/faceid/employees/${r.employee.id}`} className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--color-surface-alt)]">
      <Person e={r.employee} size={34} status={r.status} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-[var(--color-ink)] group-hover:text-[var(--color-primary)]">{r.employee.name}</span>
        <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">{showBranch ? BRANCHES[r.employee.branch].name : r.employee.position}</span>
      </span>
      <span className="tnum text-right text-[12.5px] text-[var(--color-ink-secondary)]">
        {r.in ?? '—'}
        {r.in && <span className="text-[var(--color-ink-tertiary)]"> → {r.out ?? (r.now ? t('fid.at_work') : '—')}</span>}
      </span>
    </Link>
  )
}

/** "Bugun": the numbers, the branches, what needs attention and the live feed of scans. */
export function TodayPage() {
  const { t } = useI18n()
  const [date] = useFaceDate()
  const isToday = date === todayStr()
  const records = dayRecords(date)
  const [open, setOpen] = useState<Branch | null>(null)

  const attention = records.filter((r) => r.status === 'late' || r.status === 'absent').sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  const feed = scanEvents(date).slice(0, 9)
  const staffCount = records.filter((r) => r.status !== 'off').length

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile label={t('fid.t_total')} value={staffCount} />
        <Tile label={isToday ? t('fid.t_now') : t('fid.t_came')} value={isToday ? records.filter((r) => r.now).length : here(records)} tone="text-[var(--color-success)]" />
        <Tile label={t('fid.t_late')} value={countOf(records, 'late')} tone="text-[var(--color-amber)]" />
        <Tile label={t('fid.t_absent')} value={countOf(records, 'absent')} tone="text-[var(--color-danger)]" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-tertiary)]">{t('fid.branches')}</h3>
            <Legend />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {BRANCHES.map((b) => {
              const list = records.filter((r) => r.employee.branch === b.id)
              const staff = list.filter((r) => r.status !== 'off')
              const pct = staff.length ? Math.round((here(list) / staff.length) * 100) : 0
              const issues = countOf(list, 'late') + countOf(list, 'absent')
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setOpen(b)}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:border-[var(--color-border-strong)]"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-tertiary)]">
                        <span className={cn('h-1.5 w-1.5 rounded-full', b.terminal.online ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]')} />
                        {b.terminal.online ? t('fid.online') : t('fid.offline')}
                      </p>
                      <p className="truncate text-[16px] font-bold text-[var(--color-ink)]">{b.name}</p>
                    </div>
                    <p className="tnum text-[22px] font-bold text-[var(--color-ink)]">
                      {here(list)}
                      <span className="text-[14px] font-medium text-[var(--color-ink-tertiary)]"> / {staff.length}</span>
                    </p>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-track)]">
                    <div className="h-full rounded-full bg-[var(--color-success)]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-3.5 flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {list.slice(0, 5).map((r) => (
                        <span key={r.employee.id} className="rounded-full ring-2 ring-[var(--color-surface)]">
                          <Person e={r.employee} size={26} status={r.status} />
                        </span>
                      ))}
                    </div>
                    {list.length > 5 && <span className="text-[12px] text-[var(--color-ink-tertiary)]">+{list.length - 5}</span>}
                    {issues > 0 && <span className="ml-auto rounded-full bg-[var(--color-amber-soft)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--color-amber)]">{t('fid.issues', { n: issues })}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-5">
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-tertiary)]">
              <TriangleAlert size={13} /> {t('fid.attention')} <span className="tnum text-[var(--color-ink-secondary)]">{attention.length}</span>
            </h3>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5" style={{ boxShadow: 'var(--shadow-card)' }}>
              {attention.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-[var(--color-ink-tertiary)]">{t('fid.all_ok')}</p>
              ) : (
                attention.slice(0, 7).map((r) => (
                  <Link key={r.employee.id} to={`/faceid/employees/${r.employee.id}`} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[var(--color-surface-alt)]">
                    <Person e={r.employee} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-[var(--color-ink)]">{r.employee.name}</span>
                      <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">{BRANCHES[r.employee.branch].name}</span>
                    </span>
                    <StatusChip status={r.status} extra={r.late ? t('fid.min', { n: r.late }) : undefined} />
                  </Link>
                ))
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-tertiary)]">
              {t('fid.feed')}
              {isToday && (
                <span className="flex items-center gap-1 rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-[10.5px] font-semibold normal-case tracking-normal text-[var(--color-success)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" /> {t('fid.live')}
                </span>
              )}
            </h3>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5" style={{ boxShadow: 'var(--shadow-card)' }}>
              {feed.map((ev) => (
                <Link key={ev.id} to={`/faceid/employees/${ev.employee.id}`} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[var(--color-surface-alt)]">
                  <Person e={ev.employee} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-[var(--color-ink)]">{ev.employee.name}</span>
                    <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">
                      {ev.branch.name} · {ev.confidence}%
                    </span>
                  </span>
                  <span className={cn('flex items-center gap-1 text-[12px] font-medium', ev.kind === 'in' ? 'text-[var(--color-success)]' : 'text-[var(--color-ink-secondary)]')}>
                    {ev.kind === 'in' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                    {ev.kind === 'in' ? t('fid.in') : t('fid.out')}
                  </span>
                  <span className="tnum w-11 text-right text-[12.5px] text-[var(--color-ink-secondary)]">{ev.time}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.name} width={440}>
        {open && (
          <div>
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--color-surface-alt)] px-3.5 py-2.5 text-[13px]">
              <span className={cn('h-2 w-2 rounded-full', open.terminal.online ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]')} />
              <span className="font-medium text-[var(--color-ink)]">{open.terminal.name}</span>
              <span className="text-[var(--color-ink-tertiary)]">{open.terminal.online ? t('fid.online') : t('fid.offline_ago', { n: open.terminal.lastSeenMin ?? 0 })}</span>
            </div>
            {records
              .filter((r) => r.employee.branch === open.id)
              .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
              .map((r) => (
                <div key={r.employee.id} className="flex items-center">
                  <div className="min-w-0 flex-1">
                    <EmployeeRow r={r} />
                  </div>
                  <StatusChip status={r.status} />
                </div>
              ))}
          </div>
        )}
      </Drawer>
    </div>
  )
}
