import { useEffect, useState } from 'react'
import { useI18n } from '@/app/providers/I18nProvider'

const at = (delay: number, extra?: Record<string, string>) => ({ '--delay': `${delay}s`, ...extra }) as React.CSSProperties

/**
 * Full-screen "you're in" moment, kept minimal: a round reveal grows out of the button, a thin line circles while the
 * panel loads and a check draws itself inside it, then the greeting.
 */
export function WelcomeReveal({ name, x, y }: { name: string; x: number; y: number }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setOpen(true), 40)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      data-open={open}
      className="login-reveal fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#04101a] text-white"
      style={{ '--x': `${x}px`, '--y': `${y}px` } as React.CSSProperties}
    >
      <svg viewBox="0 0 112 112" className="h-24 w-24" fill="none" aria-hidden>
        <circle cx="56" cy="56" r="46" stroke="#22d3ee" strokeOpacity="0.14" strokeWidth="1.5" />
        <g className="stroke-spin">
          <circle cx="56" cy="56" r="46" stroke="#67e8f9" strokeWidth="1.5" strokeLinecap="round" pathLength={1} className="stroke-chase" />
        </g>
        <path
          d="M40 58l11 11 22-24"
          stroke="#a3e635"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="login-draw"
          style={at(1.0, { '--dur': '0.5s' })}
        />
      </svg>

      <h2 className="login-rise mt-8 max-w-[88vw] truncate text-center text-[22px] font-semibold tracking-tight" style={at(0.9)}>
        {t('login.welcome_back', { name })}
      </h2>
      <p className="login-rise mt-1.5 text-[13px] text-white/45" style={at(1.05)}>
        {t('login.loading')}
      </p>
    </div>
  )
}
