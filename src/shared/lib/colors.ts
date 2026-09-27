/** Blue-derived scale for comparing stations in charts — never used to encode meaning alone (legend always present). */
export const STATION_PALETTE = ['#2563eb', '#60a5fa', '#1d4ed8', '#93c5fd', '#1e40af', '#3b82f6', '#0ea5e9', '#0369a1']

export function stationColor(index: number): string {
  return STATION_PALETTE[index % STATION_PALETTE.length]
}

export const AMBER = '#b45309'
export const SUCCESS = '#15803d'
export const DANGER = '#dc2626'
export const NEUTRAL = '#9096a3'
