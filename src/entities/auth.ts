export type DashboardRole = 'branch_manager' | 'root_admin' | 'seo'

export interface DashboardUser {
  id: string
  firstName: string
  phone: string
  role: DashboardRole
  stationId: string | null
  stationName: string | null
}
