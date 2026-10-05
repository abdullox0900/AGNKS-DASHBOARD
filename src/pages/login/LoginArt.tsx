import { FERGANA_CLIP, FERGANA_DISTRICTS, FERGANA_OUTLINE, FERGANA_ROADS, FERGANA_SIZE, projectFergana } from '@/shared/geo/fergana'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const PAD = 60

/** Network nodes (decorative, mirrors the real stations) with an optional city label. */
const NODES: { lat: number; lng: number; label?: DictKey; side?: 'l' | 'r' | 't' | 'b' }[] = [
  { lat: 40.526944, lng: 70.918444, label: 'login.city_kokand', side: 't' },
  { lat: 40.518083, lng: 72.068306, label: 'login.city_quva', side: 't' },
  { lat: 40.447333, lng: 70.601972, label: 'login.city_beshariq', side: 'b' },
  { lat: 40.343889, lng: 71.768861, label: 'login.city_fergana', side: 'b' },
  { lat: 40.422056, lng: 71.708778, label: 'login.city_margilan', side: 'l' },
  { lat: 40.399806, lng: 70.801833 },
  { lat: 40.369583, lng: 70.77025 },
]

const textAnchor = { l: 'end', r: 'start', t: 'middle', b: 'middle' } as const

/** Right half of the login screen: Farg'ona region drawn as lines, roads that light up, pulsing stations. Always dark. */
export function LoginArt() {
  const { t } = useI18n()
  const w = FERGANA_SIZE.width + PAD * 2
  const h = FERGANA_SIZE.height + PAD * 2

  return (
    <aside className="relative hidden overflow-hidden bg-[#04101a] text-white lg:block" aria-hidden={false}>
      {/* atmosphere: soft glows, dot grid, grain */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 42%, rgba(34,211,238,0.16), transparent 70%), radial-gradient(50% 40% at 85% 100%, rgba(163,230,53,0.10), transparent 70%), radial-gradient(45% 35% at 0% 0%, rgba(56,189,248,0.10), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: 'radial-gradient(rgba(148,200,230,0.22) 1px, transparent 1.2px)',
          backgroundSize: '30px 30px',
          maskImage: 'radial-gradient(70% 55% at 50% 42%, #000 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(70% 55% at 50% 42%, #000 20%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* map */}
      <div className="absolute inset-x-0 top-[22%] px-2 xl:px-4">
        <svg viewBox={`${-PAD} ${-PAD} ${w} ${h}`} className="h-auto w-full overflow-visible" role="img" aria-label={t('login.region')}>
          <defs>
            <linearGradient id="la-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#22d3ee" stopOpacity="0.14" />
              <stop offset="1" stopColor="#22d3ee" stopOpacity="0.02" />
            </linearGradient>
            <clipPath id="la-clip">
              <path d={FERGANA_CLIP} />
            </clipPath>
            <filter id="la-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path d={FERGANA_CLIP} fill="url(#la-fill)" className="login-rise" style={{ '--delay': '0.2s' } as React.CSSProperties} />
          <path d={FERGANA_DISTRICTS} fill="none" stroke="#7dd3fc" strokeOpacity={0.16} strokeWidth={1.4} strokeLinejoin="round" className="login-rise" style={{ '--delay': '0.5s' } as React.CSSProperties} />

          <g clipPath="url(#la-clip)">
            {FERGANA_ROADS.map((r, i) => (
              <g key={i}>
                <path
                  d={r.d}
                  pathLength={1}
                  fill="none"
                  stroke="#22d3ee"
                  strokeOpacity={r.main ? 0.5 : 0.3}
                  strokeWidth={r.main ? 3.4 : 2.2}
                  strokeLinejoin="round"
                  className="login-draw"
                  style={{ '--delay': `${0.8 + i * 0.07}s`, '--dur': '2.4s' } as React.CSSProperties}
                />
                {r.main && (
                  <path
                    d={r.d}
                    pathLength={1}
                    fill="none"
                    stroke="#cffafe"
                    strokeWidth={4.6}
                    strokeLinecap="round"
                    className="login-flow"
                    style={{ '--delay': `${3.6 + (i % 7) * 0.9}s`, '--dur': `${5 + (i % 5) * 1.3}s` } as React.CSSProperties}
                  />
                )}
              </g>
            ))}
          </g>

          <path
            d={FERGANA_OUTLINE}
            pathLength={1}
            fill="none"
            stroke="#67e8f9"
            strokeWidth={3.2}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#la-glow)"
            className="login-draw"
            style={{ '--delay': '0.2s', '--dur': '3.2s' } as React.CSSProperties}
          />

          {NODES.map((n, i) => {
            const { x, y } = projectFergana(n.lat, n.lng)
            const delay = 2.2 + i * 0.18
            const off = n.side === 'l' ? { x: -34, y: 0 } : n.side === 'r' ? { x: 34, y: 0 } : n.side === 't' ? { x: 0, y: -34 } : { x: 0, y: 46 }
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <circle r={13} fill="none" stroke="#a3e635" strokeWidth={2} className="login-ripple" style={{ '--delay': `${delay + 0.6}s` } as React.CSSProperties} />
                <g className="login-pop" style={{ '--delay': `${delay}s` } as React.CSSProperties}>
                  <circle r={17} fill="#04101a" stroke="#a3e635" strokeOpacity={0.55} strokeWidth={2} />
                  <circle r={7.5} fill="#a3e635" />
                </g>
                {n.label && n.side && (
                  <text
                    x={off.x}
                    y={off.y}
                    textAnchor={textAnchor[n.side]}
                    dominantBaseline="middle"
                    fontSize={26}
                    fontWeight={600}
                    fill="#e0f2fe"
                    fillOpacity={0.9}
                    className="login-rise select-none"
                    style={{ '--delay': `${delay + 0.3}s`, paintOrder: 'stroke', stroke: '#04101a', strokeWidth: 6, strokeLinejoin: 'round' } as React.CSSProperties}
                  >
                    {t(n.label)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* copy */}
      <div className="absolute inset-x-10 bottom-12">
        <p className="login-rise font-mono text-[11px] uppercase tracking-[0.22em] text-[#67e8f9]" style={{ '--delay': '0.6s' } as React.CSSProperties}>
          AGNKS · CMG
        </p>
        <h2 className="login-rise mt-3 max-w-[460px] text-[34px] font-bold leading-[1.12] tracking-tight" style={{ '--delay': '0.75s' } as React.CSSProperties}>
          {t('login.art_title')}
        </h2>
        <p className="login-rise mt-3 max-w-[420px] text-[14.5px] leading-relaxed text-white/60" style={{ '--delay': '0.9s' } as React.CSSProperties}>
          {t('login.art_text')}
        </p>
      </div>
    </aside>
  )
}
