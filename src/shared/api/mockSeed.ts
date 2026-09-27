// Deterministic pseudo-random generator so the mocked dataset (and its charts)
// look the same across reloads instead of jumping around every refresh.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260922)

export function rnd(): number {
  return rand()
}

export function rndInt(min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min
}

export function pick<T>(arr: readonly T[]): T {
  return arr[rndInt(0, arr.length - 1)]
}

export const STATIONS = [
  { id: 'st-1', name: 'AGNKS №1 — Paxtakor', address: "Toshkent, Chilonzor tumani, Bunyodkor shoh ko'chasi 12", lat: 41.2856, lng: 69.2034, radiusM: 300 },
  { id: 'st-2', name: 'AGNKS №2 — Sergili', address: "Toshkent, Sergili tumani, Qatortol ko'chasi 45", lat: 41.2276, lng: 69.2044, radiusM: 300 },
  { id: 'st-3', name: "AGNKS №3 — Mirzo Ulug'bek", address: "Toshkent, Mirzo Ulug'bek tumani, Buyuk Ipak Yo'li", lat: 41.3383, lng: 69.3275, radiusM: 250 },
  { id: 'st-4', name: 'AGNKS №4 — Chilonzor', address: "Toshkent, Chilonzor tumani, Bunyodkor shoh ko'chasi 3", lat: 41.2799, lng: 69.2069, radiusM: 300 },
]

export const FIRST_NAMES = ['Aziz', 'Sardor', 'Dilshod', 'Bekzod', 'Jasur', 'Otabek', 'Sherzod', 'Farrux', 'Diyor', 'Nodira', 'Malika', 'Kamola']
export const LAST_INITIALS = ['K.', 'R.', 'T.', 'A.', 'M.', 'S.', 'B.', 'N.']

export function randomClientName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_INITIALS)}`
}

export function randomPhone(): string {
  return `+998 ${rndInt(90, 99)} ${rndInt(100, 999)} ${rndInt(10, 99)} ${rndInt(10, 99)}`
}
