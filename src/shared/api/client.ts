import type { Broadcast, Cashier, ClientRecord, DisputeRecord, Promotion, ReceiptRecord, Shift, Station, Terminal } from '@/entities/models'
import type { DashboardRole, DashboardUser } from '@/entities/auth'
import { http } from './http'

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const res = await promise
  return res.data.data
}

// ---------- Auth ----------

/** No 2FA — phone+password logs in directly. */
export async function apiLogin(phone: string, password: string): Promise<{ accessToken: string; user: DashboardUser }> {
  const { accessToken } = await unwrap<{ accessToken: string }>(http.post('/admin/auth/login', { phone, password }))
  const user = await apiMeWithToken(accessToken)
  return { accessToken, user }
}

// The auth store hasn't been updated with the fresh token yet at this point in the login
// flow, so the request interceptor (which reads the store) would send no/stale Authorization
// header — pass it explicitly for this one call.
async function apiMeWithToken(accessToken: string): Promise<DashboardUser> {
  const res = await http.get<{ data: DashboardUser }>('/admin/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.data.data
}

export async function apiChangePassword(_phone: string, currentPassword: string, newPassword: string): Promise<void> {
  await http.post('/admin/auth/change-password', { currentPassword, newPassword })
}

export async function apiLogout(): Promise<void> {
  await http.post('/admin/auth/logout')
}

// ---------- Overview & alerts ----------

export interface Filter {
  stationIds: string[] | null // null = "hammasi"
  from: Date
  to: Date
}

function stationParams(stationIds: string[] | null) {
  return stationIds && stationIds.length > 0 ? stationIds : undefined
}

export interface OverviewData {
  receipts: { count: number; sum: number }
  bonus: { issued: number }
  spend: { count: number; sum: number }
  activeClients: number
  attention: { pendingReview: number; openDisputes: number }
}

export async function apiGetOverview(filter: Filter): Promise<OverviewData> {
  return unwrap(
    http.get('/admin/overview', {
      params: { from: filter.from.toISOString(), to: filter.to.toISOString(), stationIds: stationParams(filter.stationIds) },
    }),
  )
}

export interface AlertItem {
  type: 'review' | 'dispute' | 'large'
  icon: string
  count: number
  /** large-receipt threshold, so'm (type === 'large') */
  threshold?: number
  href: string
}

export async function apiGetAlerts(filter: Filter): Promise<{ items: AlertItem[] }> {
  const raw = await unwrap<{ openDisputes: unknown[]; pendingReview: unknown[] }>(
    http.get('/admin/alerts', { params: { stationIds: stationParams(filter.stationIds) } }),
  )
  const items: AlertItem[] = []
  if (raw.pendingReview.length > 0) {
    items.push({ type: 'review', icon: 'clock', count: raw.pendingReview.length, href: '/review' })
  }
  if (raw.openDisputes.length > 0) {
    items.push({ type: 'dispute', icon: 'x', count: raw.openDisputes.length, href: '/disputes' })
  }
  // root_admin/seo only — other roles get 403 here, which just means no such alert.
  const large = await apiGetLargeReceipts().catch(() => null)
  if (large && large.items.length > 0) {
    items.unshift({
      type: 'large',
      icon: 'alert',
      count: large.items.length,
      threshold: large.threshold,
      href: '/large-receipts',
    })
  }
  return { items }
}

// ---------- Large receipts ----------

export interface LargeReceipt {
  id: string
  amount: number
  bonus: number
  status: string
  receiptAt: string
  createdAt: string
  stationName: string
  clientName: string
  clientPhone: string | null
  /** 'server' = our own soliq.uz lookup, 'client' = fetched on the client's phone */
  taxSource: 'server' | 'client' | null
  companyName: string | null
  tin: string | null
  items: { name: string; quantity: number; unit: string | null; price: number }[]
  soliqUrl: string
}

export async function apiGetLargeReceipts(): Promise<{ threshold: number; items: LargeReceipt[] }> {
  return unwrap(http.get('/admin/receipts/large'))
}

export async function apiAckLargeReceipt(id: string) {
  return unwrap(http.post(`/admin/receipts/${id}/ack-large`))
}

export async function apiGetActivePromotions(filter: Filter): Promise<Promotion[]> {
  const all = await apiGetPromotions('active')
  if (!filter.stationIds) return all
  return all.filter((p) => !p.stationIds || p.stationIds.some((id) => filter.stationIds!.includes(id)))
}

// ---------- Stations & terminals ----------

function toStation(raw: { lat: string | number; lng: string | number; radiusM: number } & Omit<Station, 'lat' | 'lng' | 'radiusM'>): Station {
  return { ...raw, lat: Number(raw.lat), lng: Number(raw.lng), radiusM: Number(raw.radiusM) }
}

export async function apiGetStations(): Promise<Station[]> {
  const rows = await unwrap<Parameters<typeof toStation>[0][]>(http.get('/admin/stations'))
  return rows.map(toStation)
}

export async function apiGetTerminals(stationId: string): Promise<Terminal[]> {
  return unwrap(http.get(`/admin/stations/${stationId}/terminals`))
}

export async function apiCreateStation(input: { name: string; address: string }): Promise<Station> {
  const row = await unwrap<Parameters<typeof toStation>[0]>(http.post('/admin/stations', input))
  return toStation(row)
}

export async function apiUpdateStation(id: string, patch: Partial<Station>): Promise<Station> {
  const row = await unwrap<Parameters<typeof toStation>[0]>(http.patch(`/admin/stations/${id}`, patch))
  return toStation(row)
}

/** Real deletion — backend refuses (VALIDATION_ERROR) if the station already has any
 * receipts/shifts; close it via apiUpdateStation({status:'closed'}) in that case instead. */
export async function apiDeleteStation(id: string) {
  return unwrap(http.delete(`/admin/stations/${id}`))
}

export async function apiCreateTerminal(stationId: string, input: { code: string; label: string }): Promise<Terminal> {
  return unwrap(http.post(`/admin/stations/${stationId}/terminals`, input))
}

/** Real deletion — backend refuses (terminal_has_receipts) once receipts went through it; deactivate instead. */
export async function apiDeleteTerminal(id: string) {
  return unwrap(http.delete(`/admin/terminals/${id}`))
}

export async function apiUpdateTerminal(id: string, patch: Partial<Pick<Terminal, 'code' | 'label' | 'active'>>): Promise<Terminal> {
  return unwrap(http.patch(`/admin/terminals/${id}`, patch))
}

// ---------- Dashboard admins (SEO/root_admin/branch_manager) ----------

export interface AdminAccount {
  id: string
  /** the person behind the role row (one user can hold several roles) */
  userId: string
  firstName: string
  phone: string
  role: DashboardRole
  stationId: string | null
  stationName: string | null
  /** current password — only sent to SEO, and only for accounts that have a stored copy */
  password: string | null
}

interface StaffRow {
  id: string
  userId: string
  role: string
  stationId: string | null
  user: { firstName: string; phone: string | null }
  station: { name: string } | null
  password?: string | null
}

function toAdminAccount(row: StaffRow): AdminAccount {
  return {
    id: row.id,
    userId: row.userId,
    firstName: row.user.firstName,
    phone: row.user.phone ?? '',
    role: row.role as DashboardRole,
    stationId: row.stationId,
    stationName: row.station?.name ?? null,
    password: row.password ?? null,
  }
}

export async function apiGetAdmins(): Promise<AdminAccount[]> {
  const rows = await unwrap<StaffRow[]>(http.get('/admin/staff'))
  return rows.filter((r) => r.role !== 'cashier').map(toAdminAccount)
}

export async function apiCreateAdmin(input: {
  firstName: string
  phone: string
  role: DashboardRole
  stationId: string | null
  password: string
}): Promise<void> {
  await unwrap(
    http.post('/admin/staff', {
      firstName: input.firstName,
      phone: input.phone,
      role: input.role,
      stationId: input.stationId,
      password: input.password,
    }),
  )
}

/** `id` is the staff record's own id (returned by `apiGetAdmins`/`apiGetCashiers`), not the phone. */
export async function apiUpdateAdmin(id: string, patch: { firstName?: string; phone?: string; password?: string; stationId?: string | null }) {
  return unwrap(http.patch(`/admin/staff/${id}`, patch))
}

/** Deleting another dashboard account requires the ACTING seo's own password. */
export async function apiRemoveAdmin(id: string, password: string) {
  return unwrap(http.delete(`/admin/staff/${id}`, { data: { password } }))
}

// ---------- Cashiers ----------

function toCashier(row: StaffRow & { terminalIds?: string[]; user: { firstName: string; phone: string | null; status: string } }): Cashier {
  return {
    id: row.id,
    firstName: row.user.firstName,
    phone: row.user.phone ?? '',
    stationId: row.stationId,
    stationName: row.station?.name ?? null,
    terminalIds: row.terminalIds ?? [],
    status: row.user.status === 'blocked' ? 'blocked' : 'active',
    password: row.password ?? null,
  }
}

export async function apiGetCashiers(stationId?: string): Promise<Cashier[]> {
  const rows = await unwrap<Parameters<typeof toCashier>[0][]>(
    http.get('/admin/staff', { params: { role: 'cashier', stationId } }),
  )
  return rows.map(toCashier)
}

/** `pin` is the cashier's password (any 4+ characters); left empty, the backend generates a 6-digit one. */
export async function apiCreateCashier(input: { firstName: string; phone: string; stationId: string; terminalIds: string[]; pin?: string }) {
  await unwrap(
    http.post('/admin/staff', { firstName: input.firstName, phone: input.phone, role: 'cashier', stationId: input.stationId, terminalIds: input.terminalIds, pin: input.pin || undefined }),
  )
}

export async function apiUpdateCashier(id: string, patch: { firstName?: string; phone?: string; stationId?: string; terminalIds?: string[]; password?: string }) {
  return unwrap(http.patch(`/admin/staff/${id}`, patch))
}

export async function apiRemoveCashier(id: string) {
  return unwrap(http.delete(`/admin/staff/${id}`))
}

// ---------- Shifts ----------

export async function apiGetShifts(filter: { stationId?: string; status?: string }): Promise<Shift[]> {
  return unwrap(http.get('/admin/shifts', { params: filter }))
}

export async function apiGetShiftDetail(id: string) {
  return unwrap<{ shift: Shift; receiptsCount: number; receipts: unknown[]; spends: unknown[] }>(http.get(`/admin/shifts/${id}`))
}

// ---------- Disputes ----------

// Bonus/amount fields are Prisma BigInt columns, serialized to JSON as strings
// (see installBigIntJsonSupport) — normalize to number for display/formatting.
function toNum(v: string | number | null | undefined): number {
  return v == null ? 0 : Number(v)
}

interface RawDispute extends Omit<DisputeRecord, 'claimedAmount' | 'actualAmount'> {
  claimedAmount: string | number | null
  actualAmount: string | number
}

function toDispute(raw: RawDispute): DisputeRecord {
  return { ...raw, claimedAmount: raw.claimedAmount == null ? null : toNum(raw.claimedAmount), actualAmount: toNum(raw.actualAmount) }
}

export async function apiGetDisputes(status?: string): Promise<DisputeRecord[]> {
  const { items } = await unwrap<{ items: RawDispute[]; nextCursor: string | null }>(
    http.get('/admin/disputes', { params: { status } }),
  )
  return items.map(toDispute)
}

export async function apiGetDispute(id: string): Promise<DisputeRecord> {
  const raw = await unwrap<RawDispute>(http.get(`/admin/disputes/${id}`))
  return toDispute(raw)
}

export async function apiResolveDispute(id: string, resolution: 'upheld' | 'reversed' | 'adjusted', note: string, amount?: number) {
  return unwrap(http.post(`/admin/disputes/${id}/resolve`, { resolution, note, amount }))
}

// ---------- Feedback (taklif va shikoyat, umumiy) ----------

export interface FeedbackItem {
  id: string
  cardId: string
  clientName: string
  clientPhone: string | null
  kind: 'suggestion' | 'complaint'
  message: string
  status: 'open' | 'resolved'
  resolutionNote: string | null
  createdAt: string
}

export async function apiGetFeedback(status?: string): Promise<FeedbackItem[]> {
  const { items } = await unwrap<{ items: FeedbackItem[]; nextCursor: string | null }>(
    http.get('/admin/feedback', { params: { status } }),
  )
  return items
}

export async function apiResolveFeedback(id: string, note?: string) {
  return unwrap(http.post(`/admin/feedback/${id}/resolve`, { note }))
}

// ---------- Bonus & promotions ----------

export async function apiGetBonusSettings(): Promise<{ baseRateBps: number; methanePrice: number }> {
  return unwrap(http.get('/admin/bonus/settings'))
}

export async function apiSetBaseRate(rateBps: number, note: string) {
  return unwrap<{ baseRateBps: number }>(http.put('/admin/bonus/base-rate', { rateBps, note }))
}

export async function apiSetMethanePrice(price: number) {
  return unwrap<{ methanePrice: number }>(http.put('/admin/bonus/methane-price', { price }))
}

export async function apiGetPromotions(status?: string): Promise<Promotion[]> {
  return unwrap(http.get('/admin/promotions', { params: { status } }))
}

export async function apiCreatePromotion(input: {
  name: string
  rateBps: number
  stationIds: string[] | null
  startsAt: string
  endsAt: string
  reason: string
  /** announce to clients at this time; null = don't */
  notifyAt: string | null
}) {
  return unwrap<Promotion>(http.post('/admin/promotions', input))
}

// ---------- Client broadcasts ----------

export async function apiGetBroadcasts(): Promise<Broadcast[]> {
  return unwrap(http.get('/admin/broadcasts'))
}

export async function apiCreateBroadcast(input: { textUz: string; textRu: string | null; sendAt: string | null }) {
  return unwrap<Broadcast>(http.post('/admin/broadcasts', input))
}

export async function apiCancelBroadcast(id: string) {
  return unwrap<Broadcast>(http.post(`/admin/broadcasts/${id}/cancel`))
}

export async function apiRemoveBroadcast(id: string) {
  return unwrap<{ id: string }>(http.delete(`/admin/broadcasts/${id}`))
}

export async function apiCancelPromotion(id: string) {
  return unwrap(http.post(`/admin/promotions/${id}/cancel`))
}

export async function apiImpactPreview(rateBps: number, stationIds: string[] | null) {
  return unwrap<{ sampleDays: number; sampleReceiptCount: number; avgDailyReceiptAmount: string; estimatedDailyExtraCost: string }>(
    http.post('/admin/bonus/impact-preview', { rateBps, stationIds }),
  )
}

// ---------- Review queue ----------

interface RawReceipt {
  id: string
  cardId: string
  stationId: string
  terminalId: string
  amount: string | number
  bonus: string | number
  rateBps: number
  taxAmount: string | number | null
  taxVerified: boolean
  status: ReceiptRecord['status']
  reviewReasons: string[]
  receiptAt: string
  reviewedBy: string | null
  reviewNote: string | null
  station: { name: string }
  card?: { cachedBalance?: string | number; user: { firstName: string; phone: string | null } }
  soliqLink?: string
  createdAt?: string
  qrR?: string
  qrT?: string
  terminal?: { code: string }
}

function toReceipt(raw: RawReceipt): ReceiptRecord {
  return {
    id: raw.id,
    cardId: raw.cardId,
    clientName: raw.card?.user.firstName ?? '',
    clientPhone: raw.card?.user.phone ?? null,
    stationId: raw.stationId,
    stationName: raw.station.name,
    terminalId: raw.terminalId,
    amount: toNum(raw.amount),
    bonus: toNum(raw.bonus),
    rateBps: raw.rateBps,
    taxAmount: raw.taxAmount == null ? null : toNum(raw.taxAmount),
    taxVerified: raw.taxVerified,
    status: raw.status,
    reviewReasons: raw.reviewReasons,
    receiptAt: raw.receiptAt,
    reviewedBy: raw.reviewedBy,
    reviewNote: raw.reviewNote,
    soliqLink: raw.soliqLink,
    createdAt: raw.createdAt,
    checkNumber: raw.qrR,
    terminalCode: raw.terminal?.code ?? raw.qrT,
    clientBalance: raw.card?.cachedBalance === undefined ? undefined : toNum(raw.card.cachedBalance),
  }
}

export async function apiGetReviewQueue(): Promise<ReceiptRecord[]> {
  const { items } = await unwrap<{ items: RawReceipt[]; nextCursor: string | null }>(http.get('/admin/review'))
  return items.map(toReceipt)
}

export async function apiGetReviewDetail(id: string): Promise<ReceiptRecord> {
  const raw = await unwrap<RawReceipt>(http.get(`/admin/review/${id}`))
  return toReceipt(raw)
}

export async function apiApproveReceipt(id: string, note?: string, amount?: number) {
  return unwrap(http.post(`/admin/review/${id}/approve`, { note, amount }))
}

export async function apiRejectReceipt(id: string, note: string) {
  return unwrap(http.post(`/admin/review/${id}/reject`, { note }))
}

// ---------- Clients ----------

interface RawClientUser {
  id: string
  firstName: string
  phone: string | null
  createdAt: string
  registeredAt?: string | null
  card: { number: string; cachedBalance: string | number; pendingAmount: string | number; blocked: boolean } | null
}

function toClient(raw: RawClientUser): ClientRecord {
  return {
    id: raw.id,
    cardId: raw.card?.number ?? '',
    name: raw.firstName,
    phone: raw.phone ?? '',
    balance: toNum(raw.card?.cachedBalance),
    pendingAmount: toNum(raw.card?.pendingAmount),
    blocked: raw.card?.blocked ?? false,
    createdAt: raw.registeredAt ?? raw.createdAt,
  }
}

export async function apiSearchClients(q?: string): Promise<ClientRecord[]> {
  const { items } = await unwrap<{ items: RawClientUser[]; nextCursor: string | null }>(
    http.get('/admin/clients', { params: { q } }),
  )
  return items.filter((u) => u.card).map(toClient)
}

export interface ClientProfile {
  user: {
    id: string
    firstName: string
    phone: string | null
    lang: 'uz' | 'ru'
    status: string
    registeredAt: string | null
    createdAt: string
    telegramLinked: boolean
    marketingOptIn: boolean
  }
  card: { number: string; balance: number; pending: number; blocked: boolean; lastActivityAt: string | null; createdAt: string }
  stats: {
    receiptsTotal: number
    receiptsApplied: number
    receiptsPending: number
    receiptsRejected: number
    receiptsSum: number
    bonusEarned: number
    spendCount: number
    spendSum: number
    feedbackCount: number
    disputeCount: number
    firstReceiptAt: string | null
    lastReceiptAt: string | null
  }
}

export type ClientHistoryKind = 'receipt' | 'spend' | 'adjust'

export interface ClientHistoryItem {
  kind: ClientHistoryKind
  id: string
  createdAt: string
  stationName: string | null
  /** receipt total, so'm (0 for spends/adjustments) */
  amount: number
  /** signed bonus movement, so'm */
  bonus: number
  ratePercent: number | null
  status: 'applied' | 'pending_review' | 'rejected' | 'reversed'
  taxVerified: boolean | null
  note: string | null
  actorName: string | null
}

export async function apiGetClientProfile(id: string): Promise<ClientProfile> {
  return unwrap(http.get(`/admin/clients/${id}`))
}

export interface ClientReceiptDetail {
  id: string
  status: 'applied' | 'pending_review' | 'rejected'
  createdAt: string
  receiptAt: string
  client: { id: string; name: string; phone: string | null }
  station: { id: string; name: string; address: string }
  terminal: { code: string; label: string }
  amount: number
  bonus: number
  ratePercent: number
  promotionName: string | null
  taxAmount: number | null
  taxVerified: boolean
  taxCheckedAt: string | null
  taxSource: 'server' | 'client' | null
  reviewReasons: string[]
  reviewNote: string | null
  reviewedAt: string | null
  distanceM: number | null
  qr: { t: string; r: string; c: string; s: string }
  soliqUrl: string
  /** the complete soliq.uz payment record, exactly as soliq.uz returned it */
  taxData: Record<string, unknown> | null
  /** stored = saved when the client scanned; live = fetched from soliq.uz just now */
  taxDataSource: 'stored' | 'live' | null
}

export async function apiGetClientReceipt(clientId: string, receiptId: string): Promise<ClientReceiptDetail> {
  return unwrap(http.get(`/admin/clients/${clientId}/receipts/${receiptId}`))
}

export async function apiGetClientHistory(id: string, params: { cursor?: string; type?: ClientHistoryKind }) {
  return unwrap<{ items: ClientHistoryItem[]; nextCursor: string | null }>(
    http.get(`/admin/clients/${id}/history`, { params: { ...params, limit: 30 } }),
  )
}

export async function apiRenameClient(id: string, firstName: string) {
  return unwrap(http.patch(`/admin/clients/${id}`, { firstName }))
}

export async function apiAdjustClient(id: string, delta: number, note: string) {
  return unwrap<{ balanceAfter: number }>(http.post(`/admin/clients/${id}/adjust`, { delta, note }))
}

export async function apiBlockClient(id: string) {
  return unwrap(http.post(`/admin/clients/${id}/block`))
}

export async function apiUnblockClient(id: string) {
  return unwrap(http.post(`/admin/clients/${id}/unblock`))
}

export async function apiGetAudit() {
  return unwrap<{ items: unknown[]; nextCursor: string | null }>(http.get('/admin/audit'))
}

export type { DashboardRole }
