import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_PALETTE, ChartTooltip, type TipProps } from './shared'

export interface HBarRow {
  name: string
  value: number
}

/** Ranked horizontal bars with value labels; one colour per row when `multicolor`. */
export function HBarChart({
  data,
  seriesName,
  format,
  color = 'var(--chart-1)',
  multicolor,
  rowHeight = 38,
}: {
  data: HBarRow[]
  seriesName: string
  format: (v: number) => string
  color?: string
  multicolor?: boolean
  rowHeight?: number
}) {
  return (
    <div style={{ height: Math.max(120, data.length * rowHeight + 12) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 84, left: 0, bottom: 0 }} barCategoryGap="22%">
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            width={150}
            tick={{ fill: 'var(--color-ink-secondary)', fontSize: 12 }}
            // non-breaking spaces: recharts would otherwise wrap long names onto a second line
            tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v).replace(/ /g, '\u00A0')}
          />
          <Tooltip cursor={{ fill: 'var(--color-surface-alt)', radius: 6 }} content={(p) => <ChartTooltip {...(p as TipProps)} format={(v) => format(v)} />} />
          <Bar dataKey="value" name={seriesName} radius={[3, 8, 8, 3]} barSize={16} background={{ fill: 'var(--color-surface-alt)', radius: 8 }}>
            {data.map((_, i) => (
              <Cell key={i} fill={multicolor ? CHART_PALETTE[i % CHART_PALETTE.length] : color} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => format(Number(v))} fill="var(--color-ink-secondary)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
