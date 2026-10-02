import { Clock } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

export function ComingSoonPage({ title }: { title: DictKey }) {
  const { t } = useI18n()
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <Clock size={28} className="text-[var(--color-ink-tertiary)]" />
      <h2 className="text-[16px] font-semibold text-[var(--color-ink)]">{t(title)}</h2>
      <p className="max-w-[320px] text-[13px] text-[var(--color-ink-secondary)]">
        {t('coming_soon.text')}
      </p>
    </Card>
  )
}
