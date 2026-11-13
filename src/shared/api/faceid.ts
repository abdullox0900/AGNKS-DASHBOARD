import { http } from './http'

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  return (await promise).data.data
}

/** What AGNKS's backend returns from TimeFace (it already speaks the dashboard's vocabulary). */
export interface ApiBranch {
  id: string
  name: string
  online: boolean
  lastSeenMin: number | null
}
export interface ApiEmployee {
  id: string
  name: string
  position: string
  branchId: string
  shift: 'day' | 'night'
  /** absolute URL of the face photo, when TimeFace gives one */
  photo?: string | null
}
export type ApiStatus = 'came' | 'late' | 'absent' | 'off' | 'pending'
export interface ApiRecord {
  employeeId: string
  date: string
  status: ApiStatus
  in?: string
  out?: string
  late?: number
  early?: number
  worked?: number
  now?: boolean
  blind?: boolean
  /** terminal camera snapshots of the first scan-in / last scan-out */
  inPhoto?: string
  outPhoto?: string
}
export interface ApiNote {
  reason: string | null
  note: string | null
}
export interface ApiDay {
  date: string
  records: ApiRecord[]
  /** key: `${employeeId}|${date}` */
  notes: Record<string, ApiNote>
}
export interface ApiRange {
  from: string
  to: string
  records: ApiRecord[]
  notes: Record<string, ApiNote>
}
export interface ApiEvent {
  id: string
  employeeId: string
  kind: 'in' | 'out'
  time: string
  branchId: string
  /** terminal camera snapshot of this pass */
  photo?: string | null
}

export const apiFaceStatus = () => unwrap<{ configured: boolean }>(http.get('/admin/faceid/status'))
export const apiFaceBranches = () => unwrap<ApiBranch[]>(http.get('/admin/faceid/branches'))
export const apiFaceEmployees = () => unwrap<ApiEmployee[]>(http.get('/admin/faceid/employees'))
export const apiFaceDay = (date: string) => unwrap<ApiDay>(http.get('/admin/faceid/day', { params: { date } }))
export const apiFaceRange = (from: string, to: string) => unwrap<ApiRange>(http.get('/admin/faceid/range', { params: { from, to } }))
export const apiFaceEvents = (date: string) => unwrap<ApiEvent[]>(http.get('/admin/faceid/events', { params: { date } }))
export const apiFaceSaveNote = (body: { employeeId: string; date: string; reason: string | null; note: string | null }) =>
  unwrap<ApiNote>(http.put('/admin/faceid/notes', body))
