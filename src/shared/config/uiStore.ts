import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Locale = 'uz' | 'ru'
/** 'auto' follows the OS colour scheme. */
export type ThemePref = 'dark' | 'light' | 'auto'
export type ResolvedTheme = 'dark' | 'light'

interface UiState {
  locale: Locale
  theme: ThemePref
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setLocale: (locale: Locale) => void
  setTheme: (theme: ThemePref) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      locale: 'uz',
      theme: 'dark',
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'agnks-dashboard-ui' },
  ),
)

export function getLocale(): Locale {
  return useUiStore.getState().locale
}

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === 'auto') return media?.matches ? 'dark' : 'light'
  return pref
}

function applyDom() {
  const { theme, locale } = useUiStore.getState()
  const root = document.documentElement
  root.dataset.theme = resolveTheme(theme)
  root.lang = locale
}

/** Call once before the first render: syncs <html data-theme lang> with the store and the OS scheme. */
export function initUi() {
  applyDom()
  useUiStore.subscribe(applyDom)
  media?.addEventListener('change', applyDom)
}
