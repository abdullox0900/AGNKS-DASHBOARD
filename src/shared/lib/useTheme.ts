import { useSyncExternalStore } from 'react'
import { resolveTheme, useUiStore, type ResolvedTheme } from '@/shared/config/uiStore'

const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

function subscribe(cb: () => void) {
  query?.addEventListener('change', cb)
  return () => query?.removeEventListener('change', cb)
}

/** The theme actually on screen ('auto' resolved against the OS). */
export function useResolvedTheme(): ResolvedTheme {
  const pref = useUiStore((s) => s.theme)
  useSyncExternalStore(subscribe, () => query?.matches ?? true)
  return resolveTheme(pref)
}
