import useSWR from 'swr'
import {
  apiGetActivePromotions,
  apiGetAlerts,
  apiGetOverview,
  apiGetStations,
  apiGetTerminals,
  apiGetCashiers,
  apiGetShifts,
  apiGetDisputes,
  apiGetPromotions,
  apiGetBonusSettings,
  apiGetReviewQueue,
  apiGetAdmins,
  apiSearchClients,
  apiGetFeedback,
  type Filter,
 apiGetBroadcasts } from './client'

function filterKey(prefix: string, filters: Filter) {
  return [prefix, filters.stationIds?.join(',') ?? 'all', filters.from.toISOString(), filters.to.toISOString()]
}

export function useStations() {
  return useSWR('/admin/stations', apiGetStations, { revalidateIfStale: false })
}

export function useTerminals(stationId: string | null) {
  return useSWR(stationId ? ['/admin/terminals', stationId] : null, () => apiGetTerminals(stationId!))
}

export function useOverview(filters: Filter) {
  return useSWR(filterKey('/admin/overview', filters), () => apiGetOverview(filters), {
    refreshInterval: 60_000,
    keepPreviousData: true,
  })
}

export function useAlerts(filters: Filter) {
  return useSWR(filterKey('/admin/alerts', filters), () => apiGetAlerts(filters), {
    refreshInterval: 60_000,
    keepPreviousData: true,
  })
}

export function useActivePromotions(filters: Filter) {
  return useSWR(filterKey('/admin/promotions/active', filters), () => apiGetActivePromotions(filters), { keepPreviousData: true })
}

export function useCashiers(stationId?: string) {
  return useSWR(['/admin/staff', stationId ?? 'all'], () => apiGetCashiers(stationId))
}

export function useShifts(filter: { stationId?: string; status?: string }) {
  return useSWR(['/admin/shifts', filter.stationId ?? 'all', filter.status ?? 'all'], () => apiGetShifts(filter))
}

export function useDisputes(status?: string) {
  return useSWR(['/admin/disputes', status ?? 'all'], () => apiGetDisputes(status), { refreshInterval: 30_000 })
}

export function usePromotions(status?: string) {
  return useSWR(['/admin/promotions', status ?? 'all'], () => apiGetPromotions(status))
}

export function useBonusSettings() {
  return useSWR('/admin/bonus/settings', apiGetBonusSettings)
}

export function useReviewQueue() {
  return useSWR('/admin/review', apiGetReviewQueue, { refreshInterval: 30_000 })
}

export function useBroadcasts() {
  // refresh while something is queued so status/delivery counts move on their own
  return useSWR('/admin/broadcasts', apiGetBroadcasts, { refreshInterval: 15_000 })
}

export function useAdmins() {
  return useSWR('/admin/admins', apiGetAdmins)
}

export function useClients(q?: string) {
  return useSWR(['/admin/clients', q ?? ''], () => apiSearchClients(q))
}

export function useFeedback(status?: string) {
  return useSWR(['/admin/feedback', status ?? 'all'], () => apiGetFeedback(status), { refreshInterval: 30_000 })
}
