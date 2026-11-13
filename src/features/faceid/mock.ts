/**
 * Data of the FaceID section. Two sources behind the same functions:
 *  - SAMPLE (default): deterministic mock — the same date always gives the same day.
 *  - LIVE: once AGNKS's backend has the TimeFace API key, `useFaceData` fills this store from the API and
 *    `LIVE.on` flips; `dayRecord / dayRecords / scanEvents` then read the store, everything else keeps working.
 */
import type { ApiBranch, ApiEmployee, ApiEvent, ApiNote, ApiRecord } from '@/shared/api/faceid'
/** pending = a later shift that has not started yet (today only) */
export type Status = 'came' | 'late' | 'absent' | 'off' | 'pending'

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
export type Shift = 'day' | 'night'
export type Reason = 'sick' | 'leave' | 'none' | 'trip' | 'other'
export interface Employee {
  id: string
  name: string
  position: string
  branch: number
  shift: Shift
}
export interface DayRecord {
  employee: Employee
  status: Status
  in?: string
  out?: string
  /** minutes late (status 'late') */
  late?: number
  /** minutes before the shift start (came early) */
  early?: number
  /** worked minutes so far / in total */
  worked?: number
  /** why the employee did not come (status 'absent') */
  reason?: Reason
  /** still at work right now */
  now?: boolean
}
export interface ScanEvent {
  id: string
  employee: Employee
  kind: 'in' | 'out'
  time: string
  confidence?: number
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
export const SHIFT_HOURS: Record<Shift, string> = { day: '08:00–20:00', night: '20:00–08:00' }
/** the moment "today" is simulated at, in hours */
export const NOW_H = 13.33
export const NOW_LABEL = '13:20'
/** the clock shown next to "as of": the real time when live, the simulated one for the sample */
export const nowLabel = (): string => (LIVE.on ? new Date(Date.now() + 5 * 3_600_000).toISOString().slice(11, 16) : NOW_LABEL)

const BRANCH_NAMES = ['Нурсух', 'ДП-ГМС Кукон', 'DP-GMS КУВА', 'Маргулон', 'DP-GMS BESHARIQ', 'IDEAL GAZ GROUP', 'Намуна']
const BRANCH_SIZES = [14, 13, 11, 12, 10, 11, 9]
/** only the first three terminals report in the sample */
export const BRANCHES: Branch[] = BRANCH_NAMES.map((name, id) => ({
  id,
  name,
  terminal: { id: `T-${id + 1}`, name: `Terminal ${id + 1}`, online: id < 3, lastSeenMin: id < 3 ? undefined : 140 + id * 25 },
}))

const FIRST = ['Dilnoza', 'Ikromjon', 'Oybek', 'Ruzmatjon', 'Marhaboxon', 'Rahmatxon', 'Hasan', 'Samadjon', 'Ixtiyor', 'Murodjon', 'Aziz', 'Javlon', 'Zuhriddin', 'Dilshod', 'Ugilxon', 'Bekzod', 'Sardor', 'Otabek', 'Nargiza', 'Malika', 'Jasur', 'Bobur', 'Laylo', 'Zarina', 'Shahzod', 'Madina', 'Kamola', 'Feruza', 'Timur', 'Gulnora', 'Islom', 'Mohira', 'Sanjar', 'Ruxshona', 'Anvar', 'Sevara', 'Behzod', 'Lola', 'Rustam', 'Doniyor']
const LAST = ['Karimov', 'Isakov', 'Soliјonov', 'Xolmatov', 'Xodjayev', 'Haydarov', 'Churayev', 'Hakimov', 'Yuldashev', 'Jurayev', 'Toshmatov', 'Abdullayev', 'Ergashev', 'Nazarov', 'Rustamov', 'Mirzayev', 'Qodirov', 'Aliyev', 'Sobirov', 'Ismoilov'].map((x) => x.replace('ј', 'j'))
const POSITIONS = ['Kassir', 'Operator', "Gaz to'ldiruvchi", 'Mashinist', 'Qorovul', 'Smena rahbari', 'Oshpaz', 'Tozalovchi']

function rnd(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  h ^= h >>> 15
  h = Math.imul(h, 2246822519)
  h ^= h >>> 13
  return ((h >>> 0) % 10_000) / 10_000
}

export const EMPLOYEES: Employee[] = (() => {
  const out: Employee[] = []
  let n = 0
  BRANCH_SIZES.forEach((size, branch) => {
    for (let k = 0; k < size; k++, n++) {
      const id = `e${n + 1}`
      out.push({
        id,
        name: `${FIRST[(n * 7 + 3) % FIRST.length]} ${LAST[(n * 11 + 5 + Math.floor(n / 40) * 7) % LAST.length]}`,
        position: k === 0 ? 'Filial mas\'uli' : POSITIONS[(n + k) % POSITIONS.length],
        branch,
        shift: rnd(`${id}|shift`) < 0.14 ? 'night' : 'day',
      })
    }
  })
  return out
})()
export const employeeById = (id: string) => EMPLOYEES.find((e) => e.id === id)

// ---------- live store (TimeFace) ----------
export const LIVE = {
  on: false,
  /** `${employeeId}|${date}` → that day */
  rec: new Map<string, DayRecord>(),
  /** keys filled from the full "day" call (knows now / pending) — a later range must not overwrite them */
  full: new Set<string>(),
  events: new Map<string, ScanEvent[]>(),
  branchIdx: new Map<string, number>(),
}

export function applyBase(branches: ApiBranch[], employees: ApiEmployee[]): void {
  LIVE.on = true
  LIVE.branchIdx = new Map(branches.map((b, i) => [b.id, i]))
  BRANCHES.splice(
    0,
    BRANCHES.length,
    ...branches.map((b, i) => ({ id: i, name: b.name, terminal: { id: b.id, name: `Terminal ${i + 1}`, online: b.online, lastSeenMin: b.online ? undefined : (b.lastSeenMin ?? undefined) } })),
  )
  EMPLOYEES.splice(
    0,
    EMPLOYEES.length,
    ...employees
      .filter((e) => LIVE.branchIdx.has(e.branchId))
      .map((e) => ({ id: e.id, name: e.name, position: e.position, branch: LIVE.branchIdx.get(e.branchId)!, shift: e.shift }) as Employee)
      .sort((a, b) => a.branch - b.branch || a.name.localeCompare(b.name)),
  )
}

export function applyRecords(records: ApiRecord[], notes: Record<string, ApiNote>, full: boolean): void {
  const byId = new Map(EMPLOYEES.map((e) => [e.id, e]))
  for (const r of records) {
    const employee = byId.get(r.employeeId)
    if (!employee) continue
    const key = `${r.employeeId}|${r.date}`
    if (!full && LIVE.full.has(key)) continue
    const reason = r.status === 'absent' ? (notes[key]?.reason as Reason | null | undefined) ?? undefined : undefined
    LIVE.rec.set(key, { employee, status: r.status, in: r.in, out: r.out, late: r.late, early: r.early, worked: r.worked, now: r.now, reason })
    if (full) LIVE.full.add(key)
  }
}

export function applyEvents(date: string, events: ApiEvent[]): void {
  const byId = new Map(EMPLOYEES.map((e) => [e.id, e]))
  const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  LIVE.events.set(
    date,
    events
      .flatMap((ev) => {
        const employee = byId.get(ev.employeeId)
        const branch = [...LIVE.branchIdx.entries()].find(([uuid]) => uuid === ev.branchId)
        return employee && branch ? [{ id: ev.id, employee, kind: ev.kind, time: ev.time, branch: BRANCHES[branch[1]] } as ScanEvent] : []
      })
      .sort((a, b) => toMinutes(b.time) - toMinutes(a.time)),
  )
}

// ---------- dates (all in Tashkent calendar days, as YYYY-MM-DD) ----------
export const todayStr = (): string => new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10)
export const addDays = (d: string, n: number): string => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
/** 0 = Sunday */
export const dow = (d: string): number => new Date(`${d}T00:00:00Z`).getUTCDay()
export const daysInMonth = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate()

