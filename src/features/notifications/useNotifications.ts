import { useMemo } from 'react'
import useSWR from 'swr'
import { apiGetFeedback, apiGetLargeReceipts } from '@/shared/api/client'
import { useReviewQueue } from '@/shared/api/hooks'
import { usePermission } from '@/shared/lib/permissions'
import { useI18n } from '@/app/providers/I18nProvider'
import { apiFaceDay, apiFaceStatus } from '@/shared/api/faceid'
import { faceBaseFetcher } from '@/features/faceid/useFaceData'
import type { FeedbackKind } from '@/shared/api/client'

export type NotificationKind = 'review' | 'support' | 'large' | 'faceid'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  /** the person / main line */
  title: string
  /** station, preview, amount… */
  detail: string
  /** ISO time the thing happened (for "today, 14:08") */
  at: string
  href: string
  /** support threads only */
  feedbackKind?: FeedbackKind
  amount?: number
  /** FaceID: the terminal's shot of that arrival */
  photo?: string
}

export interface NotificationGroup {
  kind: NotificationKind
  href: string
  /** how many in total (the list may be shortened) */
  count: number
  items: NotificationItem[]
}

/**
 * Everything that waits for a person, in one place: receipts to review, clients waiting for an answer, big receipts
 * to acknowledge. Each source is read only if the signed-in role may see that page; the bell and the full-screen
 * page both use this, so they always agree.
 */
export function useNotifications(): { groups: NotificationGroup[]; total: number; isLoading: boolean } {
  const canReview = usePermission('review.view')
  const canSupport = usePermission('disputes.view')
  const canLarge = usePermission('largeReceipts.view')
  const canFace = usePermission('faceid.view')
  const { t } = useI18n()

  const { data: queue, isLoading: l1 } = useReviewQueue()
  const { data: threads, isLoading: l2 } = useSWR(canSupport ? '/admin/feedback?open-waiting' : null, () => apiGetFeedback('open'), { refreshInterval: 30_000, revalidateOnFocus: true })
  const { data: large, isLoading: l3 } = useSWR(canLarge ? '/admin/receipts/large' : null, apiGetLargeReceipts, { refreshInterval: 60_000 })
  // FaceID: who came late today (only when this server is connected to TimeFace)
  const faceToday = new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10)
  const { data: faceStatus } = useSWR(canFace ? 'faceid:status' : null, apiFaceStatus, { revalidateOnFocus: false, shouldRetryOnError: false })
  const faceLive = faceStatus?.configured === true
  const { data: faceBase } = useSWR(faceLive ? 'faceid:base' : null, faceBaseFetcher, { revalidateOnFocus: false, shouldRetryOnError: false, refreshInterval: 120_000 })
  const { data: faceDay } = useSWR(faceLive ? ['faceid:day', faceToday] : null, () => apiFaceDay(faceToday), { revalidateOnFocus: false, shouldRetryOnError: false, refreshInterval: 60_000 })

  const groups = useMemo(() => {
    const out: NotificationGroup[] = []
    if (canReview && queue && queue.length > 0) {
      out.push({
        kind: 'review',
        href: '/review',
        count: queue.length,
        items: queue.map((r) => ({
          id: r.id,
          kind: 'review' as const,
          title: r.clientName || '—',
          detail: [r.stationName, r.checkNumber ? `№${r.checkNumber}` : null].filter(Boolean).join(' · '),
          at: r.createdAt ?? r.receiptAt,
          href: '/review',
        })),
      })
    }
    if (canSupport && threads) {
      // a thread is waiting for us when the client wrote last
      const waiting = threads.filter((f) => f.lastSender === 'client')
      if (waiting.length > 0) {
        out.push({
          kind: 'support',
          href: '/disputes',
          count: waiting.length,
          items: waiting.map((f) => ({
            id: f.id,
            kind: 'support' as const,
            title: f.clientName || '—',
            detail: f.preview,
            at: f.lastActivityAt,
            href: '/disputes',
            feedbackKind: f.kind,
          })),
        })
      }
    }
    if (canLarge && large && large.items.length > 0) {
      out.push({
        kind: 'large',
        href: '/large-receipts',
        count: large.items.length,
        items: large.items.map((r) => ({
          id: r.id,
          kind: 'large' as const,
          title: r.clientName || '—',
          detail: r.stationName,
          at: r.createdAt,
          href: '/large-receipts',
          amount: r.amount,
        })),
      })
    }
    if (faceDay && faceBase) {
      const emp = new Map(faceBase.e.map((e) => [e.id, e]))
      const branch = new Map(faceBase.b.map((b) => [b.id, b.name.split(' — ').pop() ?? b.name]))
      const lates = faceDay.records.filter((r) => r.status === 'late' && emp.has(r.employeeId)).sort((a, b) => (a.in ?? '').localeCompare(b.in ?? ''))
      if (lates.length > 0) {
        out.push({
          kind: 'faceid',
          href: '/faceid',
          count: lates.length,
          items: lates.map((r) => {
            const e = emp.get(r.employeeId)!
            return {
              id: `face-${r.employeeId}`,
              kind: 'faceid' as const,
              title: e.name,
              detail: [branch.get(e.branchId), r.in ? `${r.in}${r.late ? ` · ${t('fid.late_by', { n: r.late })}` : ''}` : null].filter(Boolean).join(' · '),
              at: `${faceDay.date}T${r.in ?? '00:00'}:00+05:00`,
              href: `/faceid/employees/${r.employeeId}`,
              photo: r.inPhoto ?? e.photo ?? undefined,
            }
          }),
        })
      }
    }
    return out
  }, [canReview, canSupport, canLarge, queue, threads, large, faceDay, faceBase, t])

  return { groups, total: groups.reduce((n, g) => n + g.count, 0), isLoading: l1 || l2 || l3 }
}
