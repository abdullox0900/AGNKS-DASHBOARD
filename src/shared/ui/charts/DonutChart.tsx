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
}: {
  data: DonutSlice[]
  format: (v: number) => string
  center?: ReactNode
  size?: number
}) {
  return (
    <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={(p) => <ChartTooltip {...(p as TipProps)} format={(v) => format(v)} />} />
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
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  )
}