export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))

/** One employee's day. Sundays are rest days; days after "today" have no record. */
export function dayRecord(e: Employee, date: string): DayRecord | null {
  if (LIVE.on) return LIVE.rec.get(`${e.id}|${date}`) ?? null
  const today = todayStr()
  if (date > today) return null
  if (dow(date) === 0) return { employee: e, status: 'off' }
  const isToday = date === today
  // today the offline terminals have reported nothing: nobody from there is known yet
  if (isToday && !BRANCHES[e.branch].terminal.online) return { employee: e, status: 'pending' }
  const r = rnd(`${e.id}|${date}`)
  if (r < 0.08) {
    const w = rnd(`${e.id}|${date}|why`)
    return { employee: e, status: 'absent', reason: w < 0.41 ? 'sick' : w < 0.67 ? 'leave' : w < 0.85 ? 'none' : w < 0.94 ? 'trip' : 'other' }
  }
  // today only: some people work the afternoon shift and have not arrived yet
  if (isToday && rnd(`${e.id}|${date}|s`) < 0.13) return { employee: e, status: 'pending' }
  const late = r > 0.82
  const spread = rnd(`${e.id}|${date}|i`)
  const inMin = late ? 8 * 60 + 6 + Math.floor(Math.pow(rnd(`${e.id}|${date}|l`), 1.6) * 85) : 8 * 60 - 2 - Math.floor(spread * spread * 75)
  // today only: some people have already left (half-day / morning shift)
  const leftEarly = isToday && rnd(`${e.id}|${date}|x`) < 0.2
  const leaveMin = leftEarly ? 11 * 60 + 20 + Math.floor(rnd(`${e.id}|${date}|y`) * 100) : 18 * 60 + Math.floor((rnd(`${e.id}|${date}|o`) - 0.5) * 40)
  // a few past days have no exit scan (forgot to scan out)
  const noOut = !isToday && rnd(`${e.id}|${date}|n`) < 0.012
  const out = (isToday && !leftEarly) || noOut ? undefined : hhmm(leaveMin)
  const end = isToday && !leftEarly ? Math.round(NOW_H * 60) : leaveMin
  return {
    employee: e,
    status: late ? 'late' : 'came',
    in: hhmm(inMin),
    out,
    late: late ? inMin - 8 * 60 : undefined,
    early: !late && inMin < 8 * 60 ? 8 * 60 - inMin : undefined,
    worked: noOut ? undefined : Math.max(0, end - inMin),
    now: isToday && !leftEarly,
  }
}

