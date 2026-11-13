import { useState } from 'react'

const API_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_API_BASE_URL as string).origin
  } catch {
    return ''
  }
})()

/**
 * A client's Telegram picture (served by our API from a signed path, cached for a day) or, without one, the initial.
 * `loading="lazy"` + a tiny 160 px file keep long lists fast.
 */
export function ClientAvatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  if (src && !failed) {
    return (
      <img
        src={src.startsWith('http') ? src : `${API_ORIGIN}${src}`}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full bg-[var(--color-surface-alt)] object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-alt)] font-semibold text-[var(--color-ink-secondary)]" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initial}
    </span>
  )
}
