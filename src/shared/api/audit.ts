import { http } from './http'

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  return (await promise).data.data
}

export type AuditGroup = 'review' | 'clients' | 'staff' | 'stations' | 'rules' | 'messages' | 'security'

export interface AuditChange {
  field: string
  from: string | null
  to: string | null
}

export interface AuditEntry {
  id: string
  at: string
  action: string
  entityType: string
  entityId: string
  /** readable name of what the entry is about (station, client…), when it could be resolved */
  target: string | null
  actorId: string | null
  actorName: string | null
  actorPhone: string | null
  actorRole: string | null
  changes: AuditChange[]
}

export interface AuditPage {
  items: AuditEntry[]
  nextCursor: string | null
}

export interface AuditActor {
  id: string
  name: string
  phone: string | null
  count: number
}

export const apiAuditList = (p: { actor?: string; group?: AuditGroup; cursor?: string }): Promise<AuditPage> =>
  unwrap(http.get('/admin/audit', { params: { ...p, limit: 30 } }))

export const apiAuditActors = (): Promise<AuditActor[]> => unwrap(http.get('/admin/audit/actors'))

export interface ReviewedReceipt {
  id: string
  status: 'applied' | 'rejected'
  clientName: string
  clientPhone: string | null
  stationName: string
  terminalCode: string
  receiptAt: string
  amount: number
  bonus: number
  reviewNote: string | null
  reviewedAt: string
  reviewerId: string
  reviewerName: string | null
  reviewerPhone: string | null
  soliqLink: string | null
}

export const apiReviewHistory = (cursor?: string): Promise<{ items: ReviewedReceipt[]; nextCursor: string | null }> =>
  unwrap(http.get('/admin/review/history/list', { params: { cursor } }))
