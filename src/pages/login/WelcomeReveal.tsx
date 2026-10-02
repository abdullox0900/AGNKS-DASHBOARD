import { useEffect, useState } from 'react'
import { useI18n } from '@/app/providers/I18nProvider'

const at = (delay: number, extra?: Record<string, string>) => ({ '--delay': `${delay}s`, ...extra }) as React.CSSProperties

/** Full-screen "you're in" moment: a round reveal grows out of the button, a check draws itself, gas-blue waves ripple out. */
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
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(45% 40% at 50% 46%, rgba(34,211,238,0.18), transparent 70%), radial-gradient(40% 30% at 50% 100%, rgba(163,230,53,0.10), transparent 70%)' }}
      />

      <div className="relative flex h-28 w-28 items-center justify-center">
        {[0, 0.8, 1.6].map((d) => (
          <span key={d} className="login-wave absolute inset-0 rounded-full border border-[#22d3ee]/50" style={at(0.7 + d)} />
        ))}
        <svg viewBox="0 0 112 112" className="relative h-28 w-28" fill="none" aria-hidden>
          <circle cx="56" cy="56" r="44" stroke="#22d3ee" strokeOpacity="0.16" strokeWidth="3" />
          <circle
            cx="56"
            cy="56"
            r="44"
            stroke="#67e8f9"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={1}
            transform="rotate(-90 56 56)"
            className="login-draw"
            style={at(0.45, { '--dur': '0.9s' })}
          />
          <path
            d="M37 58l13 13 25-28"
            stroke="#a3e635"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="login-draw"
            style={at(1.1, { '--dur': '0.55s' })}
          />
        </svg>
      </div>

      <h2 className="login-rise relative mt-9 max-w-[88vw] truncate text-center text-[24px] font-semibold tracking-tight" style={at(1.0)}>
        {t('login.welcome_back', { name })}
      </h2>
      <p className="login-rise relative mt-2 text-[13.5px] text-white/55" style={at(1.15)}>
        {t('login.loading')}
      </p>
      <div className="login-rise relative mt-6 h-[3px] w-44 overflow-hidden rounded-full bg-white/10" style={at(1.2)}>
        <div className="login-bar h-full rounded-full bg-gradient-to-r from-[#22d3ee] to-[#a3e635]" style={at(1.2, { '--dur': '1.05s' })} />
      </div>
    </div>
  )
}
