import { Clock, FileSpreadsheet, LogIn, ScanFace, Store } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const FEATURES: { icon: React.ComponentType<{ size?: number }>; title: DictKey; text: DictKey }[] = [
  { icon: LogIn, title: 'faceid.f1_title', text: 'faceid.f1_text' },
  { icon: Clock, title: 'faceid.f2_title', text: 'faceid.f2_text' },
  { icon: Store, title: 'faceid.f3_title', text: 'faceid.f3_text' },
  { icon: FileSpreadsheet, title: 'faceid.f4_title', text: 'faceid.f4_text' },
]

/** Sample rows for the preview only — not real data. */
const SAMPLE = [
  { name: 'Aziz R.', station: 'Filial 1', in: '08:02', out: '17:05', late: false },
  { name: 'Dilnoza K.', station: 'Filial 1', in: '08:41', out: '17:00', late: true },
  { name: 'Sardor M.', station: 'Filial 2', in: '07:58', out: '—', late: false },
  { name: 'Jasur T.', station: 'Filial 3', in: '—', out: '—', late: false },
]

/**
 * "FaceID — hodimlar davomati": employees check in / out by face at the station. The terminal side already
 * exists as a separate system; connecting it to this Dashboard comes next, so for now the section explains
 * what is coming and shows what it will look like.
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

      <Card className="mt-6 overflow-hidden">
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

      <h3 className="mb-2 mt-8 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-tertiary)]">{t('faceid.what')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex gap-3 rounded-xl border border-[var(--color-border)] p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-ink-secondary)]">
              <f.icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[var(--color-ink)]">{t(f.title)}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--color-ink-tertiary)]">{t(f.text)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-2 mt-8 flex items-center justify-between gap-3">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-tertiary)]">{t('faceid.preview')}</h3>
        <span className="text-[11.5px] text-[var(--color-ink-tertiary)]">{t('faceid.preview_note')}</span>
      </div>
      <div className="pointer-events-none relative select-none" aria-hidden>
        <div className="opacity-60 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
          <div className="grid gap-2.5 sm:grid-cols-3">
            {[
              { label: t('faceid.s_came'), value: '11 / 14' },
              { label: t('faceid.s_late'), value: '2' },
              { label: t('faceid.s_absent'), value: '3' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[var(--color-border)] px-4 py-3">
                <p className="text-[12px] font-medium text-[var(--color-ink-secondary)]">{s.label}</p>
                <p className="tnum mt-0.5 text-[26px] font-bold leading-tight text-[var(--color-ink)]">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 border-b border-[var(--color-border)] px-2 pb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-tertiary)]">
            <span className="min-w-0 flex-1">{t('faceid.c_name')}</span>
            <span className="hidden w-[110px] shrink-0 sm:block">{t('common.station')}</span>
            <span className="w-[70px] shrink-0">{t('faceid.c_in')}</span>
            <span className="w-[70px] shrink-0">{t('faceid.c_out')}</span>
          </div>
          <ul>
            {SAMPLE.map((r) => (
              <li key={r.name} className="flex items-center gap-4 px-2 py-2.5 text-[13.5px]">
                <span className="min-w-0 flex-1 font-medium text-[var(--color-ink)]">{r.name}</span>
                <span className="hidden w-[110px] shrink-0 text-[var(--color-ink-secondary)] sm:block">{r.station}</span>
                <span className={`tnum w-[70px] shrink-0 ${r.late ? 'font-semibold text-[var(--color-amber)]' : 'text-[var(--color-ink-secondary)]'}`}>{r.in}</span>
                <span className="tnum w-[70px] shrink-0 text-[var(--color-ink-secondary)]">{r.out}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
