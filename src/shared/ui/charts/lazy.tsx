import { Suspense, type ComponentProps } from 'react'
import { Skeleton } from '@/shared/ui/Skeleton'
import { lazyWithReload } from '@/shared/lib/lazyWithReload'
import type { TrendChart as TrendImpl } from './TrendChart'
import type { ComboChart as ComboImpl } from './ComboChart'
import type { HBarChart as HBarImpl } from './HBarChart'
import type { DonutChart as DonutImpl } from './DonutChart'

// recharts is large — keep it out of the initial bundle (TZ-3 §14 budget); a skeleton holds the space meanwhile.
const Trend = lazyWithReload(() => import('./TrendChart').then((m) => ({ default: m.TrendChart })))
const Combo = lazyWithReload(() => import('./ComboChart').then((m) => ({ default: m.ComboChart })))
const HBar = lazyWithReload(() => import('./HBarChart').then((m) => ({ default: m.HBarChart })))
const Donut = lazyWithReload(() => import('./DonutChart').then((m) => ({ default: m.DonutChart })))

export function TrendChart(props: ComponentProps<typeof TrendImpl>) {
  return (
    <Suspense fallback={props.height === 'fill' ? <Skeleton className="absolute inset-0" /> : <Skeleton className="w-full" style={{ height: props.height ?? 280 }} />}>
      <Trend {...props} />
    </Suspense>
  )
}

export function ComboChart(props: ComponentProps<typeof ComboImpl>) {
  return (
    <Suspense fallback={<Skeleton className="w-full" style={{ height: props.height ?? 300 }} />}>
      <Combo {...props} />
    </Suspense>
  )
}

export function HBarChart(props: ComponentProps<typeof HBarImpl>) {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full" />}>
      <HBar {...props} />
    </Suspense>
  )
}

export function DonutChart(props: ComponentProps<typeof DonutImpl>) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto rounded-full" style={{ width: props.size ?? 190, height: props.size ?? 190 }} />}>
      <Donut {...props} />
    </Suspense>
  )
}
