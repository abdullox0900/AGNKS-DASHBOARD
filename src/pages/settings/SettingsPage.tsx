import { Link } from 'react-router-dom'
import { ChevronRight, Palette } from 'lucide-react'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const SECTIONS: { to: string; icon: React.ComponentType<{ size?: number }>; title: DictKey }[] = [
  { to: '/settings/appearance', icon: Palette, title: 'settings.appearance' },
]

/** Sozlamalar: the list of settings sections; each one is a page of its own. */
export function SettingsPage() {
  const { t } = useI18n()
  return (
    <div className="w-full max-w-3xl">
      <h2 className="text-[26px] font-bold tracking-tight text-[var(--color-ink)]">{t('nav.settings')}</h2>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3.5 transition-colors hover:bg-[var(--color-surface-alt)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <s.icon size={18} />
            </span>
            <span className="flex-1 text-[14.5px] font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-primary)]">{t(s.title)}</span>
            <ChevronRight size={16} className="text-[var(--color-ink-tertiary)]" />
          </Link>
        ))}
      </div>
    </div>
  )
}
