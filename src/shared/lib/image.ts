/** Largest picture we accept from the file picker (before shrinking). */
export const MAX_PICKED_BYTES = 10 * 1024 * 1024
/** The server stores at most 80 000 characters of data URL. Stay well below it. */
const MAX_DATA_URL_CHARS = 60_000

/**
 * Turns a picked photo into a small square avatar: center-cropped, scaled to `size`×`size`, JPEG.
 * Quality is lowered until it fits the server limit (a 192 px photo is normally 10–25 KB).
 */
export async function fileToAvatarDataUrl(file: File, size = 192): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('not_image')
  if (file.size > MAX_PICKED_BYTES) throw new Error('too_big')

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) throw new Error('unreadable')
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('unreadable')
  ctx.fillStyle = '#ffffff' // JPEG has no transparency
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()

  for (const quality of [0.86, 0.74, 0.6, 0.45]) {
    const url = canvas.toDataURL('image/jpeg', quality)
    if (url.length <= MAX_DATA_URL_CHARS) return url
  }
  throw new Error('too_big')
}
