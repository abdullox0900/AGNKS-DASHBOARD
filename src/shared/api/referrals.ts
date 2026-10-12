import { http } from './http'
import type { Filter } from './client'

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  return (await promise).data.data
}

export interface Attendant {
  id: string
  name: string
  active: boolean
  stationId: string
  stationName: string
  /** clients who named this attendant, all time */
  clients: number
}

export interface RankingRow {
  id: string
  name: string
  active: boolean
  stationId: string
  stationName: string
  clients: number
  /** how many of those typed the name instead of picking it */
  typed: number
}

export interface ReferralSummary {
  enabled: boolean
  rewardAmount: number
  /** clients who registered in the period */
  newClients: number
  /** of those who answered the question: gave a name */
  answered: number
  skipped: number
  ranking: RankingRow[]
  /** typed names that match nobody on the roster */
  unmatched: { name: string; count: number }[]
}

export interface ReferralSettings {
  enabled: boolean
  rewardAmount: number
  enabledFrom: string | null
}

export const apiAttendants = (): Promise<Attendant[]> => unwrap(http.get('/admin/attendants'))
export const apiCreateAttendant = (dto: { stationId: string; name: string }) => unwrap<{ id: string }>(http.post('/admin/attendants', dto))
export const apiUpdateAttendant = (id: string, dto: { stationId?: string; name?: string; active?: boolean }) => unwrap<{ id: string }>(http.patch(`/admin/attendants/${id}`, dto))
export const apiRemoveAttendant = (id: string) => unwrap<{ id: string; deactivated: boolean }>(http.delete(`/admin/attendants/${id}`))

export const apiReferralSummary = (f: Filter): Promise<ReferralSummary> =>
  unwrap(http.get('/admin/referrals/summary', { params: { from: f.from.toISOString(), to: f.to.toISOString(), stationIds: f.stationIds && f.stationIds.length ? f.stationIds : undefined } }))

export const apiReferralSettings = (): Promise<ReferralSettings> => unwrap(http.get('/admin/referrals/settings'))
export const apiSaveReferralSettings = (dto: { enabled?: boolean; rewardAmount?: number }): Promise<ReferralSettings> => unwrap(http.put('/admin/referrals/settings', dto))
