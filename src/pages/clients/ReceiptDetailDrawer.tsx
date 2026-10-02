import { useState } from 'react'
import useSWR from 'swr'
import { ExternalLink } from 'lucide-react'
import { Drawer } from '@/shared/ui/Drawer'
import { Badge } from '@/shared/ui/Badge'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ErrorState } from '@/shared/ui/ErrorState'
import { apiGetClientReceipt, type ClientReceiptDetail } from '@/shared/api/client'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import { formatPhone } from '@/shared/lib/phone'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const STATUS_KEY: Record<ClientReceiptDetail['status'], DictKey> = {
  applied: 'cd.st.applied',
  pending_review: 'cd.st.pending_review',
  rejected: 'cd.st.rejected',
}
const STATUS_TONE: Record<ClientReceiptDetail['status'], 'success' | 'warning' | 'danger'> = {
  applied: 'success',
  pending_review: 'warning',
  rejected: 'danger',
}

type Rec = Record<string, unknown>
const asRec = (v: unknown): Rec | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : null)
const str = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : String(v))
const num = (v: unknown): number | null => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

/** Flattens the raw soliq.uz record so that every field it returned is listed, however deeply nested. */
function flatten(value: unknown, path = ''): [string, unknown][] {
  if (Array.isArray(value)) return value.length === 0 ? [[path, '[]']] : value.flatMap((v, i) => flatten(v, `${path}[${i}]`))
  const rec = asRec(value)
  if (rec) return Object.entries(rec).flatMap(([k, v]) => flatten(v, path ? `${path}.${k}` : k))
  return [[path, value]]
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">{title}</h3>
      <div className="rounded-xl border border-[var(--color-border)] px-3.5">{children}</div>
    </section>
  )
}

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--color-border)] py-2 last:border-b-0">
      <span className="shrink-0 text-[12.5px] text-[var(--color-ink-tertiary)]">{label}</span>
      <span className={`min-w-0 break-words text-right text-[13px] font-medium text-[var(--color-ink)] ${mono ? 'font-mono text-[12px]' : ''}`}>{children}</span>
    </div>
  )
}