export const dayRecords = (date: string): DayRecord[] => EMPLOYEES.flatMap((e) => dayRecord(e, date) ?? [])

export const STATUS_ORDER: Record<Status, number> = { late: 0, absent: 1, came: 2, pending: 3, off: 4 }
export const here = (list: DayRecord[]) => list.filter((r) => r.status === 'came' || r.status === 'late').length
export const countOf = (list: DayRecord[], s: Status) => list.filter((r) => r.status === s).length
export const workedLabel = (min?: number) => (min === undefined ? '—' : `${Math.floor(min / 60)} s ${String(min % 60).padStart(2, '0')} d`)

/** Scans of a day, newest first. */
export function scanEvents(date: string): ScanEvent[] {
  if (LIVE.on) return LIVE.events.get(date) ?? []
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

// ---------- notes (reason written by a manager for a late / absent day) ----------
const DEFAULT_NOTE: Partial<Record<Reason, string>> = { sick: "Kasal, rahbarga xabar bergan", leave: 'Ruxsat olgan', trip: 'Xizmat safari' }
export const defaultNote = (r: DayRecord): string => (r.status === 'absent' && r.reason ? DEFAULT_NOTE[r.reason] ?? '' : '')

// ---------- analytics ----------
export interface Analytics {
  attendance: number
  attendanceDelta: number
  avgIn: string
  avgInDelta: number
  lateShare: number
  lateShareDelta: number
  avgWorked: string
  avgWorkedDelta: string
  byHour: { hour: number; n: number }[]
  top: { employee: Employee; pct: number; onTime: number; days: number }[]
  lates7: { dow: number; n: number }[]
  reasons: { reason: Reason; n: number }[]
  frequent: { employee: Employee; n: number }[]
  attention: { terminals: number; noReason: number; repeat: number; noExit: number }
}

interface Agg {
  came: number
  absent: number
  late: number
  inSum: number
  workedSum: number
  workedN: number
}
function aggregate(from: string, to: string): Agg {
  const a: Agg = { came: 0, absent: 0, late: 0, inSum: 0, workedSum: 0, workedN: 0 }
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const r of dayRecords(d)) {
      if (r.status === 'absent') a.absent++
      if (r.status === 'came' || r.status === 'late') {
        a.came++
        if (r.status === 'late') a.late++
        a.inSum += toMin(r.in!)
        if (r.worked !== undefined && !r.now) (a.workedSum += r.worked, a.workedN++)
      }
    }
  }
  return a
}
const hm = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')}`

