import useSWR from 'swr'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from '@/shared/config/authStore'
import { apiChangelogList } from '@/shared/api/changelog'

/** The newest post each person has already looked at (by user id), kept in this browser. */
interface SeenState {
  seen: Record<string, string>
  markSeen: (userId: string, newestCreatedAt: string) => void
}

export const useChangelogSeen = create<SeenState>()(
  persist(
    (set) => ({
      seen: {},
      markSeen: (userId, newestCreatedAt) => set((s) => (s.seen[userId] === newestCreatedAt ? s : { seen: { ...s.seen, [userId]: newestCreatedAt } })),
    }),
    { name: 'agnks-changelog-seen' },
  ),
)

/** The first page of posts, shared by the sidebar badge and the page (one request, refreshed every few minutes). */
export function useChangelogFirstPage() {
  return useSWR('/admin/changelog', () => apiChangelogList(), { refreshInterval: 5 * 60_000, revalidateOnFocus: true })
}

/** How many posts are newer than the last one this person opened the page on. */
export function useChangelogUnread(): number {
  const userId = useAuthStore((s) => s.userId)
  const lastSeen = useChangelogSeen((s) => (userId ? s.seen[userId] : undefined))
  const { data } = useChangelogFirstPage()
  if (!data) return 0
  return data.items.filter((p) => !lastSeen || p.createdAt > lastSeen).length
}
