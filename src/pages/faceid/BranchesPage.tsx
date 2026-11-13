import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, CircleAlert, CircleCheck, CircleX, Download, LogOut, Pencil, Search, Users, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { ArrivalCell, Person, StateLabel, dstate, hoursLabel, useFaceDate, useNote } from '@/features/faceid/ui'
import { BRANCHES, SHIFT_HOURS, countOf, dayLabel, dayRecords, todayStr, type DayRecord } from '@/features/faceid/mock'
import { PageHead } from './FaceIdLayout'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const th = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-tertiary)]'

/** One employee row; for late / absent days the manager can write the reason under the state (pencil → save). */
function Row({ r, date, isToday, blind }: { r: DayRecord; date: string; isToday: boolean; blind: boolean }) {
  const { t } = useI18n()
  const { show } = useToast()
  const [note, setNote] = useNote(r, date)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note)
  const state = dstate(r, isToday)
  const canNote = r.status === 'absent' || r.status === 'late'
  return (
    <tr className="border-t border-[var(--color-border)] align-top">
      <td className="px-3 py-2.5 pl-5">
        <Link to={`/faceid/employees/${r.employee.id}`} className="flex items-center gap-3">
          <Person e={r.employee} size={34} />
          <span>
            <span className="block font-semibold text-[var(--color-ink)] hover:underline">{r.employee.name}</span>
            <span className="block text-[12px] text-[var(--color-ink-tertiary)]">{r.employee.position}</span>
          </span>
        </Link>
      </td>
      <td className="px-3 py-2.5">
        <span className="block font-medium text-[var(--color-ink)]">{t(r.employee.shift === 'day' ? 'fid.shift_day' : 'fid.shift_night')}</span>
        <span className="tnum block text-[12px] text-[var(--color-ink-tertiary)]">{SHIFT_HOURS[r.employee.shift]}</span>
      </td>
      <td className="px-3 py-2.5">{blind ? <span className="text-[var(--color-ink-tertiary)]">—</span> : <ArrivalCell r={r} />}</td>
      <td className="tnum px-3 py-2.5 text-[var(--color-ink-secondary)]">{blind ? '—' : r.out ?? '—'}</td>
      <td className="tnum px-3 py-2.5 text-[var(--color-ink-secondary)]">{blind || !r.in ? '—' : hoursLabel(r.worked, r.now, t)}</td>
      <td className="px-3 py-2.5">
        {blind ? <span className="text-[12.5px] text-[var(--color-ink-tertiary)]">{t('fid.no_data')}</span> : <StateLabel state={state} isToday={isToday} />}
        {canNote && !editing && note && <span className="mt-1 block max-w-[210px] text-[12px] text-[var(--color-ink-tertiary)]">{note}</span>}
        {editing && (
          <span className="mt-1.5 flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setNote(draft.trim()), setEditing(false), show(t('fid.note_saved')))}
              placeholder={t('fid.note_ph')}
              className="h-8 w-[190px] rounded-md border border-[var(--color-primary)] bg-[var(--color-bg)] px-2 text-[12.5px] text-[var(--color-ink)] outline-none"
            />
            <button type="button" aria-label={t('common.save')} onClick={() => (setNote(draft.trim()), setEditing(false), show(t('fid.note_saved')))} className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-primary)] text-[var(--color-primary-ink)]">
              <Check size={14} />
            </button>
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 pr-5 text-right">
        {canNote && !editing && (
          <button type="button" aria-label={t('fid.note')} onClick={() => (setDraft(note), setEditing(true))} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-tertiary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-ink)]">
            <Pencil size={14} />
          </button>
        )}
      </td>
    </tr>
  )
}

