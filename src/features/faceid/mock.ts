/**
 * SAMPLE DATA for the FaceID section until it is connected to TimeFace (face-recognition terminals, separate system).
 * Deterministic: the same date always gives the same day, so the screens look the same on every visit.
 */
export type Status = 'came' | 'late' | 'absent' | 'off'

export interface Terminal {
  id: string
  name: string
  online: boolean
  /** minutes since the terminal last reported, when offline */
  lastSeenMin?: number
}
export interface Branch {
  id: number
  name: string
  terminal: Terminal
}
export interface Employee {
  id: string
  name: string
  position: string
  branch: number
}
export interface DayRecord {
  employee: Employee
  status: Status
  in?: string
  out?: string
  /** minutes late (status 'late') */
  late?: number
  /** worked minutes so far / in total */
  worked?: number
  /** still at work right now */
  now?: boolean
}
export interface ScanEvent {
  id: string
  employee: Employee
  kind: 'in' | 'out'
  time: string
  confidence: number
  branch: Branch
}
export type RejectReason = 'unknown_face' | 'low_confidence' | 'not_registered'
export interface Rejected {
  id: string
  at: string
  date: string
  branch: Branch
  reason: RejectReason
  confidence: number
  handled: boolean
}

export const SHIFT_START = '08:00'
/** the moment "today" is simulated at, in hours */
export const NOW_H = 13.33
export const NOW_LABEL = '13:20'

const BRANCH_NAMES = ['Markaz', 'Mustaqillik', 'Sanoat', "Beshariq yo'li", "Farg'ona yo'li", "Quva yo'li", "Rishton yo'li"]
export const BRANCHES: Branch[] = BRANCH_NAMES.map((name, id) => ({
  id,
  name,
  terminal: { id: `T-${id + 1}`, name: `Terminal ${id + 1}`, online: id !== 5, lastSeenMin: id === 5 ? 140 : undefined },
}))

const PEOPLE: [string, string, number][] = [
  ['Aziz Rahimov', 'Smena boshlig\'i', 0], ['Dilnoza Karimova', 'Kassir', 0], ['Sardor Mirzayev', 'Zapravkachi', 0], ['Jasur Toshmatov', 'Zapravkachi', 0], ['Nargiza Olimova', 'Operator', 0],
  ['Malika Yusupova', 'Smena boshlig\'i', 1], ['Bobur Aliyev', 'Zapravkachi', 1], ['Nilufar Saidova', 'Kassir', 1], ['Otabek Ismoilov', 'Zapravkachi', 1], ['Laylo Hamidova', 'Operator', 1],
  ['Zarina Qodirova', 'Kassir', 2], ['Sherzod Nazarov', 'Zapravkachi', 2], ['Madina Rustamova', 'Operator', 2], ['Doniyor Qosimov', 'Zapravkachi', 2],
  ['Javohir Abdullayev', 'Smena boshlig\'i', 3], ['Kamola Hasanova', 'Kassir', 3], ['Ulugbek Sobirov', 'Zapravkachi', 3], ['Muxlisa Azimova', 'Operator', 3], ['Shahzod Ergashev', 'Zapravkachi', 3],
  ['Anvar Komilov', 'Smena boshlig\'i', 4], ['Feruza Mamatova', 'Kassir', 4], ['Timur Valiyev', 'Zapravkachi', 4], ['Gulnora Sattorova', 'Operator', 4],
  ['Rustam Yoqubov', 'Smena boshlig\'i', 5], ['Sevara Nuriddinova', 'Kassir', 5], ['Behzod Tursunov', 'Zapravkachi', 5], ['Lola Ahmedova', 'Operator', 5],
  ['Islom Karimov', 'Smena boshlig\'i', 6], ['Mohira Davronova', 'Kassir', 6], ['Sanjar Xudoyberdiyev', 'Zapravkachi', 6], ['Ruxshona Botirova', 'Operator', 6],
]
export const EMPLOYEES: Employee[] = PEOPLE.map(([name, position, branch], i) => ({ id: `e${i + 1}`, name, position, branch }))
export const employeeById = (id: string) => EMPLOYEES.find((e) => e.id === id)

// ---------- dates (all in Tashkent calendar days, as YYYY-MM-DD) ----------
export const todayStr = (): string => new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10)
export const addDays = (d: string, n: number): string => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
/** 0 = Sunday */
export const dow = (d: string): number => new Date(`${d}T00:00:00Z`).getUTCDay()
export const daysInMonth = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate()

function rnd(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  h ^= h >>> 15
  h = Math.imul(h, 2246822519)
  h ^= h >>> 13
  return ((h >>> 0) % 10_000) / 10_000
}
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))

