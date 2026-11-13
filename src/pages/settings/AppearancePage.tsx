import { useState } from 'react'
import { Check, Monitor, Moon, RotateCcw, Sun } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { RADIUS_SCALE, useUiStore, type ModeColors, type RadiusPref, type ResolvedTheme, type ThemePref } from '@/shared/config/uiStore'
import { useResolvedTheme } from '@/shared/lib/useTheme'
import { luminance, parseHex } from '@/shared/lib/color'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import type { DictKey } from '@/shared/config/dictionaries'

const THEMES: { value: ThemePref; label: DictKey; icon: typeof Sun }[] = [
  { value: 'dark', label: 'theme.dark', icon: Moon },
  { value: 'light', label: 'theme.light', icon: Sun },
  { value: 'auto', label: 'theme.auto', icon: Monitor },
]

/** `hex: null` = the default cyan of the dashboard. */
const PRESETS: { id: string; label: DictKey; hex: string | null; shown: string }[] = [
  { id: 'cyan', label: 'settings.c_cyan', hex: null, shown: '#22d3ee' },
  { id: 'blue', label: 'settings.c_blue', hex: '#3b82f6', shown: '#3b82f6' },
  { id: 'teal', label: 'settings.c_teal', hex: '#14b8a6', shown: '#14b8a6' },
  { id: 'green', label: 'settings.c_green', hex: '#22c55e', shown: '#22c55e' },
  { id: 'amber', label: 'settings.c_amber', hex: '#f59e0b', shown: '#f59e0b' },
  { id: 'orange', label: 'settings.c_orange', hex: '#f97316', shown: '#f97316' },
  { id: 'red', label: 'settings.c_red', hex: '#ef4444', shown: '#ef4444' },
]

/** Built-in colours and ready choices for the page background and the panels, per mode. */
const SURFACE_CHOICES: Record<ResolvedTheme, Record<keyof ModeColors, { builtin: string; presets: string[] }>> = {
  dark: {
    bg: { builtin: '#0a0f16', presets: ['#000000', '#0f172a', '#18181b', '#0c1a2b', '#0f1a14', '#1c1917'] },
    surface: { builtin: '#101823', presets: ['#0b1220', '#111827', '#1a2332', '#1c1c20', '#171717', '#1b2a22'] },
  },
  light: {
    bg: { builtin: '#f3f6f9', presets: ['#ffffff', '#f8fafc', '#f5f5f4', '#eff6ff', '#f0fdf4', '#fffbeb'] },
    surface: { builtin: '#ffffff', presets: ['#fafafa', '#f8fafc', '#f1f5f9', '#fefce8', '#ecfdf5', '#fdf2f8'] },
  },
}

const RADII: { value: RadiusPref; label: DictKey }[] = [
  { value: 'none', label: 'settings.r_none' },
  { value: 'sm', label: 'settings.r_sm' },
  { value: 'md', label: 'settings.r_md' },
  { value: 'lg', label: 'settings.r_lg' },
]

function Swatch({ color, selected, label, onClick }: { color: string; selected: boolean; label: string; onClick: () => void }) {
  const rgb = parseHex(color)
  const mark = rgb && luminance(rgb) > 0.45 ? 'text-black/70' : 'text-white/85'
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105',
        selected ? 'border-[var(--color-ink)]' : 'border-[var(--color-border-strong)]',
      )}
      style={{ background: color }}
    >
      {selected && <Check size={16} className={mark} strokeWidth={3} />}
    </button>
  )
}

