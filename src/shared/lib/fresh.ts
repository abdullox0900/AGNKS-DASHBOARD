/** How long a new section / page / feature keeps its "Yangi" badge. */
export const NEW_BADGE_DAYS = 3

/**
 * True while `since` (a release date, "YYYY-MM-DD", local time) is less than NEW_BADGE_DAYS old.
 * Release on the 12th → shown on the 12th, 13th and 14th, gone from the 15th at 00:00 — no deploy needed to hide it.
 */
export function isFresh(since: string, now: number): boolean {
  const start = new Date(`${since}T00:00:00`).getTime()
  if (Number.isNaN(start)) return false
  return now >= start && now < start + NEW_BADGE_DAYS * 24 * 60 * 60 * 1000
}
