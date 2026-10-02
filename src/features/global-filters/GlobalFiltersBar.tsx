import { Calendar, ChevronDown, MapPin } from 'lucide-react'
import { useGlobalFilters } from './useGlobalFilters'
import { useAuthStore } from '@/shared/config/authStore'
import { useStations } from '@/shared/api/hooks'
import { PERIOD_KEYS, formatDateInput, formatDateShort, parseDateInput, type PeriodPreset } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/cn'
import { useI18n } from '@/app/providers/I18nProvider'
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  PopoverClose,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '@/shared/ui/Menu'

const PRESET_ORDER: PeriodPreset[] = ['today', 'yesterday', '7d', '30d', 'this_month', 'last_month']

const triggerClass =
  'flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-ink-secondary)] outline-none transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] focus-visible:border-[var(--color-primary)] data-[state=open]:border-[var(--color-primary)]'

export function GlobalFiltersBar() {
  const { t } = useI18n()
  const { filters, setStations, setPreset, setCustomRange } = useGlobalFilters()
  const role = useAuthStore((s) => s.role)
  const stationName = useAuthStore((s) => s.stationName)
  const { data: stations } = useStations()

  const stationLabel =
    role === 'branch_manager'
      ? stationName ?? ''
      : !filters.stationIds || filters.stationIds.length === 0
        ? t('filters.all_stations')
        : filters.stationIds.length === 1
          ? stations?.find((s) => s.id === filters.stationIds![0])?.name ?? t('filters.one_station')
          : t('filters.n_stations', { n: filters.stationIds.length })

  return (
    <div className="flex items-center gap-2">
      {role === 'branch_manager' ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] text-[var(--color-ink-secondary)]">
          <MapPin size={14} /> {stationLabel}
        </div>
      ) : (
        <Menu>
          <MenuTrigger className={triggerClass}>
            <MapPin size={14} className="text-[var(--color-ink-tertiary)]" />
            {stationLabel}
            <ChevronDown size={13} />
          </MenuTrigger>
          <MenuContent className="w-64">
            <MenuItem
              onSelect={() => setStations(null)}
              className={cn(!filters.stationIds && 'font-semibold text-[var(--color-primary)]')}
            >
              {t('filters.all_stations')}
            </MenuItem>
            <MenuSeparator />
            {stations?.map((s) => (
              <MenuCheckboxItem
                key={s.id}
                checked={filters.stationIds?.includes(s.id) ?? false}
                onCheckedChange={(checked) => {
                  const current = filters.stationIds ?? []
                  const next = checked ? [...current, s.id] : current.filter((id) => id !== s.id)
                  setStations(next.length > 0 ? next : null)
                }}
              >
                {s.name}
              </MenuCheckboxItem>
            ))}
          </MenuContent>
        </Menu>
      )}

      <PopoverRoot>
        <PopoverTrigger className={triggerClass}>
          <Calendar size={14} className="text-[var(--color-ink-tertiary)]" />
          {filters.preset === 'custom' ? `${formatDateShort(filters.from)} — ${formatDateShort(filters.to)}` : t(PERIOD_KEYS[filters.preset])}
          <ChevronDown size={13} />
        </PopoverTrigger>
        <PopoverContent className="w-60">
          {PRESET_ORDER.map((p) => (
            <PopoverClose
              key={p}
              onClick={() => setPreset(p)}
              className={cn(
                'flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] outline-none hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)]',
                filters.preset === p && 'font-semibold text-[var(--color-primary)]',
              )}
            >
              {t(PERIOD_KEYS[p])}
            </PopoverClose>
          ))}
          <div className="my-1 h-px bg-[var(--color-border)]" />
          <div className="px-2.5 py-1.5">
            <p className="mb-1.5 text-[12px] text-[var(--color-ink-tertiary)]">{t('period.custom')}</p>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                defaultValue={formatDateInput(filters.from)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[12px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
                onChange={(e) => {
                  if (e.target.value) setCustomRange(parseDateInput(e.target.value), filters.to)
                }}
              />
              <span className="text-[var(--color-ink-tertiary)]">—</span>
              <input
                type="date"
                defaultValue={formatDateInput(filters.to)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[12px] text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
                onChange={(e) => {
                  if (e.target.value) setCustomRange(filters.from, parseDateInput(e.target.value))
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </PopoverRoot>
    </div>
  )
}
