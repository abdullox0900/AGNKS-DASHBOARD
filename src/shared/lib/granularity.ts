export type Granularity = 'day' | 'week' | 'month'

export const GRANULARITY_LABELS: Record<Granularity, string> = { day: 'Kun', week: 'Hafta', month: 'Oy' }

function bucketKey(dateStr: string, granularity: Granularity): string {
  const d = new Date(dateStr)
  if (granularity === 'day') return dateStr
  if (granularity === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  // ISO week start (Monday)
  const day = (d.getDay() + 6) % 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - day)
  return monday.toISOString().slice(0, 10)
}

/** Re-buckets a `{date, ...numeric fields}[]` series into week/month totals for the granularity toggle. */
export function aggregateByGranularity<T extends { date: string }>(
  series: T[],
  granularity: Granularity,
  numericKeys: (keyof T)[],
): T[] {
  if (granularity === 'day') return series
  const buckets = new Map<string, T>()
  for (const row of series) {
    const key = bucketKey(row.date, granularity)
    if (!buckets.has(key)) {
      const base = { ...row, date: key }
      for (const k of numericKeys) (base as Record<string, unknown>)[k as string] = 0
      buckets.set(key, base)
    }
    const bucket = buckets.get(key)!
    for (const k of numericKeys) {
      ;(bucket as unknown as Record<string, number>)[k as string] += Number(row[k])
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date))
}
