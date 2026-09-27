import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Drawer } from '@/shared/ui/Drawer'
import { useToast } from '@/shared/ui/Toast'
import { useBonusSettings, usePromotions, useStations } from '@/shared/api/hooks'
import { apiCancelPromotion, apiCreatePromotion, apiImpactPreview, apiSetBaseRate } from '@/shared/api/client'
import { usePermission } from '@/shared/lib/permissions'
import { formatDateTime } from '@/shared/lib/dates'
import { formatMoneyFull } from '@/shared/lib/format'
import type { PromotionStatus } from '@/entities/models'
import { SendTimePicker, resolveSendAt, type SendTimeMode } from '@/widgets/SendTimePicker'

const STATUS_LABEL: Record<PromotionStatus, string> = { active: 'Faol', scheduled: 'Rejada', ended: 'Tugagan', cancelled: 'Bekor qilingan' }
const STATUS_TONE: Record<PromotionStatus, 'success' | 'primary' | 'neutral' | 'danger'> = { active: 'success', scheduled: 'primary', ended: 'neutral', cancelled: 'danger' }

interface ImpactPreview {
  sampleDays: number
  sampleReceiptCount: number
  avgDailyReceiptAmount: string
  estimatedDailyExtraCost: string
}

function ImpactNote({ impact }: { impact: ImpactPreview }) {
  const extra = Number(impact.estimatedDailyExtraCost)
  return (
    <div className="rounded-xl bg-[var(--color-primary-soft)] px-3 py-2.5 text-[12.5px] text-[var(--color-primary)]">
      Oxirgi {impact.sampleDays} kunda {impact.sampleReceiptCount} ta chek asosida — taxminan{' '}
      {extra >= 0 ? '+' : ''}
      {formatMoneyFull(extra)}/kun qo'shimcha xarajat.
    </div>
  )
}

export function BonusPage() {
  const canEdit = usePermission('bonus.edit')
  const { data: settings, mutate: mutateSettings } = useBonusSettings()
  const { data: promotions, mutate: mutatePromotions } = usePromotions()
  const { show } = useToast()

  const [editingRate, setEditingRate] = useState(false)
  const [rateInput, setRateInput] = useState('')
  const [rateNote, setRateNote] = useState('')
  const [rateImpact, setRateImpact] = useState<ImpactPreview | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    if (!editingRate || !rateInput) {
      setRateImpact(null)
      return
    }
    const t = setTimeout(async () => {
      const impact = await apiImpactPreview(Math.round(Number(rateInput) * 100), null)
      setRateImpact(impact)
    }, 300)
    return () => clearTimeout(t)
  }, [rateInput, editingRate])

  async function handleSaveRate() {
    if (!rateNote || !rateInput) return
    await apiSetBaseRate(Math.round(Number(rateInput) * 100), rateNote)
    show('Asosiy foiz yangilandi')
    setEditingRate(false)
    setRateNote('')
    mutateSettings()
  }

  const baseRatePercent = settings ? settings.baseRateBps / 100 : null

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-[var(--color-ink-secondary)]">Asosiy foiz</p>
            <p className="tnum text-[26px] font-bold text-[var(--color-ink)]">{baseRatePercent ?? '—'}%</p>
          </div>
          {canEdit && (
            <Button
              variant="secondary"
              onClick={() => {
                setRateInput(String(baseRatePercent ?? 1))
                setEditingRate(true)
              }}
            >
              O'zgartirish
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Aksiyalar</h3>
          {canEdit && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={15} /> Yangi aksiya
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {promotions?.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-4 py-3">
              <div className="flex items-center gap-3">
                <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-ink)]">
                    {p.name} · {p.rateBps / 100}%
                  </p>
                  <p className="text-[12px] text-[var(--color-ink-tertiary)]">
                    {formatDateTime(p.startsAt)} → {formatDateTime(p.endsAt)}
                  </p>
                </div>
              </div>
              {canEdit && p.status !== 'cancelled' && p.status !== 'ended' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await apiCancelPromotion(p.id)
                    mutatePromotions()
                  }}
                >
                  To'xtatish
                </Button>
              )}
            </div>
          ))}
          {(!promotions || promotions.length === 0) && <p className="py-4 text-center text-[13px] text-[var(--color-ink-tertiary)]">Aksiya yo'q</p>}
        </div>
      </Card>

      <Drawer open={editingRate} onClose={() => setEditingRate(false)} title="Asosiy foizni o'zgartirish">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Yangi foiz</label>
            <input value={rateInput} onChange={(e) => setRateInput(e.target.value.replace(/[^\d.]/g, ''))} className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px]" />
          </div>
          {rateImpact && <ImpactNote impact={rateImpact} />}
          <div>
            <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Izoh (majburiy)</label>
            <textarea value={rateNote} onChange={(e) => setRateNote(e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]" />
          </div>
          <Button className="w-full" disabled={!rateNote || !rateInput} onClick={handleSaveRate}>
            Tasdiqlash
          </Button>
        </div>
      </Drawer>

      <Drawer open={formOpen} onClose={() => setFormOpen(false)} title="Yangi aksiya">
        <PromotionForm
          onCreated={() => {
            setFormOpen(false)
            mutatePromotions()
          }}
        />
      </Drawer>
    </div>
  )
}

