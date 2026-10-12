import type { ReactNode } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip, type TipProps } from './shared'

export interface DonutSlice {
  name: string
  value: number
  color: string
}

/** Ring chart with a label in the hole; slices carry their own colour. */
export function DonutChart({
  data,
  format,
  center,
  size = 190,
  active,
  onActive,
}: {
  data: DonutSlice[]
  format: (v: number) => string
  center?: ReactNode
  size?: number
  /** Controlled hover: the highlighted slice. With `onActive` the floating tooltip is dropped — the owner shows the detail next to the chart instead. */
  active?: number | null
  onActive?: (index: number | null) => void
}) {
  return (
    <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {!onActive && <Tooltip content={(p) => <ChartTooltip {...(p as TipProps)} format={(v) => format(v)} />} />}
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 3 : 0}
            cornerRadius={7}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            onMouseEnter={onActive ? (_, i) => onActive(i) : undefined}
            onMouseLeave={onActive ? () => onActive(null) : undefined}
            isAnimationActive={!onActive}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={active == null || active === i ? 1 : 0.28} style={{ transition: 'fill-opacity 150ms' }} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  )
}
