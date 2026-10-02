import { useId } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip, axisTick, gridProps, useAxisFormat, type TipProps } from './shared'

export interface ComboPoint {
  label: string
  count: number
  sum: number
}

/** Bars (count, left axis) + smooth line (amount, right axis) on one time axis. */
export function ComboChart({
  data,
  countName,
  sumName,
  formatSum,
  height = 300,
}: {
  data: ComboPoint[]
  countName: string
  sumName: string
  formatSum: (v: number) => string
  height?: number
}) {
  const gid = useId().replace(/:/g, '')
  const axis = useAxisFormat()

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-[12px] text-[var(--color-ink-secondary)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--chart-1)]" /> {countName}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-[var(--chart-3)]" /> {sumName}
        </span>
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} tickMargin={10} minTickGap={14} />
            <YAxis yAxisId="l" axisLine={false} tickLine={false} tick={axisTick} width={36} allowDecimals={false} />
            <YAxis yAxisId="r" orientation="right" axisLine={false} tickLine={false} tick={axisTick} width={68} tickFormatter={axis} />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-alt)', radius: 8 }}
              content={(p) => (
                <ChartTooltip {...(p as TipProps)} format={(v, item) => (item.dataKey === 'sum' ? formatSum(v) : String(v))} />
              )}
            />
            <Bar yAxisId="l" dataKey="count" name={countName} fill={`url(#${gid})`} radius={[8, 8, 3, 3]} maxBarSize={40} />
            <Line
              yAxisId="r"
              type="monotone"
              dataKey="sum"
              name={sumName}
              stroke="var(--chart-3)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--chart-3)', strokeWidth: 0 }}
              activeDot={{ r: 5.5, fill: 'var(--chart-3)', stroke: 'var(--color-surface)', strokeWidth: 2.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
