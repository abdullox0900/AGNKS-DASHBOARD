/** Stations without coordinates are stored as 0,0 (the API defaults) — treat that as "not set". */
export function hasCoords(s: { lat: number; lng: number }): boolean {
  return !(s.lat === 0 && s.lng === 0)
}

export function parseCoord(input: string, min: number, max: number): number | null {
  const n = Number(input.trim().replace(',', '.'))
  return input.trim() !== '' && Number.isFinite(n) && n >= min && n <= max ? n : null
}

/** "41.311081, 69.240562" (as copied from a map app) → [lat, lng]. */
export function splitPastedPair(text: string): [string, string] | null {
  const m = /^\s*(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)\s*$/.exec(text)
  return m ? [m[1].replace(',', '.'), m[2].replace(',', '.')] : null
}

export const mapUrl = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`