export function analytics(days: number): Analytics {
  const today = todayStr()
  const from = addDays(today, -(days - 1))
  const cur = aggregate(from, today)
  const prev = aggregate(addDays(from, -days), addDays(from, -1))
  const pct = (a: Agg) => (a.came + a.absent ? (a.came / (a.came + a.absent)) * 100 : 0)
  const share = (a: Agg) => (a.came ? (a.late / a.came) * 100 : 0)
  const avgIn = (a: Agg) => (a.came ? a.inSum / a.came : 0)
  const avgW = (a: Agg) => (a.workedN ? a.workedSum / a.workedN : 0)

  const byHour = Array.from({ length: 14 }, (_, i) => ({ hour: 6 + i, n: 0 }))
  const perEmp = new Map<string, { onTime: number; days: number; late: number }>()
  const reasons = new Map<Reason, number>()
  for (let d = from; d <= today; d = addDays(d, 1)) {
    for (const r of dayRecords(d)) {
      if (r.status === 'off' || r.status === 'pending') continue
      const m = perEmp.get(r.employee.id) ?? { onTime: 0, days: 0, late: 0 }
      m.days++
      if (r.status === 'came') m.onTime++
      if (r.status === 'late') m.late++
      perEmp.set(r.employee.id, m)
      if (r.in) byHour[Math.min(13, Math.max(0, Math.floor(toMin(r.in) / 60) - 6))].n++
      if (r.status === 'absent') reasons.set(r.reason ?? 'none', (reasons.get(r.reason ?? 'none') ?? 0) + 1)
    }
  }
  const emp = (id: string) => employeeById(id)!
  const top = [...perEmp.entries()]
    .map(([id, m]) => ({ employee: emp(id), onTime: m.onTime, days: m.days, pct: Math.round((m.onTime / m.days) * 100) }))
    .sort((x, y) => y.pct - x.pct || y.days - x.days)
    .slice(0, 7)
  const frequent = [...perEmp.entries()]
    .map(([id, m]) => ({ employee: emp(id), n: m.late }))
    .filter((x) => x.n > 0)
    .sort((x, y) => y.n - x.n)
    .slice(0, 5)

  // last 7 days by weekday (Mon..Sun)
  const lates7 = Array.from({ length: 7 }, (_, i) => ({ dow: (i + 1) % 7, n: 0 }))
  const week = { terminals: 0, noReason: 0, repeat: 0, noExit: 0 }
  const lateCount = new Map<string, number>()
  for (let k = 0; k < 7; k++) {
    const d = addDays(today, -k)
    for (const r of dayRecords(d)) {
      if (r.status === 'late') {
        lates7[(dow(d) + 6) % 7].n++
        lateCount.set(r.employee.id, (lateCount.get(r.employee.id) ?? 0) + 1)
      }
    }
  }
  week.terminals = BRANCHES.filter((b) => !b.terminal.online).length
  week.noReason = dayRecords(today).filter((r) => r.status === 'absent' && (!r.reason || r.reason === 'none')).length
  week.repeat = [...lateCount.values()].filter((n) => n >= 3).length
  week.noExit = dayRecords(addDays(today, -1)).filter((r) => r.in && !r.out).length || 0

  return {
    attendance: Math.round(pct(cur)),
    attendanceDelta: Math.round(pct(cur) - pct(prev)),
    avgIn: hhmm(Math.round(avgIn(cur))),
    avgInDelta: Math.round(avgIn(cur) - avgIn(prev)),
    lateShare: Math.round(share(cur)),
    lateShareDelta: Math.round(share(cur) - share(prev)),
    avgWorked: hm(avgW(cur)),
    avgWorkedDelta: (avgW(cur) - avgW(prev) >= 0 ? '+' : '−') + hm(Math.abs(avgW(cur) - avgW(prev))),
    byHour: byHour.map((h) => ({ ...h, n: Math.round(h.n / days) })),
    top,
    lates7,
    reasons: [...reasons.entries()].map(([reason, n]) => ({ reason, n })).sort((x, y) => y.n - x.n),
    frequent,
    attention: week,
  }
}
