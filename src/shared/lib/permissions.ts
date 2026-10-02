import type { DashboardRole } from '@/entities/auth'
import { useAuthStore } from '@/shared/config/authStore'

export type Permission =
  | 'overview.view'
  | 'analytics.view'
  | 'analytics.stations'
  | 'review.view'
  | 'review.decide'
  | 'disputes.view'
  | 'disputes.decide'
  | 'cashiers.view'
  | 'cashiers.manage'
  | 'stations.view'
  | 'stations.manage'
  | 'stations.delete'
  | 'largeReceipts.view'
  | 'largeReceipts.ack'
  | 'bonus.view'
  | 'bonus.edit'
  | 'clients.view'
  | 'clients.detail'
  | 'clients.edit'
  | 'settings.edit'
  | 'audit.view'
  | 'admins.manage'
  | 'admins.edit'
  | 'broadcasts.view'
  | 'broadcasts.manage'

const ROLE_PERMISSIONS: Record<DashboardRole, Permission[]> = {
  branch_manager: [
    'overview.view',
    'analytics.view',
    'review.view',
    'review.decide',
    'disputes.view',
    'disputes.decide',
    'cashiers.view',
    'cashiers.manage',
    'bonus.view',
    'clients.view',
    'clients.detail',
  ],
  // View-only by product decision: sees everything below, changes nothing, and has no Admins section.
  // (The backend enforces this too: any non-GET request from root_admin is refused.)
  root_admin: [
    'overview.view',
    'analytics.view',
    'analytics.stations',
    'review.view',
    'disputes.view',
    'cashiers.view',
    'stations.view',
    'largeReceipts.view',
    'bonus.view',
    'clients.view',
    'audit.view',
    'broadcasts.view',
  ],
  // The only role that changes things network-wide (stations, admins, clients, bonus, broadcasts...).
  seo: [
    'overview.view',
    'analytics.view',
    'analytics.stations',
    'review.view',
    'review.decide',
    'disputes.view',
    'disputes.decide',
    'cashiers.view',
    'cashiers.manage',
    'stations.view',
    'stations.manage',
    'stations.delete',
    'largeReceipts.view',
    'largeReceipts.ack',
    'bonus.view',
    'bonus.edit',
    'clients.view',
    'clients.detail',
    'clients.edit',
    'settings.edit',
    'audit.view',
    'admins.manage',
    'admins.edit',
    'broadcasts.view',
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
