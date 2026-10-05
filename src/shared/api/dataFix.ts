import { http } from './http'
import type { Filter } from './client'

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  return (await promise).data.data
}

export type RecordKind = 'receipt' | 'spend' | 'adjust'
export interface RecordRef {
  kind: RecordKind
  id: string
}
export interface DataRecord extends RecordRef {
  at: string
  stationName: string | null
  clientName: string
  clientPhone: string | null
  baseAmount: number
  /** signed effect on the client's balance */
  bonus: number
  status: string
}
export interface ClientEffect {
  userId: string
  name: string
  phone: string | null
  balanceBefore: number
  balanceAfter: number
}
export interface Preview {
  found: number
  missing: number
  byKind: Record<RecordKind, number>
  clients: ClientEffect[]
  negative: ClientEffect[]
}

export const apiDataRecords = (f: Filter, o: { kind?: RecordKind; q?: string; limit: number; offset: number }) =>
  unwrap<{ items: DataRecord[]; total: number }>(
    http.get('/admin/data-fix/records', { params: { from: f.from.toISOString(), to: f.to.toISOString(), stationIds: f.stationIds ?? undefined, ...o } }),
  )

export const apiDataPreview = (items: RecordRef[]) => unwrap<Preview>(http.post('/admin/data-fix/preview', { items }))

export const apiDataDelete = (items: RecordRef[], password: string, note: string) =>
  unwrap<{ deleted: number; byKind: Record<RecordKind, number>; clients: ClientEffect[] }>(http.post('/admin/data-fix/delete', { items, password, note }))
