import { useId } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip, axisTick, gridProps, useAxisFormat, type TipProps } from './shared'

export interface TrendPoint {
  label: string
  value: number
  /** full label for the tooltip header */
  title?: string
}

/**
 * Time series with a smooth gradient area; with fewer than 4 points (a single day) an area
 * would be a dot, so it falls back to rounded bars. `bars` forces the bar style.
 */
export function TrendChart({
  data,
  seriesName,
  format,
  height = 280,
  color = 'var(--chart-1)',
  bars,
  highlightMax,
}: {
  data: TrendPoint[]
  seriesName: string
  format: (v: number) => string
  /** px, or 'fill' to take the whole height of a `relative` parent */
  height?: number | 'fill'
  color?: string
  bars?: boolean
  /** bars only: dim everything except the tallest one */
  highlightMax?: boolean
}) {
  const gid = useId().replace(/:/g, '')
  const axis = useAxisFormat()
  const asBars = bars || data.length < 4
  const max = Math.max(0, ...data.map((d) => d.value))

  const tooltip = (
    <Tooltip
      cursor={asBars ? { fill: 'var(--color-surface-alt)', radius: 8 } : { stroke: 'var(--color-border-strong)', strokeDasharray: '4 4' }}
      content={(p) => <ChartTooltip {...(p as TipProps)} title={(l, item) => (item.payload?.title as string | undefined) ?? l} format={(v) => format(v)} />}
    />
  )
  const xAxis = <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} tickMargin={10} interval="preserveStartEnd" minTickGap={14} />
  const yAxis = <YAxis axisLine={false} tickLine={false} tick={axisTick} width={62} tickFormatter={axis} allowDecimals={false} />

  return (
    <div style={height === 'fill' ? undefined : { height }} className={height === 'fill' ? 'absolute inset-0' : 'w-full'}>
      <ResponsiveContainer width="100%" height="100%">
        {asBars ? (
          <BarChart data={data} margin={{ top: 8, right: 6, left: 0, bottom: 0 }} barCategoryGap="26%">
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            {xAxis}
            {yAxis}
            {tooltip}
            <Bar dataKey="value" name={seriesName} fill={`url(#${gid})`} radius={[8, 8, 3, 3]} maxBarSize={48}>
              {highlightMax && data.map((d, i) => <Cell key={i} fillOpacity={d.value === max && max > 0 ? 1 : 0.5} />)}
            </Bar>
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            {xAxis}
            {yAxis}
            {tooltip}
            <Area
              type="monotone"
              dataKey="value"
              name={seriesName}
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${gid})`}
              dot={false}
              activeDot={{ r: 5.5, fill: color, stroke: 'var(--color-surface)', strokeWidth: 2.5 }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
