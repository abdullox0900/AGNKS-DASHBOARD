import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz'
import { endOfMonth, startOfMonth, subDays, subMonths } from 'date-fns'

export const TASHKENT_TZ = 'Asia/Tashkent'

export type PeriodPreset = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom'

export interface PeriodRange {
  preset: PeriodPreset
  from: Date
  to: Date
}

function startOfTashkentDay(d: Date): Date {
  const zoned = toZonedTime(d, TASHKENT_TZ)
  zoned.setHours(0, 0, 0, 0)
  return fromZonedTime(zoned, TASHKENT_TZ)
}

function endOfTashkentDay(d: Date): Date {
  const zoned = toZonedTime(d, TASHKENT_TZ)
  zoned.setHours(23, 59, 59, 999)
  return fromZonedTime(zoned, TASHKENT_TZ)
}

export function resolvePreset(preset: PeriodPreset): { from: Date; to: Date } {
  const now = new Date()
  switch (preset) {
    case 'today':
      return { from: startOfTashkentDay(now), to: endOfTashkentDay(now) }
    case 'yesterday': {
      const y = subDays(now, 1)
      return { from: startOfTashkentDay(y), to: endOfTashkentDay(y) }
    }
    case '7d':
      return { from: startOfTashkentDay(subDays(now, 6)), to: endOfTashkentDay(now) }
    case '30d':
      return { from: startOfTashkentDay(subDays(now, 29)), to: endOfTashkentDay(now) }
    case 'this_month':
      return { from: startOfTashkentDay(startOfMonth(now)), to: endOfTashkentDay(now) }
    case 'last_month': {
      const lastMonth = subMonths(now, 1)
      return { from: startOfTashkentDay(startOfMonth(lastMonth)), to: endOfTashkentDay(endOfMonth(lastMonth)) }
    }
    default:
      return { from: startOfTashkentDay(subDays(now, 6)), to: endOfTashkentDay(now) }
  }
}

export function formatDateShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return formatTz(d, 'd MMM', { timeZone: TASHKENT_TZ })
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return formatTz(d, 'd MMM, HH:mm', { timeZone: TASHKENT_TZ })
}

export function formatDateInput(d: Date): string {
  return formatTz(d, 'yyyy-MM-dd', { timeZone: TASHKENT_TZ })
}

export function parseDateInput(s: string): Date {
  const [y, m, day] = s.split('-').map(Number)
  return fromZonedTime(new Date(y, (m ?? 1) - 1, day ?? 1), TASHKENT_TZ)
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: 'Bugun',
  yesterday: 'Kecha',
  '7d': '7 kun',
  '30d': '30 kun',
  this_month: 'Shu oy',
  last_month: "O'tgan oy",
  custom: 'Ixtiyoriy oraliq',
}

/** Previous period of equal length, immediately preceding `from` — for KPI delta comparisons. */
export function previousEqualPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const lengthMs = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - lengthMs)
  return { from: prevFrom, to: prevTo }
}