/** One colour setting (page background / panels) for the mode on screen: the built-in colour, ready choices, any colour. */
function ColorRow({ value, builtin, presets, onChange, customLabel }: { value: string | null; builtin: string; presets: string[]; onChange: (hex: string | null) => void; customLabel: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const isCustom = value !== null && !presets.includes(value)
  const commit = (v: string) => {
    const h = v.startsWith('#') ? v : `#${v}`
    if (parseHex(h)) onChange(h.toLowerCase())
    setDraft(null)
  }
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Swatch color={builtin} selected={value === null} label="Standart" onClick={() => onChange(null)} />
      <span className="mx-0.5 h-6 w-px bg-[var(--color-border)]" />
      {presets.map((c) => (
        <Swatch key={c} color={c} selected={value === c} label={c} onClick={() => onChange(c)} />
      ))}
      <span className="mx-0.5 h-6 w-px bg-[var(--color-border)]" />
      <label
        className={cn(
          'flex h-9 cursor-pointer items-center gap-2 rounded-full border-2 px-1.5 pr-3 text-[12.5px] font-medium text-[var(--color-ink-secondary)] transition-colors',
          isCustom ? 'border-[var(--color-ink)]' : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
        )}
      >
        <input type="color" value={value ?? builtin} onChange={(e) => onChange(e.target.value.toLowerCase())} className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label={customLabel} />
        {customLabel}
      </label>
      <input
        value={draft ?? (value ?? '')}
        onChange={(e) => setDraft(e.target.value.replace(/[^#0-9a-fA-F]/g, '').slice(0, 7))}
        onBlur={() => draft !== null && commit(draft)}
        onKeyDown={(e) => e.key === 'Enter' && draft !== null && commit(draft)}
        placeholder={builtin}
        spellCheck={false}
        className="h-9 w-[104px] rounded-lg border border-[var(--color-border)] bg-transparent px-2.5 font-mono text-[12.5px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
        aria-label="HEX"
      />
    </div>
  )
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid items-center gap-3 border-b border-[var(--color-border)] py-5 last:border-b-0 lg:grid-cols-[180px_1fr] lg:gap-8">
      <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{title}</h3>
      <div>{children}</div>
    </section>
  )
}

/**
 * Sozlamalar → Ko'rinish: how the dashboard looks for the person using it. A personal preference kept in this browser
 * (each employee picks their own); it applies at once, no save button. Kept almost wordless on purpose.
 */
export function AppearancePage() {
  const { t } = useI18n()
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const accent = useUiStore((s) => s.accent)
  const setAccent = useUiStore((s) => s.setAccent)
  const radius = useUiStore((s) => s.radius)
  const setRadius = useUiStore((s) => s.setRadius)
  const reset = useUiStore((s) => s.resetAppearance)
  const colors = useUiStore((s) => s.colors)
  const setSurfaceColor = useUiStore((s) => s.setSurfaceColor)
  const mode = useResolvedTheme()
  const own = colors[mode]
  const choices = SURFACE_CHOICES[mode]
  const ModeIcon = mode === 'dark' ? Moon : Sun
  const [hexDraft, setHexDraft] = useState<string | null>(null)

  const isPreset = (hex: string | null) => (accent ?? null) === hex
  const isCustom = !PRESETS.some((p) => isPreset(p.hex))
  const dirty = accent !== null || radius !== 'md' || Object.values(colors).some((c) => c.bg || c.surface)

  function commitHex(value: string) {
    const v = value.startsWith('#') ? value : `#${value}`
    if (parseHex(v)) setAccent(v.toLowerCase())
    setHexDraft(null)
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="mt-1 text-[26px] font-bold tracking-tight text-[var(--color-ink)]">{t('settings.appearance')}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} disabled={!dirty}>
          <RotateCcw size={14} /> {t('settings.reset')}
        </Button>
      </div>

      <div className="mt-4 border-t border-[var(--color-border)]">
        <Section title={t('settings.mode')}>
          <div className="inline-flex gap-1 rounded-xl border border-[var(--color-border)] p-1">
            {THEMES.map((th) => (
              <button
                key={th.value}
                type="button"
                onClick={() => setTheme(th.value)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
                  theme === th.value ? 'bg-[var(--color-primary)] text-[var(--color-primary-ink)]' : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]',
                )}
              >
                <th.icon size={15} /> {t(th.label)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('settings.accent')}>
          <div className="flex flex-wrap items-center gap-2.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={t(p.label)}
                aria-label={t(p.label)}
                aria-pressed={isPreset(p.hex)}
                onClick={() => setAccent(p.hex)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105',
                  isPreset(p.hex) ? 'border-[var(--color-ink)]' : 'border-transparent',
                )}
                style={{ background: p.shown }}
              >
                {isPreset(p.hex) && <Check size={16} className="text-black/70" strokeWidth={3} />}
              </button>
            ))}
            <span className="mx-1 h-6 w-px bg-[var(--color-border)]" />
            <label
              className={cn(
                'flex h-9 cursor-pointer items-center gap-2 rounded-full border-2 px-1.5 pr-3 text-[12.5px] font-medium text-[var(--color-ink-secondary)] transition-colors',
                isCustom ? 'border-[var(--color-ink)]' : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
              )}
            >
              <input
                type="color"
                value={accent ?? '#22d3ee'}
                onChange={(e) => setAccent(e.target.value.toLowerCase())}
                className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                aria-label={t('settings.c_custom')}
              />
              {t('settings.c_custom')}
            </label>
            <input
              value={hexDraft ?? (accent ?? '')}
              onChange={(e) => setHexDraft(e.target.value.replace(/[^#0-9a-fA-F]/g, '').slice(0, 7))}
              onBlur={() => hexDraft !== null && commitHex(hexDraft)}
              onKeyDown={(e) => e.key === 'Enter' && hexDraft !== null && commitHex(hexDraft)}
              placeholder="#22d3ee"
              spellCheck={false}
              className="h-9 w-[104px] rounded-lg border border-[var(--color-border)] bg-transparent px-2.5 font-mono text-[12.5px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
              aria-label="HEX"
            />
          </div>
        </Section>

        <Section
          title={
            <span className="flex items-center gap-2">
              {t('settings.bg')} <ModeIcon size={14} className="text-[var(--color-ink-tertiary)]" />
            </span>
          }
        >
          <ColorRow value={own.bg} builtin={choices.bg.builtin} presets={choices.bg.presets} onChange={(hex) => setSurfaceColor(mode, 'bg', hex)} customLabel={t('settings.c_custom')} />
        </Section>

        <Section
          title={
            <span className="flex items-center gap-2">
              {t('settings.surface')} <ModeIcon size={14} className="text-[var(--color-ink-tertiary)]" />
            </span>
          }
        >
          <ColorRow value={own.surface} builtin={choices.surface.builtin} presets={choices.surface.presets} onChange={(hex) => setSurfaceColor(mode, 'surface', hex)} customLabel={t('settings.c_custom')} />
        </Section>

        <Section title={t('settings.radius')}>
          <div className="grid max-w-md grid-cols-4 gap-2.5">
            {RADII.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRadius(r.value)}
                aria-pressed={radius === r.value}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-[12px] font-medium transition-colors',
                  radius === r.value ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-ink)]' : 'border-[var(--color-border)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-alt)]',
                )}
              >
                {/* a corner drawn with the very radius it stands for */}
                <span
                  className="h-9 w-9 border-l-2 border-t-2 border-[var(--color-primary)]"
                  style={{ borderTopLeftRadius: `${RADIUS_SCALE[r.value] * 16}px` }}
                />
                {t(r.label)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('settings.preview')}>
          <Card className="max-w-xl space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button>{t('settings.p_primary')}</Button>
              <Button variant="secondary">{t('settings.p_secondary')}</Button>
              <Button variant="ghost">{t('settings.p_ghost')}</Button>
              <Button variant="danger" size="sm">
                {t('settings.p_danger')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{t('settings.p_badge')}</Badge>
              <Badge tone="success">{t('common.active')}</Badge>
              <Badge tone="warning">{t('feedback.status.open')}</Badge>
              <Badge tone="danger">{t('common.blocked')}</Badge>
            </div>
            <input
              readOnly
              value={t('settings.p_input')}
              className="h-10 w-full max-w-xs rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
            />
          </Card>
        </Section>
      </div>
    </div>
  )
}
