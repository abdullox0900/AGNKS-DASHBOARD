import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { contrast, ensureContrast, inkOn, mix, parseHex, rgba, toHex, type Rgb } from '@/shared/lib/color'

export type Locale = 'uz' | 'ru'
/** 'auto' follows the OS colour scheme. */
export type ThemePref = 'dark' | 'light' | 'auto'
export type ResolvedTheme = 'dark' | 'light'
/** How round the corners are everywhere (a multiplier of the default radii). */
export type RadiusPref = 'none' | 'sm' | 'md' | 'lg'
export const RADIUS_SCALE: Record<RadiusPref, number> = { none: 0, sm: 0.5, md: 1, lg: 1.6 }

interface UiState {
  locale: Locale
  theme: ThemePref
  /** custom accent colour as `#rrggbb`; null = the default cyan */
  accent: string | null
  radius: RadiusPref
  setAccent: (accent: string | null) => void
  setRadius: (radius: RadiusPref) => void
  resetAppearance: () => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  /** menu groups the person opened/closed by hand (group id → open); a group not listed opens by itself when it holds the current page */
  navOpen: Record<string, boolean>
  setNavOpen: (id: string, open: boolean) => void
  setLocale: (locale: Locale) => void
  setTheme: (theme: ThemePref) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      locale: 'uz',
      theme: 'dark',
      accent: null,
      radius: 'md',
      setAccent: (accent) => set({ accent }),
      setRadius: (radius) => set({ radius }),
      resetAppearance: () => set({ accent: null, radius: 'md' }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      navOpen: {},
      setNavOpen: (id, open) => set((s) => ({ navOpen: { ...s.navOpen, [id]: open } })),
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

const ACCENT_VARS = ['--color-primary', '--color-primary-ink', '--color-primary-soft', '--color-primary-strong', '--chart-1', '--boot-accent', '--accent-on-dark'] as const

/** Paints the chosen accent for the current theme: readable on the surface, with matching soft / strong / ink shades. */
function applyAccent(root: HTMLElement, accent: string | null, theme: ResolvedTheme) {
  const base = accent ? parseHex(accent) : null
  if (!base) {
    for (const v of ACCENT_VARS) root.style.removeProperty(v)
    return
  }
  const surface: Rgb = theme === 'dark' ? [16, 24, 35] : [255, 255, 255]
  const primary = ensureContrast(base, surface, theme === 'dark' ? 3 : 3.2)
  const strong = theme === 'dark' ? mix(primary, [255, 255, 255], 0.35) : mix(primary, [0, 0, 0], 0.2)
  root.style.setProperty('--color-primary', toHex(primary))
  root.style.setProperty('--color-primary-strong', toHex(strong))
  root.style.setProperty('--color-primary-soft', rgba(primary, 0.1))
  root.style.setProperty('--color-primary-ink', toHex(contrast(primary, [4, 33, 42]) >= contrast(primary, [255, 255, 255]) ? [4, 33, 42] : inkOn(primary)))
  root.style.setProperty('--chart-1', toHex(primary))
  root.style.setProperty('--boot-accent', toHex(primary))
  // the post-login screen is always dark, whatever the theme
  root.style.setProperty('--accent-on-dark', toHex(mix(primary, [255, 255, 255], 0.35)))
}

function applyDom() {
  const { theme, locale, accent, radius } = useUiStore.getState()
  const root = document.documentElement
  const resolved = resolveTheme(theme)
  root.dataset.theme = resolved
  root.lang = locale
  root.style.setProperty('--ui-radius', String(RADIUS_SCALE[radius] ?? 1))
  applyAccent(root, accent, resolved)
}

/** Call once before the first render: syncs <html data-theme lang> with the store and the OS scheme. */
export function initUi() {
  applyDom()
  useUiStore.subscribe(applyDom)
  media?.addEventListener('change', applyDom)
}
