/** Small colour helpers for the custom accent colour (Sozlamalar → Ko'rinish). All colours are `[r, g, b]` 0–255. */
export type Rgb = [number, number, number]

export function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function toHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

/** WCAG relative luminance. */
export function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]

/** Moves `color` towards white or black (whichever helps) until it is at least `min` : 1 against `bg`. */
export function ensureContrast(color: Rgb, bg: Rgb, min: number): Rgb {
  const towards = luminance(bg) > 0.5 ? BLACK : WHITE
  let out = color
  for (let i = 0; i < 20 && contrast(out, bg) < min; i++) out = mix(out, towards, 0.08)
  return out
}

/** Text colour that reads best on top of `bg`. */
export function inkOn(bg: Rgb, dark: Rgb = [4, 33, 42], light: Rgb = WHITE): Rgb {
  return contrast(bg, dark) >= contrast(bg, light) ? dark : light
}

export const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
