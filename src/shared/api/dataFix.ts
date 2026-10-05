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

// ---- the page password: a short-lived unlock token kept for this browser tab only ----

const TOKEN_KEY = 'agnks-datafix-unlock'
interface Unlock {
  token: string
  expiresAt: string
}

export function getUnlock(): Unlock | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY)
    const u = raw ? (JSON.parse(raw) as Unlock) : null
    if (u && new Date(u.expiresAt).getTime() > Date.now()) return u
  } catch {
    /* no storage */
  }
  return null
}
function saveUnlock(u: Unlock): Unlock {
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(u))
  } catch {
    /* no storage */
  }
  return u
}
export function lockDataFix() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* no storage */
  }
}
const auth = () => ({ headers: { 'X-DataFix-Token': getUnlock()?.token ?? '' } })

export const apiGateStatus = () => unwrap<{ configured: boolean }>(http.get('/admin/data-fix/gate'))
export const apiGateSetup = (password: string, loginPassword: string) =>
  unwrap<Unlock>(http.post('/admin/data-fix/gate/setup', { password, loginPassword })).then(saveUnlock)
export const apiGateUnlock = (password: string) => unwrap<Unlock>(http.post('/admin/data-fix/gate/unlock', { password })).then(saveUnlock)
export const apiGateChange = (current: string, next: string) => unwrap<Unlock>(http.post('/admin/data-fix/gate/change', { current, next })).then(saveUnlock)

export const apiDataRecords = (f: Filter, o: { kind?: RecordKind; q?: string; limit: number; offset: number }) =>
  unwrap<{ items: DataRecord[]; total: number }>(
    http.get('/admin/data-fix/records', { params: { from: f.from.toISOString(), to: f.to.toISOString(), stationIds: f.stationIds ?? undefined, ...o }, ...auth() }),
  )

export const apiDataPreview = (items: RecordRef[]) => unwrap<Preview>(http.post('/admin/data-fix/preview', { items }, auth()))

export const apiDataDelete = (items: RecordRef[], password: string, note: string) =>
  unwrap<{ deleted: number; byKind: Record<RecordKind, number>; clients: ClientEffect[] }>(http.post('/admin/data-fix/delete', { items, password, note }, auth()))
