import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { translate, type DictKey } from '@/shared/config/dictionaries'
import { useUiStore, type Locale } from '@/shared/config/uiStore'

type Vars = Record<string, string | number>

interface I18nValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: DictKey, vars?: Vars) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useUiStore((s) => s.locale)
  const setLocale = useUiStore((s) => s.setLocale)
  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t: (key, vars) => translate(locale, key, vars) }), [locale, setLocale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
