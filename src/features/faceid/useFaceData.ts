import { useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { apiFaceBranches, apiFaceDay, apiFaceEmployees, apiFaceEvents, apiFaceRange, apiFaceStatus } from '@/shared/api/faceid'
import { applyBase, applyEvents, applyRecords } from './mock'
import { todayStr } from './mock'
import { useNotes } from './notes'

export interface FaceRequest {
  /** one full day (knows who is at work right now) */
  day?: string
  /** many days (month calendar, analytics) */
  range?: [string, string]
  /** scans of one day */
  events?: string
}
export interface FaceLoad {
  ready: boolean
  /** true while AGNKS is still showing sample data (no TimeFace key on the server) */
  sample: boolean
  error: unknown
  /** changes whenever new data was applied — put it in the deps of anything derived from the data */
  stamp: number
  retry: () => void
}

const KEEP = { revalidateOnFocus: false, shouldRetryOnError: false } as const

/** "Is this server connected to TimeFace?" — the layout only needs this to show the sample badge. */
export function useFaceMode() {
  const status = useSWR('faceid:status', apiFaceStatus, KEEP)
  return { sample: status.data?.configured === false, known: status.data !== undefined }
}

/**
 * Loads what a FaceID screen needs. Without a TimeFace key on the server the screens keep showing the
 * built-in sample; with one, the data comes from AGNKS's backend (which reads TimeFace) and is applied to
 * the same store, so the screens don't care where it came from.
 */
export function useFaceData(req: FaceRequest): FaceLoad {
  const status = useSWR('faceid:status', apiFaceStatus, KEEP)
  const live = status.data?.configured === true
  const today = todayStr()

  const base = useSWR(live ? 'faceid:base' : null, async () => ({ b: await apiFaceBranches(), e: await apiFaceEmployees() }), { ...KEEP, refreshInterval: 120_000 })
  const ok = live && !!base.data
  const day = useSWR(ok && req.day ? ['faceid:day', req.day] : null, () => apiFaceDay(req.day!), { ...KEEP, refreshInterval: req.day === today ? 30_000 : 0 })
  const range = useSWR(ok && req.range ? ['faceid:range', req.range[0], req.range[1]] : null, () => apiFaceRange(req.range![0], req.range![1]), { ...KEEP, refreshInterval: 120_000 })
  const events = useSWR(ok && req.events ? ['faceid:events', req.events] : null, () => apiFaceEvents(req.events!), { ...KEEP, refreshInterval: req.events === today ? 30_000 : 0 })

  // The store is global and filling it is idempotent, so it is safe to do during render: children read it right after.
  const stamp = useMemo(() => {
    if (base.data) applyBase(base.data.b, base.data.e)
    if (range.data) applyRecords(range.data.records, range.data.notes, false)
    if (day.data) applyRecords(day.data.records, day.data.notes, true)
    if (events.data && req.events) applyEvents(req.events, events.data)
    return Date.now()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.data, day.data, range.data, events.data])

  useEffect(() => {
    const notes = { ...(range.data?.notes ?? {}), ...(day.data?.notes ?? {}) }
    if (Object.keys(notes).length) useNotes.getState().seed(notes)
  }, [range.data, day.data])

  const error = status.error ?? base.error ?? day.error ?? range.error ?? events.error
  const ready = status.data !== undefined && (!live || (!!base.data && (!req.day || !!day.data) && (!req.range || !!range.data) && (!req.events || !!events.data)))
  const retry = () => void Promise.all([status.mutate(), base.mutate(), day.mutate(), range.mutate(), events.mutate()])
  return { ready, sample: status.data?.configured === false, error, stamp, retry }
}
