import { http } from './http'
import type { Filter } from './client'

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const res = await promise
  return res.data.data
}

function baseParams(filter: Filter, granularity?: 'day' | 'week' | 'month') {
  return {
    from: filter.from.toISOString(),
    to: filter.to.toISOString(),
    stationIds: filter.stationIds ?? undefined,
    granularity,
  }
}

export interface SeriesPoint {
  bucket: string
  count: number
  sum: number
}

/** `receipts`/`bonus` — daily/weekly/monthly buckets, already grouped server-side. */
export async function apiAnalyticsSeries(metric: 'receipts' | 'bonus', filter: Filter, granularity: 'day' | 'week' | 'month'): Promise<SeriesPoint[]> {
  const rows = await unwrap<{ bucket: string; count: string | number; sum: string | number }[]>(
    http.get(`/admin/analytics/${metric}`, { params: baseParams(filter, granularity) }),
  )
  return rows.map((r) => ({ bucket: r.bucket, count: Number(r.count), sum: Number(r.sum) }))
}

export interface ClientsPoint {
  bucket: string
  count: number
}

export async function apiAnalyticsClientsSeries(filter: Filter, granularity: 'day' | 'week' | 'month'): Promise<ClientsPoint[]> {
  const rows = await unwrap<{ bucket: string; count: string | number }[]>(
    http.get('/admin/analytics/clients', { params: baseParams(filter, granularity) }),
  )
  return rows.map((r) => ({ bucket: r.bucket, count: Number(r.count) }))
}

export interface StationRow {
  stationId: string
  name: string
  count: number
  sum: number
}

export async function apiAnalyticsStations(filter: Filter): Promise<StationRow[]> {
  const rows = await unwrap<{ stationId: string; name: string; count: string | number; sum: string | number }[]>(
    http.get('/admin/analytics/stations', { params: baseParams(filter) }),
  )
  return rows.map((r) => ({ stationId: r.stationId, name: r.name, count: Number(r.count), sum: Number(r.sum) }))
}

export interface CashierRow {
  cashierId: string
  firstName: string
  count: number
  sum: number
}

export async function apiAnalyticsCashiers(filter: Filter): Promise<CashierRow[]> {
  const rows = await unwrap<{ cashierId: string; firstName: string; count: string | number; sum: string | number }[]>(
    http.get('/admin/analytics/cashiers', { params: baseParams(filter) }),
  )
  return rows.map((r) => ({ cashierId: r.cashierId, firstName: r.firstName, count: Number(r.count), sum: Number(r.sum) }))
}

export interface HourRow {
  hour: number
  count: number
  sum: number
}

export async function apiAnalyticsHours(filter: Filter): Promise<HourRow[]> {
  const rows = await unwrap<{ hour: number; count: string | number; sum: string | number }[]>(
    http.get('/admin/analytics/hours', { params: baseParams(filter) }),
  )
  return rows.map((r) => ({ hour: r.hour, count: Number(r.count), sum: Number(r.sum) }))
}