/** "Filiallar": a quick-jump strip and one card per branch with its employees. */
export function BranchesPage() {
  const { t, locale } = useI18n()
  const { show } = useToast()
  const [date] = useFaceDate()
  const isToday = date === todayStr()
  const records = dayRecords(date).filter((r) => r.status !== 'off')
  const { hash } = useLocation()
  const [q, setQ] = useState('')

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  const branches = BRANCHES.filter((b) => !q.trim() || b.name.toLowerCase().includes(q.trim().toLowerCase()))
  const online = BRANCHES.filter((b) => b.terminal.online).length

  return (
    <div>
      <PageHead
        title={t('fid.tab_branches')}
        sub={t('fid.br_sub', { n: BRANCHES.length, on: online, date: dayLabel(date, locale) })}
        right={
          <label className="flex h-10 w-full max-w-[300px] items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-ink-tertiary)] sm:w-[260px]">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('fid.br_search')} className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)]" />
          </label>
        }
      />

      <div className="flex flex-wrap gap-2">
        {BRANCHES.map((b) => {
          const list = records.filter((r) => r.employee.branch === b.id)
          const blind = isToday && !b.terminal.online
          const here = list.filter((r) => (isToday ? r.now : r.status === 'came' || r.status === 'late')).length
          return (
            <a key={b.id} href={`#b${b.id}`} className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]">
              {b.terminal.online ? <Wifi size={15} className="text-[var(--color-success)]" /> : <WifiOff size={15} className="text-[var(--color-ink-tertiary)]" />}
              {b.name}
              <span className={cn('tnum text-[12.5px]', blind ? 'text-[var(--color-ink-tertiary)]' : 'text-[var(--color-success)]')}>{blind ? '—' : `${here}/${list.length}`}</span>
            </a>
          )
        })}
      </div>

      <h3 className="mb-3 mt-6 flex items-center justify-between text-[15px] font-semibold text-[var(--color-ink)]">
        {t('fid.br_all')}
        <Button variant="ghost" size="sm" onClick={() => show(t('fid.sample_toast'))}>
          <Download size={14} /> Excel
        </Button>
      </h3>

      <div className="grid gap-4 2xl:grid-cols-2">
        {branches.map((b) => {
          const list = records.filter((r) => r.employee.branch === b.id)
          const blind = isToday && !b.terminal.online
          const st = (r: DayRecord) => dstate(r, isToday)
          return (
            <section key={b.id} id={`b${b.id}`} className="min-w-0 scroll-mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <header className="flex items-center justify-between gap-3 px-5 py-3.5">
                <h4 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-ink)]">
                  {b.terminal.online ? <Wifi size={15} className="text-[var(--color-success)]" /> : <WifiOff size={15} className="text-[var(--color-ink-tertiary)]" />}
                  {b.name}
                </h4>
                {blind ? (
                  <span className="text-[12.5px] text-[var(--color-ink-tertiary)]">{t('fid.no_data')}</span>
                ) : (
                  <span className="tnum flex items-center gap-3.5 text-[13px] font-semibold">
                    <span className="flex items-center gap-1 text-[var(--color-success)]">
                      <CircleCheck size={15} />
                      {list.filter((r) => (isToday ? r.now : r.status === 'came' || r.status === 'late')).length}
                    </span>
                    <span className="flex items-center gap-1 text-[var(--color-amber)]">
                      <CircleAlert size={15} />
                      {countOf(list, 'late')}
                    </span>
                    {isToday && (
                      <span className="flex items-center gap-1 text-[var(--color-ink-secondary)]">
                        <LogOut size={15} />
                        {list.filter((r) => r.out).length}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[var(--color-danger)]">
                      <CircleX size={15} />
                      {countOf(list, 'absent')}
                    </span>
                    <span className="flex items-center gap-1 text-[var(--color-primary)]">
                      <Users size={15} />
                      {list.length}
                    </span>
                  </span>
                )}
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13.5px]">
                  <thead className="bg-[var(--color-surface-alt)]/60">
                    <tr>
                      <th className={cn(th, 'pl-5')}>{t('fid.c_employee')}</th>
                      <th className={th}>{t('fid.col_shift')}</th>
                      <th className={th}>{t('fid.c_in')}</th>
                      <th className={th}>{t('fid.c_out')}</th>
                      <th className={th}>{t('fid.col_hours')}</th>
                      <th className={th}>{t('fid.col_status')}</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {[...list]
                      .sort((a, c) => ({ here: 0, late: 1, left: 2, absent: 3, pending: 4 })[st(a)] - ({ here: 0, late: 1, left: 2, absent: 3, pending: 4 })[st(c)] || a.employee.name.localeCompare(c.employee.name))
                      .map((r) => (
                        <Row key={r.employee.id} r={r} date={date} isToday={isToday} blind={blind} />
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
