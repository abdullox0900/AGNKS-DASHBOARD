import { useEffect, useState } from 'react'

/**
 * Full-screen moment after login, kept minimal: a round reveal grows out of the button and "CMG" draws itself
 * line by line (and un-draws, on a loop) while the dashboard loads. No text.
 */
export function WelcomeReveal({ x, y }: { x: number; y: number }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setOpen(true), 40)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div
      role="status"
      aria-busy="true"
      data-open={open}
      className="login-reveal fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#04101a]"
      style={{ '--x': `${x}px`, '--y': `${y}px` } as React.CSSProperties}
    >
      <svg viewBox="0 0 116 40" className="cmg-stroke w-28 overflow-visible" fill="none" aria-hidden>
        <path d="M30 11C26 6 20 4 16 4C8 4 2 10 2 20C2 30 8 36 16 36C20 36 26 34 30 29" pathLength={1} />
        <path d="M40 36V4L57 24L74 4V36" pathLength={1} />
        <path d="M114 11C110 6 104 4 100 4C92 4 84 10 84 20C84 30 92 36 100 36C108 36 114 31 114 22V20H100" pathLength={1} />
      </svg>
    </div>
  )
}
