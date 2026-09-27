import { type ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/shared/config/authStore'

const IDLE_LIMIT_MS = 30 * 60 * 1000

export function AuthGuard({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const lastActiveAt = useAuthStore((s) => s.lastActiveAt)
  const touch = useAuthStore((s) => s.touch)
  const location = useLocation()

  useEffect(() => {
    const handler = () => touch()
    window.addEventListener('mousedown', handler)
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [touch])

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const idle = Date.now() - lastActiveAt > IDLE_LIMIT_MS
  if (idle) {
    return <Navigate to="/login" replace state={{ from: location, idle: true }} />
  }

  return children
}
