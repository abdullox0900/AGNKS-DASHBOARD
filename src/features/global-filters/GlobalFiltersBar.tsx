import { useState } from 'react'
import { Calendar, ChevronDown, MapPin } from 'lucide-react'
import { useGlobalFilters } from './useGlobalFilters'
import { useAuthStore } from '@/shared/config/authStore'
import { useStations } from '@/shared/api/hooks'
import { PERIOD_LABELS, formatDateInput, formatDateShort, parseDateInput, type PeriodPreset } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/cn'

const PRESET_ORDER: PeriodPreset[] = ['today', 'yesterday', '7d', '30d', 'this_month', 'last_month', 'custom']

export function GlobalFiltersBar() {
  const { filters, setStations, setPreset, setCustomRange } = useGlobalFilters()
  const role = useAuthStore((s) => s.role)
  const stationName = useAuthStore((s) => s.stationName)
  const { data: stations } = useStations()
  const [stationMenuOpen, setStationMenuOpen] = useState(false)
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false)

  const stationLabel =
    role === 'branch_manager'
      ? stationName ?? ''
      : !filters.stationIds || filters.stationIds.length === 0
        ? 'Barcha filiallar'
        : filters.stationIds.length === 1
          ? stations?.find((s) => s.id === filters.stationIds![0])?.name ?? '1 filial'
          : `${filters.stationIds.length} ta filial`

  return (
    <div className="flex items-center gap-2">
      {role === 'branch_manager' ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] text-[var(--color-ink-secondary)]">
          <MapPin size={14} /> {stationLabel}
        </div>
      ) : (
        <div className="relative">
          <button
            onClick={() => setStationMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]"
          >
            <MapPin size={14} className="text-[var(--color-ink-tertiary)]" />
            {stationLabel}
            <ChevronDown size={13} />
          </button>
          {stationMenuOpen && (
            <div
              className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
              style={{ boxShadow: 'var(--shadow-popover)' }}
            >
              <button
                onClick={() => {
                  setStations(null)
                  setStationMenuOpen(false)
                }}
                className={cn(
                  'flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[var(--color-surface-alt)]',
                  !filters.stationIds && 'font-semibold text-[var(--color-primary)]',
                )}
              >
                Barcha filiallar
              </button>
              <div className="my-1 h-px bg-[var(--color-border)]" />
              {stations?.map((s) => {
                const checked = filters.stationIds?.includes(s.id) ?? false
                return (
                  <label key={s.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] hover:bg-[var(--color-surface-alt)]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const current = filters.stationIds ?? []
                        const next = e.target.checked ? [...current, s.id] : current.filter((id) => id !== s.id)
                        setStations(next.length > 0 ? next : null)
                      }}
                    />
                    {s.name}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => setPeriodMenuOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]"
        >
          <Calendar size={14} className="text-[var(--color-ink-tertiary)]" />
          {filters.preset === 'custom' ? `${formatDateShort(filters.from)} — ${formatDateShort(filters.to)}` : PERIOD_LABELS[filters.preset]}
          <ChevronDown size={13} />
        </button>
        {periodMenuOpen && (
          <div
            className="absolute left-0 top-full z-30 mt-1 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
            style={{ boxShadow: 'var(--shadow-popover)' }}
          >
            {PRESET_ORDER.filter((p) => p !== 'custom').map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPreset(p)
                  setPeriodMenuOpen(false)
                }}
                className={cn(
                  'flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[var(--color-surface-alt)]',
                  filters.preset === p && 'font-semibold text-[var(--color-primary)]',
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
            <div className="my-1 h-px bg-[var(--color-border)]" />
            <div className="px-2.5 py-1.5">
              <p className="mb-1.5 text-[12px] text-[var(--color-ink-tertiary)]">Ixtiyoriy oraliq</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  defaultValue={formatDateInput(filters.from)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1 text-[12px]"
                  onChange={(e) => {
                    if (e.target.value) setCustomRange(parseDateInput(e.target.value), filters.to)
                  }}
                />
                <span className="text-[var(--color-ink-tertiary)]">—</span>
                <input
                  type="date"
                  defaultValue={formatDateInput(filters.to)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1 text-[12px]"
                  onChange={(e) => {
                    if (e.target.value) setCustomRange(filters.from, parseDateInput(e.target.value))
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
