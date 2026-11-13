import { useState } from 'react'
import { CircleHelp, ScanFace, UserRoundX } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { rejectedAttempts, todayStr, addDays, type RejectReason } from '@/features/faceid/mock'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const REASON: Record<RejectReason, { label: DictKey; icon: typeof ScanFace }> = {
  unknown_face: { label: 'fid.r_unknown', icon: CircleHelp },
  low_confidence: { label: 'fid.r_low', icon: ScanFace },
  not_registered: { label: 'fid.r_not_registered', icon: UserRoundX },
}

/** "Tanilmaganlar": scans the terminal refused (face not recognised, too unsure, person not in the base), with the photo. */
export function UnrecognizedPage() {
  const { t } = useI18n()
  const { show } = useToast()
  const [tab, setTab] = useState<'new' | 'done'>('new')
  const all = rejectedAttempts()
  const list = all.filter((r) => (tab === 'new' ? !r.handled : r.handled))
  const today = todayStr()

  const whenLabel = (date: string, at: string) => (date === today ? `${t('fid.today')}, ${at}` : date === addDays(today, -1) ? `${t('clients.yesterday')}, ${at}` : `${date}, ${at}`)

  return (
    <div>
      <div className="inline-flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5 text-[13px] font-medium">
        {(['new', 'done'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn('rounded-md px-3.5 py-1.5', tab === k ? 'bg-[var(--color-ink)] text-[var(--color-bg)]' : 'text-[var(--color-ink-secondary)]')}>
            {t(k === 'new' ? 'fid.u_new' : 'fid.u_done')} <span className="tnum opacity-70">{all.filter((r) => (k === 'new' ? !r.handled : r.handled)).length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-20 text-center text-[14px] text-[var(--color-ink-tertiary)]">{t('fid.u_empty')}</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => {
            const meta = REASON[r.reason]
            return (
              <div key={r.id} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-[var(--color-surface-alt)] to-[var(--color-track)]">
                  <ScanFace size={54} className="text-[var(--color-ink-tertiary)] opacity-60" strokeWidth={1.2} />
                  <span className="tnum absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[11.5px] font-medium text-white">{r.confidence}%</span>
                </div>
                <div className="p-4">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--color-ink)]">
                    <meta.icon size={15} className="text-[var(--color-amber)]" /> {t(meta.label)}
                  </p>
                  <p className="mt-1 text-[12.5px] text-[var(--color-ink-secondary)]">
                    {r.branch.name} · {r.branch.terminal.name}
                  </p>
                  <p className="tnum mt-0.5 text-[12px] text-[var(--color-ink-tertiary)]">{whenLabel(r.date, r.at)}</p>
                  {!r.handled && (
                    <div className="mt-3.5 flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => show(t('fid.sample_toast'))}>
                        {t('fid.u_assign')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => show(t('fid.sample_toast'))}>
                        {t('fid.u_ignore')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
