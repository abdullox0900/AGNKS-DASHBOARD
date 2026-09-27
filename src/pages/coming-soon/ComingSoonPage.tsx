import { Clock } from 'lucide-react'
import { Card } from '@/shared/ui/Card'

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <Clock size={28} className="text-[var(--color-ink-tertiary)]" />
      <h2 className="text-[16px] font-semibold text-[var(--color-ink)]">{title}</h2>
      <p className="max-w-[320px] text-[13px] text-[var(--color-ink-secondary)]">
        Bu bo'lim 3-bosqichda (pilotdan keyin) ishga tushiriladi.
      </p>
    </Card>
  )
}
