import { http } from './http'

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  return (await promise).data.data
}

/** vol — m³ (shown floored, like the uGaz app), sum — so'm, ops — cars filled */
export interface UgazNums {
  vol: number
  sum: number
  ops: number
}
export type UgazPeriod = 'day' | 'month' | 'year'

export interface UgazSummaryRow extends Record<UgazPeriod, UgazNums> {
  row: number
  name: string
  /** false = no account / no data for this station (numbers are 0, the reason is in `warnings`) */
  has: boolean
}
export interface UgazSummary {
  date: string
  rows: UgazSummaryRow[]
  total: Record<UgazPeriod, UgazNums>
  warnings: string[]
}

export interface UgazDispenser extends UgazNums {
  number: string
}
export interface UgazStatsRow extends UgazNums {
  row: number
  name: string
  has: boolean
  /** uGaz branches behind this report row (one row can be two branches) */
  stations: (UgazNums & { id: number; name: string; dispensers?: UgazDispenser[] })[]
}
export interface UgazStats {
  period: UgazPeriod
  date: string
  final: boolean
  rows: UgazStatsRow[]
  total: UgazNums
  warnings: string[]
}

export type UgazDay = UgazNums & { date: string }
export interface UgazDaily {
  from: string
  to: string
  rows: { row: number; name: string; has: boolean; days: UgazDay[] }[]
  total: UgazDay[]
  warnings: string[]
}

export const apiUgazStatus = () => unwrap<{ configured: boolean }>(http.get('/admin/ugaz/status'))
export const apiUgazSummary = (date: string) => unwrap<UgazSummary>(http.get('/admin/ugaz/summary', { params: { date } }))
export const apiUgazStats = (period: UgazPeriod, date: string, dispensers: boolean) =>
  unwrap<UgazStats>(http.get('/admin/ugaz/stats', { params: { period, date, dispensers: dispensers ? 1 : 0 } }))
export const apiUgazDaily = (from: string, to: string) => unwrap<UgazDaily>(http.get('/admin/ugaz/daily', { params: { from, to } }))