function PromotionForm({ onCreated }: { onCreated: () => void }) {
  const { data: stations } = useStations()
  const { data: settings } = useBonusSettings()
  const [name, setName] = useState('')
  const [rate, setRate] = useState('2')
  const [scope, setScope] = useState<'all' | string[]>('all')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [reason, setReason] = useState('')
  const [notifyMode, setNotifyMode] = useState<SendTimeMode>('start')
  const [notifyAt, setNotifyAt] = useState('')
  const [impact, setImpact] = useState<ImpactPreview | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const stationIds = scope === 'all' ? null : scope

  useEffect(() => {
    if (!rate) return
    const t = setTimeout(async () => setImpact(await apiImpactPreview(Math.round(Number(rate) * 100), stationIds)), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, scope])

  const rateNum = Number(rate)
  const notifyValid = notifyMode !== 'custom' || !!notifyAt
  const warnHigh = rateNum > 3

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !startsAt || !endsAt || !reason || !notifyValid) return
    setSubmitting(true)
    try {
      await apiCreatePromotion({
        name,
        rateBps: Math.round(rateNum * 100),
        stationIds,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        reason,
        notifyAt: resolveSendAt(notifyMode, notifyAt, startsAt),
      })
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Nomi</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px]" />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Foiz (0–10)</label>
        <input type="number" min={0} max={10} step={0.1} value={rate} onChange={(e) => setRate(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px]" />
        {warnHigh && <p className="mt-1 text-[12px] font-medium text-[var(--color-amber-strong)]">Yuqori foiz. Marjani tekshiring.</p>}
        {rateNum === 0 && <p className="mt-1 text-[12px] text-[var(--color-ink-tertiary)]">Bonus berilmaydi, cheklar yozilaveradi.</p>}
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Filiallar</label>
        <select
          value={scope === 'all' ? 'all' : 'custom'}
          onChange={(e) => setScope(e.target.value === 'all' ? 'all' : [])}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px]"
        >
          <option value="all">Barchasi</option>
          <option value="custom">Tanlash</option>
        </select>
        {scope !== 'all' && (
          <div className="mt-2 space-y-1">
            {stations?.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={Array.isArray(scope) && scope.includes(s.id)}
                  onChange={(e) => {
                    const current = Array.isArray(scope) ? scope : []
                    setScope(e.target.checked ? [...current, s.id] : current.filter((id) => id !== s.id))
                  }}
                />
                {s.name}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Boshlanish</label>
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--color-border)] px-2 text-[13px]" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Tugash (majburiy)</label>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--color-border)] px-2 text-[13px]" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">Sabab</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]" />
      </div>

      <div className="rounded-xl border border-[var(--color-border)] p-3">
        <p className="text-[13px] font-medium text-[var(--color-ink)]">Mijozlarga xabar berish</p>
        <p className="mb-2 text-[11.5px] text-[var(--color-ink-tertiary)]">
          Telegram bot va ilovadagi «Xabarlar» bo'limiga yuboriladi. Aksiya bekor qilinsa, yuborilmagan xabar ham bekor bo'ladi.
        </p>
        <SendTimePicker
          modes={['start', 'now', 'custom', 'none']}
          mode={notifyMode}
          onModeChange={setNotifyMode}
          customAt={notifyAt}
          onCustomAtChange={setNotifyAt}
        />
      </div>

      {impact && <ImpactNote impact={impact} />}

      <p className="text-[11px] text-[var(--color-ink-tertiary)]">
        Filialga qo'yilgan aksiya butun tarmoq aksiyasidan ustun. Foiz chek vaqti bo'yicha qo'llanadi.
      </p>
      {settings && <p className="text-[11px] text-[var(--color-ink-tertiary)]">Joriy asosiy foiz: {settings.baseRateBps / 100}%</p>}

      <Button type="submit" className="w-full" loading={submitting} disabled={!name || !startsAt || !endsAt || !reason || !notifyValid}>
        Yaratish
      </Button>
    </form>
  )
}
