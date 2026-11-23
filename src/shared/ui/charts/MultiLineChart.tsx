import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip, axisTick, gridProps, useAxisFormat, type TipProps } from './shared'

export interface LineSeries {
  key: string
  name: string
  color: string
}

/** Several series over the same x axis (e.g. one line per station). `dim` fades every line but one. */
export function MultiLineChart({
  data,
  series,
  format,
  height = 300,
  dim,
}: {
  /** one object per x point: `label`, optional `title` (tooltip header) and a number per series key */
  data: Array<Record<string, string | number>>
  series: LineSeries[]
  format: (v: number) => string
  height?: number
  /** key of the series to keep bright */
  dim?: string | null
}) {
  const axis = useAxisFormat()
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} tickMargin={10} interval="preserveStartEnd" minTickGap={14} />
          <YAxis axisLine={false} tickLine={false} tick={axisTick} width={62} tickFormatter={axis} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: 'var(--color-border-strong)', strokeDasharray: '4 4' }}
            content={(p) => <ChartTooltip {...(p as TipProps)} title={(l, item) => (item.payload?.title as string | undefined) ?? l} format={(v) => format(v)} />}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={dim === s.key ? 3 : 2}
              strokeOpacity={dim && dim !== s.key ? 0.22 : 1}
              dot={false}
              activeDot={{ r: 4.5, fill: s.color, stroke: 'var(--color-surface)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
