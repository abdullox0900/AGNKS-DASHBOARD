import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { contrast, ensureContrast, inkOn, luminance, mix, parseHex, rgba, toHex, type Rgb } from '@/shared/lib/color'

export type Locale = 'uz' | 'ru'
/** 'auto' follows the OS colour scheme. */
export type ThemePref = 'dark' | 'light' | 'auto'
export type ResolvedTheme = 'dark' | 'light'
/** How round the corners are everywhere (a multiplier of the default radii). */
export type RadiusPref = 'none' | 'sm' | 'md' | 'lg'
/** Own page / panel colours per mode (`#rrggbb`); null = the built-in palette. */
export interface ModeColors {
  bg: string | null
  surface: string | null
}
export type SurfaceColors = Record<ResolvedTheme, ModeColors>
export const NO_COLORS: SurfaceColors = { dark: { bg: null, surface: null }, light: { bg: null, surface: null } }
export const RADIUS_SCALE: Record<RadiusPref, number> = { none: 0, sm: 0.5, md: 1, lg: 1.6 }

interface UiState {
  locale: Locale
  theme: ThemePref
  /** custom accent colour as `#rrggbb`; null = the default cyan */
  accent: string | null
  radius: RadiusPref
  /** background and panel colours the person chose, separately for dark and light mode */
  colors: SurfaceColors
  setSurfaceColor: (mode: ResolvedTheme, key: keyof ModeColors, hex: string | null) => void
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
      colors: NO_COLORS,
      setSurfaceColor: (mode, key, hex) => set((s) => ({ colors: { ...s.colors, [mode]: { ...s.colors[mode], [key]: hex } } })),
      setAccent: (accent) => set({ accent }),
      setRadius: (radius) => set({ radius }),
      resetAppearance: () => set({ accent: null, radius: 'md', colors: NO_COLORS }),
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
const SURFACE_VARS = ['--color-bg', '--color-surface', '--color-surface-alt', '--color-border', '--color-border-strong', '--color-track', '--color-skeleton-base', '--color-skeleton-highlight', '--boot-bg'] as const

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]
const DEFAULT_PAIR: Record<ResolvedTheme, { bg: Rgb; surface: Rgb }> = {
  dark: { bg: [10, 15, 22], surface: [16, 24, 35] },
  light: { bg: [243, 246, 249], surface: [255, 255, 255] },
}
const INK: Record<ResolvedTheme, Rgb> = { dark: [230, 237, 245], light: [11, 23, 34] }

/** The page and panel colours actually on screen for `mode`, and whether they read as a light or a dark design. */
function surfacePalette(mode: ResolvedTheme, own: ModeColors) {
  const ownBg = own.bg ? parseHex(own.bg) : null
  const ownSurface = own.surface ? parseHex(own.surface) : null
  if (!ownBg && !ownSurface) return { custom: false, family: mode, bg: DEFAULT_PAIR[mode].bg, surface: DEFAULT_PAIR[mode].surface }

  const reads = (c: Rgb): ResolvedTheme => (luminance(c) > 0.42 ? 'light' : 'dark')
  let bg: Rgb
  let surface: Rgb
  if (ownBg && ownSurface) {
    bg = ownBg
    surface = ownSurface
  } else if (ownBg) {
    bg = ownBg
    surface = reads(bg) === 'light' ? mix(bg, WHITE, 0.8) : mix(bg, WHITE, 0.055)
  } else {
    surface = ownSurface!
    bg = reads(surface) === mode ? DEFAULT_PAIR[mode].bg : reads(surface) === 'light' ? mix(surface, BLACK, 0.04) : mix(surface, BLACK, 0.35)
  }
  return { custom: true, family: reads(surface), bg, surface }
}

/** Paints the chosen accent: readable on the panel colour, with matching soft / strong / ink shades. */
function applyAccent(root: HTMLElement, accent: string | null, family: ResolvedTheme, surface: Rgb) {
  const base = accent ? parseHex(accent) : null
  if (!base) {
    for (const v of ACCENT_VARS) root.style.removeProperty(v)
    return
  }
  const primary = ensureContrast(base, surface, family === 'dark' ? 3 : 3.2)
  const strong = family === 'dark' ? mix(primary, WHITE, 0.35) : mix(primary, BLACK, 0.2)
  root.style.setProperty('--color-primary', toHex(primary))
  root.style.setProperty('--color-primary-strong', toHex(strong))
  root.style.setProperty('--color-primary-soft', rgba(primary, 0.1))
  root.style.setProperty('--color-primary-ink', toHex(contrast(primary, [4, 33, 42]) >= contrast(primary, WHITE) ? [4, 33, 42] : inkOn(primary)))
  root.style.setProperty('--chart-1', toHex(primary))
  root.style.setProperty('--boot-accent', toHex(primary))
  // the post-login screen is always dark, whatever the theme
  root.style.setProperty('--accent-on-dark', toHex(mix(primary, WHITE, 0.35)))
}

function applySurfaces(root: HTMLElement, palette: ReturnType<typeof surfacePalette>) {
  if (!palette.custom) {
    for (const v of SURFACE_VARS) root.style.removeProperty(v)
    return
  }
  const ink = INK[palette.family]
  const alt = palette.family === 'light' ? mix(palette.surface, BLACK, 0.035) : mix(palette.surface, WHITE, 0.045)
  const set = (k: string, c: Rgb) => root.style.setProperty(k, toHex(c))
  set('--color-bg', palette.bg)
  set('--boot-bg', palette.bg)
  set('--color-surface', palette.surface)
  set('--color-surface-alt', alt)
  set('--color-border', mix(palette.surface, ink, 0.12))
  set('--color-border-strong', mix(palette.surface, ink, 0.22))
  set('--color-track', mix(palette.surface, ink, 0.09))
  set('--color-skeleton-base', alt)
  set('--color-skeleton-highlight', mix(alt, ink, 0.07))
}

function applyDom() {
  const { theme, locale, accent, radius, colors } = useUiStore.getState()
  const root = document.documentElement
  const mode = resolveTheme(theme)
  const palette = surfacePalette(mode, colors?.[mode] ?? NO_COLORS[mode])
  // a light panel colour in dark mode (or the other way round) switches the whole design to its light (dark) family,
  // so text and status colours stay readable
  root.dataset.theme = palette.family
  root.lang = locale
  root.style.setProperty('--ui-radius', String(RADIUS_SCALE[radius] ?? 1))
  applySurfaces(root, palette)
  applyAccent(root, accent, palette.family, palette.surface)
}

/** Call once before the first render: syncs <html data-theme lang> with the store and the OS scheme. */
export function initUi() {
  applyDom()
  useUiStore.subscribe(applyDom)
  media?.addEventListener('change', applyDom)
}
