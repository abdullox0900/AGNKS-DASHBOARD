import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download, Pencil, Search } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Drawer } from '@/shared/ui/Drawer'
import { useToast } from '@/shared/ui/Toast'
import { Person, StatusChip, useFaceDate } from '@/features/faceid/ui'
import { BRANCHES, STATUS_ORDER, dayRecords, workedLabel, type DayRecord, type Status } from '@/features/faceid/mock'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

const PAGE = 14
const FILTERS: (Status | 'all')[] = ['all', 'came', 'late', 'absent', 'pending', 'off']

/** "Jurnal": every employee of the day in one list, filterable; a record can be corrected by hand (with a reason). */
export function LogPage() {
  const { t } = useI18n()
  const { show } = useToast()
  const [date] = useFaceDate()
  const [q, setQ] = useState('')
  const [branch, setBranch] = useState('all')
  const [status, setStatus] = useState<Status | 'all'>('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<DayRecord | null>(null)
  const [reason, setReason] = useState('')

  const rows = useMemo(
    () =>
      dayRecords(date)
        .filter((r) => (branch === 'all' || String(r.employee.branch) === branch) && (status === 'all' || r.status === status) && r.employee.name.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.employee.name.localeCompare(b.employee.name)),
    [date, q, branch, status],
  )
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const cur = Math.min(page, pages)
  const view = rows.slice((cur - 1) * PAGE, cur * PAGE)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-full max-w-[260px] items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 focus-within:border-[var(--color-primary)]">
          <Search size={15} className="text-[var(--color-ink-tertiary)]" />
          <input value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder={t('fid.search')} className="w-full bg-transparent text-[13px] text-[var(--color-ink)] outline-none" />
        </label>
        <select
          value={branch}
          onChange={(e) => (setBranch(e.target.value), setPage(1))}
          className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
        >
          <option value="all">{t('fid.all_branches')}</option>
          {BRANCHES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => (setStatus(f), setPage(1))}
              className={cn(
                'h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors',
                status === f ? 'bg-[var(--color-ink)] text-[var(--color-bg)]' : 'border border-[var(--color-border)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]',
              )}
            >
              {f === 'all' ? t('fid.f_all') : t(`fid.s_${f}`)}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => show(t('fid.sample_toast'))}>
          <Download size={14} /> Excel
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-4 border-b border-[var(--color-border)] px-2 pb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-tertiary)]">
        <span className="min-w-0 flex-1">{t('fid.c_employee')}</span>
        <span className="hidden w-[140px] md:block">{t('common.station')}</span>
        <span className="w-16">{t('fid.c_in')}</span>
        <span className="w-16">{t('fid.c_out')}</span>
        <span className="hidden w-24 lg:block">{t('fid.c_worked')}</span>
        <span className="w-36">{t('common.status')}</span>
        <span className="w-8" />
      </div>
      {view.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-[var(--color-ink-tertiary)]">{t('fid.none')}</p>
      ) : (
        <ul>
          {view.map((r) => (
            <li key={r.employee.id} className="group flex items-center gap-4 rounded-md px-2 py-2.5 transition-colors hover:bg-[var(--color-surface-alt)]">
              <Link to={`/faceid/employees/${r.employee.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Person e={r.employee} size={34} />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-[var(--color-ink)] group-hover:text-[var(--color-primary)]">{r.employee.name}</span>
                  <span className="block truncate text-[12px] text-[var(--color-ink-tertiary)]">{r.employee.position}</span>
                </span>
              </Link>
              <span className="hidden w-[140px] truncate text-[13px] text-[var(--color-ink-secondary)] md:block">{BRANCHES[r.employee.branch].name}</span>
              <span className="tnum w-16 text-[13px] text-[var(--color-ink-secondary)]">{r.in ?? '—'}</span>
              <span className="tnum w-16 text-[13px] text-[var(--color-ink-secondary)]">{r.out ?? (r.now ? t('fid.at_work') : '—')}</span>
              <span className="tnum hidden w-24 text-[13px] text-[var(--color-ink-secondary)] lg:block">{workedLabel(r.worked)}</span>
              <span className="w-36">
                <StatusChip status={r.status} extra={r.late ? t('fid.min', { n: r.late }) : undefined} />
              </span>
              <button type="button" onClick={() => (setEditing(r), setReason(''))} aria-label={t('fid.edit')} title={t('fid.edit')} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-tertiary)] opacity-0 transition-opacity hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] group-hover:opacity-100 focus-visible:opacity-100">
                <Pencil size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
        <p className="tnum text-[12.5px] text-[var(--color-ink-tertiary)]">{t('clients.range', { from: rows.length ? (cur - 1) * PAGE + 1 : 0, to: (cur - 1) * PAGE + view.length, total: rows.length })}</p>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)} aria-label={t('clients.prev')}>
              <ChevronLeft size={15} />
            </Button>
            <span className="tnum px-2 text-[13px] text-[var(--color-ink-secondary)]">
              {cur} / {pages}
            </span>
            <Button variant="ghost" size="sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)} aria-label={t('clients.next')}>
              <ChevronRight size={15} />
            </Button>
          </div>
        )}
      </div>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={t('fid.edit_title')}>
        {editing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Person e={editing.employee} size={40} />
              <div>
                <p className="text-[14.5px] font-semibold text-[var(--color-ink)]">{editing.employee.name}</p>
                <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">
                  {BRANCHES[editing.employee.branch].name} · {date}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['in', 'out'] as const).map((k) => (
                <label key={k} className="block text-[13px] font-medium text-[var(--color-ink-secondary)]">
                  {t(k === 'in' ? 'fid.c_in' : 'fid.c_out')}
                  <input type="time" defaultValue={editing[k] ?? ''} className="mt-1 h-10 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]" />
                </label>
              ))}
            </div>
            <label className="block text-[13px] font-medium text-[var(--color-ink-secondary)]">
              {t('common.note_required')}
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1 w-full resize-none rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-[13.5px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]" />
            </label>
            <p className="text-[12px] text-[var(--color-ink-tertiary)]">{t('fid.edit_hint')}</p>
            <Button className="w-full" disabled={reason.trim().length < 3} onClick={() => (show(t('fid.sample_toast')), setEditing(null))}>
              {t('common.save')}
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  )
}
