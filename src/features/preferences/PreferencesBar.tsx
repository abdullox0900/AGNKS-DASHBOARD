import { Globe, Monitor, Moon, Sun } from 'lucide-react'
import { useI18n } from '@/app/providers/I18nProvider'
import { useUiStore, type Locale, type ThemePref } from '@/shared/config/uiStore'
import { useResolvedTheme } from '@/shared/lib/useTheme'
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger } from '@/shared/ui/Menu'
import type { DictKey } from '@/shared/config/dictionaries'

const triggerClass =
  'flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-[12.5px] font-medium text-[var(--color-ink-secondary)] outline-none transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] focus-visible:border-[var(--color-primary)] data-[state=open]:border-[var(--color-primary)]'

const LANGS: { value: Locale; label: DictKey }[] = [
  { value: 'uz', label: 'lang.uz' },
  { value: 'ru', label: 'lang.ru' },
]

const THEMES: { value: ThemePref; label: DictKey; icon: typeof Sun }[] = [
  { value: 'dark', label: 'theme.dark', icon: Moon },
  { value: 'light', label: 'theme.light', icon: Sun },
  { value: 'auto', label: 'theme.auto', icon: Monitor },
]

/** Language + theme switchers — used in the top bar and on the login page. */
export function PreferencesBar() {
  const { t, locale, setLocale } = useI18n()
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const resolved = useResolvedTheme()
  const ThemeIcon = resolved === 'dark' ? Moon : Sun

  return (
    <div className="flex items-center gap-2">
      <Menu>
        <MenuTrigger className={triggerClass} aria-label={t('prefs.language')}>
          <Globe size={15} />
          <span className="uppercase">{locale}</span>
        </MenuTrigger>
        <MenuContent align="end" className="w-44">
          <MenuRadioGroup value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            {LANGS.map((l) => (
              <MenuRadioItem key={l.value} value={l.value}>
                {t(l.label)}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>

      <Menu>
        <MenuTrigger className={triggerClass} aria-label={t('prefs.theme')}>
          <ThemeIcon size={15} />
        </MenuTrigger>
        <MenuContent align="end" className="w-44">
          <MenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePref)}>
            {THEMES.map((th) => (
              <MenuRadioItem key={th.value} value={th.value}>
                <th.icon size={14} /> {t(th.label)}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>
    </div>
  )
}
