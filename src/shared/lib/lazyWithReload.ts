import { lazy, type ComponentType } from 'react'

const RELOAD_FLAG = 'agnks-chunk-reload'

/**
 * React.lazy that survives a redeploy: after `npm run build` the old chunk file names are
 * gone, so a tab opened before the deploy fails to import them ("Failed to fetch
 * dynamically imported module") and the page crashes. Reload once to pick up the new
 * index.html + chunks; the session flag stops a reload loop if the chunk is really broken.
 */
export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory()
      sessionStorage.removeItem(RELOAD_FLAG)
      return mod
    } catch (err) {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        return new Promise<never>(() => {})
      }
      throw err
    }
  })
}
