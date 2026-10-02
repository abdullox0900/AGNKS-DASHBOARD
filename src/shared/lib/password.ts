const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Random password without look-alike characters (0/O, 1/l/I), drawn from the browser CSPRNG. */
export function generatePassword(length = 10, digitsOnly = false): string {
  const alphabet = digitsOnly ? '0123456789' : ALPHABET
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}
