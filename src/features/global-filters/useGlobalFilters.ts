import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatDateInput, parseDateInput, resolvePreset, type PeriodPreset } from '@/shared/lib/dates'
import { useAuthStore } from '@/shared/config/authStore'

export interface GlobalFilters {
  stationIds: string[] | null
  preset: PeriodPreset
  from: Date
  to: Date
}

const STORE_KEY = 'agnks-dashboard-filters'
const DEFAULT_PRESET: PeriodPreset = 'all'

interface Saved {
  period?: PeriodPreset
  from?: string
  to?: string
  stations?: string
}
/** The last choice, kept in this browser so it survives reloads and new tabs. */
function readSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Saved
  } catch {
    return {}
  }
}
function save(patch: Saved): void {
  try {
    const next = { ...readSaved(), ...patch }
    for (const k of Object.keys(next) as (keyof Saved)[]) if (next[k] === undefined) delete next[k]
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch {
    // private mode / storage off: the URL still carries the choice
  }
}
/** URL first (shared links win), then what this browser chose last time. */
function source(params: URLSearchParams): URLSearchParams {
  if (params.get('period') || params.get('stations')) return params
  const saved = readSaved()
  const out = new URLSearchParams(params)
  if (saved.period) out.set('period', saved.period)
  if (saved.from) out.set('from', saved.from)
  if (saved.to) out.set('to', saved.to)
  if (saved.stations) out.set('stations', saved.stations)
  return out
}

/**
 * Station + period selection lives in the URL (TZ-3 §4.1) so reload, share,
 * and back/forward all work, and the filter carries over from page to page.
 */
export function useGlobalFilters(): { filters: GlobalFilters; setStations: (ids: string[] | null) => void; setPreset: (p: PeriodPreset) => void; setCustomRange: (from: Date, to: Date) => void } {
  const [urlParams, setParams] = useSearchParams()
  const stationId = useAuthStore((s) => s.stationId)
  const role = useAuthStore((s) => s.role)

  const filters = useMemo<GlobalFilters>(() => {
    const params = source(urlParams)
    // branch_manager is always scoped to their own station regardless of URL tampering.
    if (role === 'branch_manager') {
      const preset = (params.get('period') as PeriodPreset) || DEFAULT_PRESET
      const { from, to } = readRange(params, preset)
      return { stationIds: stationId ? [stationId] : null, preset, from, to }
    }

    const stationsParam = params.get('stations')
    const stationIds = stationsParam ? stationsParam.split(',').filter(Boolean) : null
    const preset = (params.get('period') as PeriodPreset) || DEFAULT_PRESET
    const { from, to } = readRange(params, preset)
    return { stationIds, preset, from, to }
  }, [urlParams, role, stationId])

  const setStations = useCallback(
    (ids: string[] | null) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (ids && ids.length > 0) next.set('stations', ids.join(','))
        else next.delete('stations')
        save({ stations: ids && ids.length > 0 ? ids.join(',') : undefined })
        return next
      })
    },
    [setParams],
  )

  const setPreset = useCallback(
    (p: PeriodPreset) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('period', p)
        next.delete('from')
        next.delete('to')
        save({ period: p, from: undefined, to: undefined })
        return next
      })
    },
    [setParams],
  )

  const setCustomRange = useCallback(
    (from: Date, to: Date) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('period', 'custom')
        next.set('from', formatDateInput(from))
        next.set('to', formatDateInput(to))
        save({ period: 'custom', from: formatDateInput(from), to: formatDateInput(to) })
        return next
      })
    },
    [setParams],
  )

  return { filters, setStations, setPreset, setCustomRange }
}

function readRange(params: URLSearchParams, preset: PeriodPreset): { from: Date; to: Date } {
  if (preset === 'custom') {
    const fromStr = params.get('from')
    const toStr = params.get('to')
    if (fromStr && toStr) return { from: parseDateInput(fromStr), to: parseDateInput(toStr) }
  }
  return resolvePreset(preset)
}
