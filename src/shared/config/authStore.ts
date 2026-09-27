import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DashboardRole } from '@/entities/auth'

interface AuthState {
  userId: string | null
  firstName: string | null
  phone: string | null
  role: DashboardRole | null
  stationId: string | null
  stationName: string | null
  accessToken: string | null
  lastActiveAt: number
  setSession: (session: {
    userId: string
    firstName: string
    phone: string
    role: DashboardRole
    stationId: string | null
    stationName: string | null
    accessToken: string
  }) => void
  setAccessToken: (accessToken: string) => void
  touch: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      firstName: null,
      phone: null,
      role: null,
      stationId: null,
      stationName: null,
      accessToken: null,
      lastActiveAt: Date.now(),
      setSession: (session) => set({ ...session, lastActiveAt: Date.now() }),
      setAccessToken: (accessToken) => set({ accessToken }),
      touch: () => set({ lastActiveAt: Date.now() }),
      logout: () =>
        set({
          userId: null,
          firstName: null,
          phone: null,
          role: null,
          stationId: null,
          stationName: null,
          accessToken: null,
        }),
    }),
    { name: 'agnks-dashboard-auth' },
  ),
)
