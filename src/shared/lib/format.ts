export function formatMoneyFull(sum: number): string {
  const sign = sum < 0 ? '−' : ''
  const grouped = Math.round(Math.abs(sum)).toLocaleString('ru-RU').replace(/,/g, ' ')
  return `${sign}${grouped} so'm`
}

/** Abbreviated for KPI cards: 12.4 mln so'm, 1.24 mlrd so'm. Full value belongs in a tooltip/title. */
export function formatMoneyShort(sum: number): string {
  const abs = Math.abs(sum)
  const sign = sum < 0 ? '−' : ''
  if (abs >= 1_000_000_000) return `${sign}${trimZero((abs / 1_000_000_000).toFixed(2))} mlrd so'm`
  if (abs >= 1_000_000) return `${sign}${trimZero((abs / 1_000_000).toFixed(1))} mln so'm`
  return formatMoneyFull(sum)
}

function trimZero(s: string): string {
  return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ')
}

export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}

export function formatCardNumberMasked(phone: string): string {
  // +998 90 123 45 67 -> +998 90 *** ** 67
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 9) return phone
  const last2 = digits.slice(-2)
  const code = digits.slice(0, 5)
  return `+${code.slice(0, 3)} ${code.slice(3, 5)} *** ** ${last2}`
}
