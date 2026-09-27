/** Uzbek phone numbers: fixed +998 country code + 9 local digits ("90 043 11 60"). */

/** Keeps only the 9 local digits of whatever was typed or pasted (drops a leading 998). */
export function toLocalDigits(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.length > 9 && digits.startsWith('998')) digits = digits.slice(3)
  return digits.slice(0, 9)
}

/** "900431160" → "90 043 11 60" (partial input is formatted as far as it goes). */
export function formatLocal(digits: string): string {
  const d = toLocalDigits(digits)
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')
}

/** Any stored/entered phone → "+998 90 043 11 60" for display. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const d = toLocalDigits(phone)
  return d.length === 9 ? `+998 ${formatLocal(d)}` : phone
}

/** 9 local digits → "+998900431160" as the API expects. */
export function toE164(digits: string): string {
  return `+998${toLocalDigits(digits)}`
}

export function isCompletePhone(digits: string): boolean {
  return toLocalDigits(digits).length === 9
}
