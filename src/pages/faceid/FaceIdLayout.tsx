import { Outlet, useLocation } from 'react-router-dom'
import { Badge } from '@/shared/ui/Badge'
import { DateNav, FaceTabs, useFaceDate } from '@/features/faceid/ui'
import { useFaceMode } from '@/features/faceid/useFaceData'
import { useI18n } from '@/app/providers/I18nProvider'

const DATED = new Set(['/faceid', '/faceid/employees', '/faceid/branches'])

/** FaceID section shell: the four tabs, the sample-data notice and (where it matters) the day picker. */
export function FaceIdLayout() {
  const { t } = useI18n()
  const { sample } = useFaceMode()
  const [date, setDate] = useFaceDate()
  const { pathname } = useLocation()
  const dated = DATED.has(pathname.replace(/\/$/, ''))

  return (
    <div className="w-full">
      {/* always-dark band (like the login art): its children read the same colour variables, overridden in .fid-band */}
      <div className="fid-band rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FaceTabs />
          <div className="flex flex-wrap items-center gap-2.5">
            {sample && <Badge tone="warning">{t('fid.sample')}</Badge>}
            {dated && <DateNav date={date} onChange={setDate} />}
          </div>
        </div>
        {/* "Umumiy" portals its big counter here */}
        <div id="fid-hero" />
      </div>
      <div className="mt-5">
        <Outlet />
      </div>
    </div>
  )
}

/** Page heading: title + one quiet line under it, actions on the right. */
export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[26px] font-bold tracking-tight text-[var(--color-ink)]">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-[var(--color-ink-tertiary)]">{sub}</p>}
      </div>
      {right}
    </div>
  )
}
