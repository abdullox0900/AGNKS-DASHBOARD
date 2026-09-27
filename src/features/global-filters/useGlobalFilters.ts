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

/**
 * Station + period selection lives in the URL (TZ-3 §4.1) so reload, share,
 * and back/forward all work, and the filter carries over from page to page.
 */
export function useGlobalFilters(): { filters: GlobalFilters; setStations: (ids: string[] | null) => void; setPreset: (p: PeriodPreset) => void; setCustomRange: (from: Date, to: Date) => void } {
  const [params, setParams] = useSearchParams()
  const stationId = useAuthStore((s) => s.stationId)
  const role = useAuthStore((s) => s.role)

  const filters = useMemo<GlobalFilters>(() => {
    // branch_manager is always scoped to their own station regardless of URL tampering.
    if (role === 'branch_manager') {
      const preset = (params.get('period') as PeriodPreset) || '7d'
      const { from, to } = readRange(params, preset)
      return { stationIds: stationId ? [stationId] : null, preset, from, to }
    }

    const stationsParam = params.get('stations')
    const stationIds = stationsParam ? stationsParam.split(',').filter(Boolean) : null
    const preset = (params.get('period') as PeriodPreset) || '7d'
    const { from, to } = readRange(params, preset)
    return { stationIds, preset, from, to }
  }, [params, role, stationId])

  const setStations = useCallback(
    (ids: string[] | null) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (ids && ids.length > 0) next.set('stations', ids.join(','))
        else next.delete('stations')
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
