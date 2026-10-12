import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { useBonusSettings } from '@/shared/api/hooks'
import { apiSetSpendMin } from '@/shared/api/client'
import { ApiError } from '@/shared/api/errors'
import { usePermission } from '@/shared/lib/permissions'
import { formatNumber } from '@/shared/lib/format'
import { NewBadge } from '@/shared/ui/NewBadge'
import { useI18n } from '@/app/providers/I18nProvider'

/**
 * Smallest bonus a client can redeem at the till. One setting drives everything: the client app shows it
 * ("Kamida … kerak", the gauge, the guide) and the cashier flow rejects anything below it.
 */
export function SpendMinEditor() {
  const { t } = useI18n()
  const { show } = useToast()
  const canEdit = usePermission('bonus.edit')
  const { data, mutate } = useBonusSettings()
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const current = data?.spendMinAmount
  const max = data?.spendMaxAmount
  const shown = draft ?? (current !== undefined ? String(current) : '')
  const value = shown === '' ? null : Number(shown)
  const tooHigh = value !== null && max !== undefined && value > max
  const dirty = draft !== null && value !== null && value >= 1 && value !== current && !tooHigh

  async function save() {
    if (!dirty || value === null) return
    setSaving(true)
    try {
      await apiSetSpendMin(value)
      await mutate()
      setDraft(null)
      show(t('bonus.spendmin_saved'))
    } catch (err) {
      if (!(err instanceof ApiError)) throw err
      show(t('common.error_generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Wallet size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-ink-secondary)]">
            {t('bonus.spendmin_title')}
            <NewBadge since="2026-10-12" />
          </p>
          {canEdit ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
              className="mt-1 flex flex-wrap items-center gap-2"
            >
              <label
                className={`flex h-11 items-center gap-2 rounded-xl border bg-[var(--color-surface)] px-3 focus-within:border-[var(--color-primary)] ${tooHigh ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
              >
                <input
                  inputMode="numeric"
                  value={shown === '' ? '' : formatNumber(Number(shown))}
                  onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="tnum w-28 bg-transparent text-[20px] font-bold text-[var(--color-ink)] outline-none"
                  aria-label={t('bonus.spendmin_title')}
                />
                <span className="text-[12.5px] text-[var(--color-ink-tertiary)]">{t('bonus.spendmin_unit')}</span>
              </label>
              <Button type="submit" disabled={!dirty} loading={saving}>
                {t('common.save')}
              </Button>
            </form>
          ) : (
            <p className="tnum text-[26px] font-bold text-[var(--color-ink)]">
              {current !== undefined ? formatNumber(current) : '—'} <span className="text-[13px] font-medium text-[var(--color-ink-tertiary)]">{t('bonus.spendmin_unit')}</span>
            </p>
          )}
          {tooHigh && max !== undefined && (
            <p className="mt-1.5 text-[12px] font-medium text-[var(--color-danger)]">{t('bonus.spendmin_too_high', { max: formatNumber(max) })}</p>
          )}
          <p className="mt-2 text-[12px] text-[var(--color-ink-tertiary)]">{t('bonus.spendmin_hint')}</p>
        </div>
      </div>
    </Card>
  )
}
