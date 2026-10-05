import { http } from './http'
import type { Filter } from './client'

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  return (await promise).data.data
}

function params(filter: Filter, extra: Record<string, string | number | undefined> = {}) {
  return { from: filter.from.toISOString(), to: filter.to.toISOString(), stationIds: filter.stationIds ?? undefined, ...extra }
}

export interface StationBonus {
  stationId: string
  name: string
  receiptsCount: number
  receiptsSum: number
  earned: number
  pending: number
  redeemed: number
  redeemCount: number
}
export interface BonusTotals {
  receiptsCount: number
  receiptsSum: number
  earned: number
  pending: number
  redeemed: number
  redeemCount: number
  /** manual SEO balance adjustments in the period (only for "all stations") */
  adjusted?: number
}
export interface ClientBonus {
  userId: string
  name: string
  phone: string | null
  earned: number
  redeemed: number
  receiptsCount: number
  redeemCount: number
  balance: number
}
export interface BonusOperation {
  type: 'earn' | 'spend'
  id: string
  at: string
  stationId: string
  stationName: string
  clientName: string
  clientPhone: string | null
  cashierName: string | null
  baseAmount: number
  amount: number
  status: string
}
export interface Page<T> {
  items: T[]
  total: number
}

export const apiBonusSummary = (f: Filter) =>
  unwrap<{ stations: StationBonus[]; totals: BonusTotals }>(http.get('/admin/bonus-report/summary', { params: params(f) }))

export const apiBonusClients = (f: Filter, o: { q?: string; limit: number; offset: number }) =>
  unwrap<Page<ClientBonus>>(http.get('/admin/bonus-report/clients', { params: params(f, o) }))

export const apiBonusOperations = (f: Filter, o: { type?: 'earn' | 'spend'; q?: string; limit: number; offset: number }) =>
  unwrap<Page<BonusOperation>>(http.get('/admin/bonus-report/operations', { params: params(f, o) }))

/** Downloads the Excel workbook for the current period / stations. */
export async function apiDownloadBonusReport(f: Filter): Promise<void> {
  const res = await http.get('/admin/bonus-report/export', { params: params(f), responseType: 'blob' })
  const day = (d: Date) => d.toLocaleDateString('sv-SE')
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bonus-hisobot_${day(f.from)}_${day(f.to)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
