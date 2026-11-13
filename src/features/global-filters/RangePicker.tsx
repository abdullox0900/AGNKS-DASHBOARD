import { useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ru, uz } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { PopoverClose } from "@/shared/ui/Menu";
import { useI18n } from "@/app/providers/I18nProvider";

/**
 * "Custom period": a real range calendar (react-day-picker) instead of two native date inputs, which
 * looked different in every browser. Pick two days, then apply.
 */
export function RangePicker({
  from,
  to,
  onApply,
}: {
  from: Date;
  to: Date;
  onApply: (from: Date, to: Date) => void;
}) {
  const { t, locale } = useI18n();
  const [range, setRange] = useState<DateRange | undefined>({ from, to });
  const ready = !!range?.from && !!range?.to;
  return (
    <div className="px-1.5 pb-1.5">
      <p className="px-1 pt-1 text-[12px] text-[var(--color-ink-tertiary)]">
        {t("period.custom")}
      </p>
      <DayPicker
        className="agnks-rdp"
        mode="range"
        selected={range}
        onSelect={setRange}
        defaultMonth={to}
        disabled={{ after: new Date() }}
        weekStartsOn={1}
        locale={locale === "ru" ? ru : uz}
        showOutsideDays
      />
      <PopoverClose
        disabled={!ready}
        onClick={() => ready && onApply(range!.from!, range!.to!)}
        className="mt-1 h-9 w-full rounded-lg bg-[var(--color-primary)] text-[13px] font-semibold text-[var(--color-primary-ink)] disabled:opacity-40"
      >
        {t("period.apply")}
      </PopoverClose>
    </div>
  );
}