/** One employee's day. Sundays are rest days; days after "today" have no record. */
export function dayRecord(e: Employee, date: string): DayRecord | null {
  const today = todayStr()
  if (date > today) return null
  if (dow(date) === 0) return { employee: e, status: 'off' }
  const r = rnd(`${e.id}|${date}`)
  if (r < 0.07) return { employee: e, status: 'absent' }
  const late = r > 0.83
  const inMin = late ? 8 * 60 + 6 + Math.floor(rnd(`${e.id}|${date}|l`) * 58) : 7 * 60 + 42 + Math.floor(rnd(`${e.id}|${date}|i`) * 18)
  const isToday = date === today
  const leaveMin = 17 * 60 + Math.floor((rnd(`${e.id}|${date}|o`) - 0.5) * 40)
  const out = isToday ? undefined : hhmm(leaveMin)
  const end = isToday ? Math.round(NOW_H * 60) : leaveMin
  return { employee: e, status: late ? 'late' : 'came', in: hhmm(inMin), out, late: late ? inMin - 8 * 60 : undefined, worked: Math.max(0, end - inMin - (isToday ? 0 : 60)), now: isToday }
}

export const dayRecords = (date: string): DayRecord[] => EMPLOYEES.flatMap((e) => dayRecord(e, date) ?? [])

export const STATUS_ORDER: Record<Status, number> = { late: 0, absent: 1, came: 2, off: 3 }
export const here = (list: DayRecord[]) => list.filter((r) => r.status === 'came' || r.status === 'late').length
export const countOf = (list: DayRecord[], s: Status) => list.filter((r) => r.status === s).length
export const workedLabel = (min?: number) => (min === undefined ? '—' : `${Math.floor(min / 60)} s ${String(min % 60).padStart(2, '0')} d`)

/** Scans of a day, newest first. */
export function scanEvents(date: string): ScanEvent[] {
  const out: ScanEvent[] = []
  for (const r of dayRecords(date)) {
    if (!r.in) continue
    const branch = BRANCHES[r.employee.branch]
    out.push({ id: `${r.employee.id}-in`, employee: r.employee, kind: 'in', time: r.in, confidence: 94 + Math.floor(rnd(`${r.employee.id}|${date}|c`) * 6), branch })
    if (r.out) out.push({ id: `${r.employee.id}-out`, employee: r.employee, kind: 'out', time: r.out, confidence: 94 + Math.floor(rnd(`${r.employee.id}|${date}|d`) * 6), branch })
  }
  return out.sort((a, b) => toMin(b.time) - toMin(a.time))
}

export function rejectedAttempts(): Rejected[] {
  const today = todayStr()
  const rows: [number, string, number, RejectReason, number][] = [
    [5, '12:41', 0, 'unknown_face', 38],
    [1, '11:07', 0, 'low_confidence', 71],
    [3, '09:26', 0, 'not_registered', 88],
    [0, '18:52', 1, 'unknown_face', 42],
    [2, '08:03', 1, 'low_confidence', 66],
    [6, '17:30', 2, 'unknown_face', 35],
  ]
  return rows.map(([b, at, ago, reason, confidence], i) => ({ id: `r${i}`, at, date: addDays(today, -ago), branch: BRANCHES[b], reason, confidence, handled: i >= 4 }))
}

// ---------- month ----------
export const MONTH_NAMES = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']
export const MONTH_NAMES_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

const MONTHS_SHORT = { uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'], ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'] }
const WEEKDAYS_SHORT = { uz: ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'], ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] }
/** "13 Noy, Jum" — spelled out here because the browser prints Uzbek month names as "M11". */
export function dayLabel(d: string, locale: 'uz' | 'ru'): string {
  const [, m, day] = d.split('-').map(Number)
  return `${day} ${MONTHS_SHORT[locale][m - 1]}, ${WEEKDAYS_SHORT[locale][dow(d)]}`
}

export interface MonthTotals {
  days: number
  late: number
  lateMin: number
  absent: number
  workedMin: number
  avgIn: string
}
export function monthDays(e: Employee, ym: string): (DayRecord | null)[] {
  const [y, m] = ym.split('-').map(Number)
  return Array.from({ length: daysInMonth(y, m) }, (_, i) => dayRecord(e, `${ym}-${String(i + 1).padStart(2, '0')}`))
}
export function monthTotals(days: (DayRecord | null)[]): MonthTotals {
  const rec = days.filter((d): d is DayRecord => !!d)
  const came = rec.filter((r) => r.status === 'came' || r.status === 'late')
  const ins = came.map((r) => toMin(r.in!))
  return {
    days: came.length,
    late: rec.filter((r) => r.status === 'late').length,
    lateMin: rec.reduce((s, r) => s + (r.late ?? 0), 0),
    absent: rec.filter((r) => r.status === 'absent').length,
    workedMin: came.reduce((s, r) => s + (r.worked ?? 0), 0),
    avgIn: ins.length ? hhmm(Math.round(ins.reduce((a, b) => a + b, 0) / ins.length)) : '—',
  }
}
