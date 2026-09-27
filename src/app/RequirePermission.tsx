import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePermission, type Permission } from '@/shared/lib/permissions'

/** Blocks direct URL access to routes a role's sidebar already hides (e.g. branch_manager → /stations). */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const allowed = usePermission(permission)
  if (!allowed) return <Navigate to="/" replace />
  return children
}
