export interface Station {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  radiusM: number
  status: 'active' | 'paused' | 'closed'
}

export interface Terminal {
  id: string
  stationId: string
  code: string
  label: string
  active: boolean
}

export type StaffStatus = 'active' | 'blocked'

export interface Cashier {
  id: string
  firstName: string
  phone: string
  stationId: string | null
  stationName: string | null
  terminalIds: string[]
  status: StaffStatus
  /** current login password — only for accounts that have a stored copy */
  password: string | null
}

/** The backend dropped cash-shift reconciliation entirely (TZ change) — a shift is now
 * just login/logout bookkeeping for grouping a cashier's spend operations, not a thing
 * to declare/flag/close by hand. */
export type ShiftStatus = 'open' | 'closed'

export interface Shift {
  id: string
  stationId: string
  cashierId: string
  cashierName: string
  openedAt: string
  closedAt: string | null
  operationsCount: number
  status: ShiftStatus
}

export type ReceiptStatus = 'applied' | 'pending_review' | 'rejected'

export interface ReceiptRecord {
  id: string
  cardId: string
  clientName: string
  clientPhone: string | null
  stationId: string
  stationName: string
  terminalId: string
  amount: number
  bonus: number
  rateBps: number
  taxAmount: number | null
  taxVerified: boolean
  status: ReceiptStatus
  reviewReasons: string[]
  receiptAt: string
  reviewedBy: string | null
  reviewNote: string | null
  soliqLink?: string
  /** when the client scanned it */
  createdAt?: string
  /** receipt number from the QR (`r`) */
  checkNumber?: string
  /** fiscal module id from the QR (`t`) — the terminal code */
  terminalCode?: string
  clientBalance?: number
}

export type SpendStatus = 'applied' | 'reversed'

export interface SpendRecord {
  id: string
  amount: number
  status: SpendStatus
  createdAt: string
}

export type DisputeRefType = 'receipt' | 'spend'
export type DisputeStatus = 'open' | 'upheld' | 'reversed' | 'adjusted'

export interface DisputeRecord {
  id: string
  cardId: string
  clientName: string
  refType: DisputeRefType
  refId: string
  claimedAmount: number | null
  actualAmount: number
  comment: string | null
  cashierName: string | null
  stationName: string
  status: DisputeStatus
  resolutionNote: string | null
  createdAt: string
}

export type PromotionStatus = 'scheduled' | 'active' | 'ended' | 'cancelled'

export interface Promotion {
  id: string
  name: string
  rateBps: number
  stationIds: string[] | null
  startsAt: string
  endsAt: string
  reason: string
  status: PromotionStatus
  createdBy: string
  createdAt: string
}

export type BroadcastStatus = 'scheduled' | 'sending' | 'sent' | 'cancelled'

export interface Broadcast {
  id: string
  textUz: string
  textRu: string | null
  sendAt: string
  status: BroadcastStatus
  /** set when auto-created for a promotion */
  promotionId: string | null
  /** clients who get the Telegram push (promo toggle on) */
  recipientCount: number
  delivered: number
  failed: number
  createdAt: string
  sentAt: string | null
  cancelledAt: string | null
}

export interface ClientRecord {
  id: string
  cardId: string
  name: string
  phone: string
  balance: number
  pendingAmount: number
  blocked: boolean
  createdAt: string
}

export interface AuditEntry {
  id: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
  createdAt: string
}
