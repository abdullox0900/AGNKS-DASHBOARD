import { Outlet } from 'react-router-dom'
import { Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { PopoverContent, PopoverRoot, PopoverTrigger } from '@/shared/ui/Menu'
import { DateNav, FaceTabs, useFaceDate } from '@/features/faceid/ui'
import { BRANCHES, rejectedAttempts } from '@/features/faceid/mock'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'

/** Terminals at a glance: all online, or which ones went silent (a silent terminal makes everybody look absent). */
function DeviceStatus() {
  const { t } = useI18n()
  const offline = BRANCHES.filter((b) => !b.terminal.online)
  const ok = offline.length === 0
  return (
    <PopoverRoot>
      <PopoverTrigger
        className={cn(
          'flex h-9 items-center gap-2 rounded-lg border px-3 text-[12.5px] font-medium outline-none transition-colors hover:bg-[var(--color-surface-alt)]',
          ok ? 'border-[var(--color-border)] text-[var(--color-ink-secondary)]' : 'border-[var(--color-amber)]/50 text-[var(--color-amber)]',
        )}
      >
        {ok ? <Wifi size={15} className="text-[var(--color-success)]" /> : <WifiOff size={15} />}
        {t('fid.devices_online', { n: BRANCHES.length - offline.length, total: BRANCHES.length })}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-1.5">
        <p className="px-2.5 pb-1 pt-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-tertiary)]">{t('fid.devices')}</p>
        {BRANCHES.map((b) => (
          <div key={b.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', b.terminal.online ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]')} />
            <span className="flex-1 text-[13px] font-medium text-[var(--color-ink)]">{b.name}</span>
            <span className="whitespace-nowrap text-[12px] text-[var(--color-ink-tertiary)]">{b.terminal.online ? t('fid.online') : t('fid.offline_ago', { n: b.terminal.lastSeenMin ?? 0 })}</span>
          </div>
        ))}
      </PopoverContent>
    </PopoverRoot>
  )
}

/** FaceID section shell: title, sample-data notice, terminals, day navigation and the tabs. */
export function FaceIdLayout() {
  const { t } = useI18n()
  const [date, setDate] = useFaceDate()
  const showDate = !window.location.pathname.endsWith('/timesheet')
  const newCount = rejectedAttempts().filter((r) => !r.handled).length

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-center gap-3 text-[26px] font-bold tracking-tight text-[var(--color-ink)]">
          {t('fid.title')}
          <Badge tone="warning">{t('fid.sample')}</Badge>
        </h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <DeviceStatus />
          {showDate && <DateNav date={date} onChange={setDate} />}
        </div>
      </div>
      <div className="mb-5 mt-4">
        <FaceTabs unrecognized={newCount} />
      </div>
      <Outlet />
    </div>
  )
}
