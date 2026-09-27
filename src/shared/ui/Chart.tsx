import { Suspense } from 'react'
import type { EChartsOption } from 'echarts'
import { Skeleton } from './Skeleton'
import { lazyWithReload } from '@/shared/lib/lazyWithReload'

// echarts-for-react (and echarts itself) are large — split into their own chunk
// so the initial dashboard bundle stays lean (TZ-3 §14 budget).
const ReactECharts = lazyWithReload(() => import('echarts-for-react'))

export function Chart({ option, height = 320 }: { option: EChartsOption; height?: number }) {
  return (
    <Suspense fallback={<Skeleton className="w-full" style={{ height }} />}>
      <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
    </Suspense>
  )
}
