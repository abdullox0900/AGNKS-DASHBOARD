import { useState } from 'react'
import { Fuel } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { useBonusSettings } from '@/shared/api/hooks'
import { apiSetMethanePrice } from '@/shared/api/client'
import { usePermission } from '@/shared/lib/permissions'
import { formatNumber } from '@/shared/lib/format'
import { useI18n } from '@/app/providers/I18nProvider'

const MAX = 1_000_000

/** Today's methane price for the client app's home screen. Display only — nothing else in the system reads it. */
export function MethanePriceEditor() {
  const { t } = useI18n()
  const { show } = useToast()
  const canEdit = usePermission('bonus.edit')
  const { data, mutate } = useBonusSettings()
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const current = data?.methanePrice
  const shown = draft ?? (current !== undefined ? String(current) : '')
  const value = shown === '' ? null : Number(shown)
  const dirty = draft !== null && value !== null && value !== current && value <= MAX

  async function save() {
    if (!dirty || value === null) return
    setSaving(true)
    try {
      await apiSetMethanePrice(value)
      await mutate()
      setDraft(null)
      show(t('bonus.methane_saved'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Fuel size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--color-ink-secondary)]">{t('bonus.methane_title')}</p>
          {canEdit ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
              className="mt-1 flex flex-wrap items-center gap-2"
            >
              <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 focus-within:border-[var(--color-primary)]">
                <input
                  inputMode="numeric"
                  value={shown === '' ? '' : formatNumber(Number(shown))}
                  onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  className="tnum w-28 bg-transparent text-[20px] font-bold text-[var(--color-ink)] outline-none"
                  aria-label={t('bonus.methane_title')}
                />
                <span className="text-[12.5px] text-[var(--color-ink-tertiary)]">{t('bonus.methane_unit')}</span>
              </label>
              <Button type="submit" disabled={!dirty} loading={saving}>
                {t('common.save')}
              </Button>
            </form>
          ) : (
            <p className="tnum text-[26px] font-bold text-[var(--color-ink)]">
              {current !== undefined ? formatNumber(current) : '—'} <span className="text-[13px] font-medium text-[var(--color-ink-tertiary)]">{t('bonus.methane_unit')}</span>
            </p>
          )}
          <p className="mt-2 text-[12px] text-[var(--color-ink-tertiary)]">{t('bonus.methane_hint')}</p>
        </div>
      </div>
    </Card>
  )
}