export function ReceiptDetailDrawer({ clientId, receiptId, onClose }: { clientId: string; receiptId: string | null; onClose: () => void }) {
  const { t } = useI18n()
  const [showAll, setShowAll] = useState(false)
  const { data, error, isLoading, mutate } = useSWR(receiptId ? ['/admin/clients', clientId, 'receipt', receiptId] : null, () => apiGetClientReceipt(clientId, receiptId!), {
    revalidateOnFocus: false,
  })

  const yesNo = (v: boolean) => (v ? t('rd.yes') : t('rd.no'))
  const money = (v: unknown) => (num(v) === null ? '—' : formatMoneyFull(num(v)!))

  const tax = data?.taxData ?? null
  const extra = asRec(tax?.extraInfo)
  const items = Array.isArray(tax?.paymentDetails) ? (tax!.paymentDetails as unknown[]).map(asRec).filter((r): r is Rec => !!r) : []

  return (
    <Drawer open={!!receiptId} onClose={onClose} title={t('rd.title')} width={600}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : error || !data ? (
        <ErrorState message={t('common.load_failed')} onRetry={() => mutate()} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="tnum text-[28px] font-bold leading-none text-[var(--color-ink)]">{formatMoneyFull(data.amount)}</p>
              <p className="mt-1.5 text-[12.5px] text-[var(--color-ink-tertiary)]">
                {t('common.bonus')}: <span className="font-semibold text-[var(--color-lime)]">+{formatMoneyFull(data.bonus)}</span> · {data.ratePercent}%
              </p>
            </div>
            <Badge tone={STATUS_TONE[data.status]}>{t(STATUS_KEY[data.status])}</Badge>
          </div>

          <Section title={t('rd.section_receipt')}>
            <Row label={t('common.client')}>
              {data.client.name}
              {data.client.phone ? ` · ${formatPhone(data.client.phone)}` : ''}
            </Row>
            <Row label={t('rd.receipt_at')}>{formatDateTime(data.receiptAt)}</Row>
            <Row label={t('rd.scanned_at')}>{formatDateTime(data.createdAt)}</Row>
            <Row label={t('common.station')}>{data.station.name}</Row>
            <Row label={t('rd.station_address')}>{data.station.address}</Row>
            <Row label={t('rd.terminal')}>
              {data.terminal.label} · <span className="font-mono text-[12px]">{data.terminal.code}</span>
            </Row>
            {data.promotionName && <Row label={t('rd.promo')}>{data.promotionName}</Row>}
            <Row label={t('rd.tax_check')}>
              <Badge tone={data.taxVerified ? 'success' : 'warning'}>{data.taxVerified ? t('rd.verified') : t('rd.not_verified')}</Badge>
              {data.taxSource && ` · ${data.taxSource === 'client' ? t('large.via_phone') : t('large.server_checked')}`}
            </Row>
            {data.taxAmount !== null && <Row label={t('rd.tax_amount')}>{formatMoneyFull(data.taxAmount)}</Row>}
            {data.reviewReasons.length > 0 && <Row label={t('rd.review_reason')}>{data.reviewReasons.join(', ')}</Row>}
            {data.reviewNote && <Row label={t('rd.review_note')}>{data.reviewNote}</Row>}
            {data.reviewedAt && <Row label={t('rd.reviewed_at')}>{formatDateTime(data.reviewedAt)}</Row>}
            {data.distanceM !== null && <Row label={t('rd.distance')}>{data.distanceM} m</Row>}
            <Row label={t('rd.qr')} mono>
              t={data.qr.t} r={data.qr.r} c={data.qr.c} s={data.qr.s}
            </Row>
          </Section>

          <a href={data.soliqUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-primary)]">
            {t('large.open_soliq')} <ExternalLink size={13} />
          </a>

          <p className="text-[12px] text-[var(--color-ink-tertiary)]">
            {data.taxDataSource === 'stored' ? t('rd.src_stored') : data.taxDataSource === 'live' ? t('rd.src_live') : t('rd.src_none')}
          </p>

          {tax && (
            <>
              <Section title={t('rd.section_soliq')}>
                {str(extra?.companyName) && <Row label={t('rd.f.company')}>{str(extra?.companyName)}</Row>}
                {str(tax.tin) && <Row label={t('large.tin')}>{str(tax.tin)}</Row>}
                {str(extra?.address) && <Row label={t('rd.f.address')}>{str(extra?.address)}</Row>}
                <Row label={t('rd.f.terminal_id')} mono>
                  {str(tax.terminalId) ?? '—'}
                </Row>
                <Row label={t('rd.f.payment_no')}>{str(tax.paymentNo) ?? '—'}</Row>
                <Row label={t('rd.f.payment_date')}>{str(tax.paymentDate) ?? '—'}</Row>
                <Row label={t('rd.f.created')}>{str(tax.created) ?? '—'}</Row>
                <Row label={t('rd.f.cash')}>{money(tax.cashTotal)}</Row>
                <Row label={t('rd.f.card')}>{money(tax.cardTotal)}</Row>
                <Row label={t('rd.f.total')}>{money((num(tax.cashTotal) ?? 0) + (num(tax.cardTotal) ?? 0))}</Row>
                <Row label={t('rd.f.vat')}>{money(tax.vatTotal)}</Row>
                {str(tax.kkmName) && <Row label={t('rd.f.kkm')}>{str(tax.kkmName)}</Row>}
                {str(tax.kkmSerialNumber) && (
                  <Row label={t('rd.f.kkm_serial')} mono>
                    {str(tax.kkmSerialNumber)}
                  </Row>
                )}
                {str(tax.fiscalSignHash) && (
                  <Row label={t('rd.f.fiscal')} mono>
                    {str(tax.fiscalSignHash)}
                  </Row>
                )}
                <Row label={t('rd.f.refund')}>{yesNo(Number(tax.isRefund) === 1)}</Row>
              </Section>

              {items.length > 0 && (
                <Section title={t('rd.section_items')}>
                  {items.map((it, i) => (
                    <div key={i} className="border-b border-[var(--color-border)] py-2.5 last:border-b-0">
                      <p className="text-[13px] font-medium text-[var(--color-ink)]">{str(it.productName) ?? str(it.name) ?? '—'}</p>
                      {str(it.name) && str(it.productName) && str(it.name) !== str(it.productName) && (
                        <p className="text-[12px] text-[var(--color-ink-tertiary)]">{str(it.name)}</p>
                      )}
                      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[12px] text-[var(--color-ink-secondary)] sm:grid-cols-3">
                        <span>
                          {t('rd.i.qty')}: <b className="tnum text-[var(--color-ink)]">{str(it.amount) ?? '—'}</b> {str(it.packageName) ?? ''}
                        </span>
                        <span>
                          {t('rd.i.price')}: <b className="tnum text-[var(--color-ink)]">{money(it.price)}</b>
                        </span>
                        <span>
                          {t('rd.i.vat')}: <b className="tnum text-[var(--color-ink)]">{money(it.vat)}</b>
                          {num(it.vatPercent) !== null && ` (${num(it.vatPercent)}%)`}
                        </span>
                        {num(it.discount) ? (
                          <span>
                            {t('rd.i.discount')}: <b className="tnum text-[var(--color-ink)]">{money(it.discount)}</b>
                          </span>
                        ) : null}
                        {str(it.productCode) && (
                          <span className="col-span-2 sm:col-span-3">
                            {t('rd.i.code')}: <b className="font-mono text-[var(--color-ink)]">{str(it.productCode)}</b>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              <section>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">{t('rd.section_all')}</h3>
                  <button onClick={() => setShowAll((v) => !v)} className="text-[12.5px] font-semibold text-[var(--color-primary)]">
                    {showAll ? t('rd.hide') : t('rd.show')}
                  </button>
                </div>
                {showAll && (
                  <div className="rounded-xl border border-[var(--color-border)] px-3.5 font-mono text-[11.5px]">
                    {flatten(tax).map(([path, value]) => (
                      <div key={path} className="flex items-baseline justify-between gap-4 border-b border-[var(--color-border)] py-1.5 last:border-b-0">
                        <span className="min-w-0 break-all text-[var(--color-ink-tertiary)]">{path}</span>
                        <span className={`min-w-0 break-all text-right ${value === null ? 'text-[var(--color-ink-tertiary)]' : 'text-[var(--color-ink)]'}`}>
                          {value === null ? 'null' : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </Drawer>
  )
}
