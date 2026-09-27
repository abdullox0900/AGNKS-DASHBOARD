import type { DashboardRole } from '@/entities/auth'
import { useAuthStore } from '@/shared/config/authStore'

export type Permission =
  | 'overview.view'
  | 'analytics.view'
  | 'analytics.stations'
  | 'review.decide'
  | 'disputes.decide'
  | 'cashiers.manage'
  | 'stations.manage'
  | 'stations.delete'
  | 'bonus.view'
  | 'bonus.edit'
  | 'clients.view'
  | 'clients.edit'
  | 'settings.edit'
  | 'audit.view'
  | 'admins.manage'
  | 'admins.edit'
  | 'broadcasts.manage'

const ROLE_PERMISSIONS: Record<DashboardRole, Permission[]> = {
  branch_manager: [
    'overview.view',
    'analytics.view',
    'review.decide',
    'disputes.decide',
    'cashiers.manage',
    'bonus.view',
    'clients.view',
  ],
  root_admin: [
    'overview.view',
    'analytics.view',
    'analytics.stations',
    'review.decide',
    'disputes.decide',
    'cashiers.manage',
    'stations.manage',
    'bonus.view',
    'bonus.edit',
    'clients.view',
    'settings.edit',
    'audit.view',
    'admins.manage',
    'broadcasts.manage',
  ],
  // Destructive/ownership actions (editing or deleting another admin account, a station,
  // or a client's profile) are SEO-only by explicit product decision — root_admin can
  // still see everything but not edit/delete these.
  seo: [
    'overview.view',
    'analytics.view',
    'analytics.stations',
    'review.decide',
    'disputes.decide',
    'cashiers.manage',
    'stations.manage',
    'stations.delete',
    'bonus.view',
    'bonus.edit',
    'clients.view',
    'clients.edit',
    'settings.edit',
    'audit.view',
    'admins.manage',
    'admins.edit',
    'broadcasts.manage',
  ],
}

export function roleHasPermission(role: DashboardRole | null, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role].includes(permission)
}

/** UI-only gate — the backend re-checks every permission independently (TZ-3 §10). */
export function usePermission(permission: Permission): boolean {
  const role = useAuthStore((s) => s.role)
  return roleHasPermission(role, permission)
}

export function useIsNetworkWide(): boolean {
  const role = useAuthStore((s) => s.role)
  return role === 'root_admin' || role === 'seo'
}
