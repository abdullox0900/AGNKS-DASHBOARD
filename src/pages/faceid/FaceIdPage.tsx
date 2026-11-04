import { ScanFace } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { useI18n } from '@/app/providers/I18nProvider'

/**
 * "FaceID — hodimlar davomati": the face-recognition terminals at the stations (TimeFace, a separate system with its
 * own backend and dashboard) record when employees arrive and leave. Showing that data here comes later, so for now
 * the section only says it is coming.
 */
export function FaceIdPage() {
  const { t } = useI18n()

  return (
    <div className="w-full">
      <div>
        <h2 className="flex flex-wrap items-center gap-3 text-[26px] font-bold tracking-tight text-[var(--color-ink)]">
          {t('faceid.title')}
          <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-[12px] font-semibold tracking-normal text-[var(--color-primary)]">{t('nav.soon')}</span>
        </h2>
        <p className="mt-1 text-[13px] text-[var(--color-ink-tertiary)]">{t('faceid.subtitle')}</p>
      </div>

      <Card className="mt-6">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <ScanFace size={42} />
          </div>
          <div className="min-w-0">
            <p className="text-[17px] font-bold text-[var(--color-ink)]">{t('faceid.hero_title')}</p>
            <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-[var(--color-ink-secondary)]">{t('faceid.hero_text')}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
