import { useEffect, useState } from "react";
import useSWR from "swr";
import { ChevronRight, Plus } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Drawer } from "@/shared/ui/Drawer";
import { useToast } from "@/shared/ui/Toast";
import {
  useBonusSettings,
  usePromotions,
  useStations,
} from "@/shared/api/hooks";
import {
  apiCancelPromotion,
  apiCreatePromotion,
  apiImpactPreview,
  apiPromoAudience,
  apiSetBaseRate,
} from "@/shared/api/client";
import { usePermission } from "@/shared/lib/permissions";
import { cn } from "@/shared/lib/cn";
import { formatDateTime } from "@/shared/lib/dates";
import { formatMoneyFull } from "@/shared/lib/format";
import type { Promotion, PromotionStatus } from "@/entities/models";
import {
  SendTimePicker,
  resolveSendAt,
  type SendTimeMode,
} from "@/widgets/SendTimePicker";
import { MethanePriceEditor } from "@/widgets/MethanePriceEditor";
import { SpendMinEditor } from "@/widgets/SpendMinEditor";
import { useI18n } from "@/app/providers/I18nProvider";
import type { DictKey } from "@/shared/config/dictionaries";

const STATUS_LABEL: Record<PromotionStatus, DictKey> = {
  active: "bonus.status.active",
  scheduled: "bonus.status.scheduled",
  ended: "bonus.status.ended",
  cancelled: "bonus.status.cancelled",
};
const STATUS_TONE: Record<
  PromotionStatus,
  "success" | "primary" | "neutral" | "danger"
> = {
  active: "success",
  scheduled: "primary",
  ended: "neutral",
  cancelled: "danger",
};

interface ImpactPreview {
  sampleDays: number;
  sampleReceiptCount: number;
  avgDailyReceiptAmount: string;
  estimatedDailyExtraCost: string;
}

function ImpactNote({ impact }: { impact: ImpactPreview }) {
  const { t } = useI18n();
  const extra = Number(impact.estimatedDailyExtraCost);
  return (
    <div className="rounded-xl bg-[var(--color-primary-soft)] px-3 py-2.5 text-[12.5px] text-[var(--color-primary)]">
      {t("bonus.impact", {
        days: impact.sampleDays,
        count: impact.sampleReceiptCount,
        cost: `${extra >= 0 ? "+" : ""}${formatMoneyFull(extra)}`,
      })}
    </div>
  );
}

export function BonusPage() {
  const { t } = useI18n();
  const canEdit = usePermission("bonus.edit");
  const { data: settings, mutate: mutateSettings } = useBonusSettings();
  const { data: promotions, mutate: mutatePromotions } = usePromotions();
  const { show } = useToast();

  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState("");
  const [rateNote, setRateNote] = useState("");
  const [rateImpact, setRateImpact] = useState<ImpactPreview | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<Promotion | null>(null);
  const { data: stations } = useStations();
  const detail = detailId ? (promotions?.find((p) => p.id === detailId) ?? (justCreated?.id === detailId ? justCreated : null)) : null;

  useEffect(() => {
    if (!editingRate || !rateInput) {
      setRateImpact(null);
      return;
    }
    const timer = setTimeout(async () => {
      const impact = await apiImpactPreview(
        Math.round(Number(rateInput) * 100),
        null,
      );
      setRateImpact(impact);
    }, 300);
    return () => clearTimeout(timer);
  }, [rateInput, editingRate]);

  async function handleSaveRate() {
    if (!rateNote || !rateInput) return;
    await apiSetBaseRate(Math.round(Number(rateInput) * 100), rateNote);
    show(t("bonus.rate_updated"));
    setEditingRate(false);
    setRateNote("");
    mutateSettings();
  }

  const baseRatePercent = settings ? settings.baseRateBps / 100 : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[var(--color-ink-secondary)]">
                {t("bonus.base_rate")}
              </p>
              <p className="tnum text-[26px] font-bold text-[var(--color-ink)]">
                {baseRatePercent ?? "—"}%
              </p>
            </div>
            {canEdit && (
              <Button
                variant="secondary"
                onClick={() => {
                  setRateInput(String(baseRatePercent ?? 1));
                  setEditingRate(true);
                }}
              >
                {t("bonus.change")}
              </Button>
            )}
          </div>
        </Card>
        <SpendMinEditor />
        <MethanePriceEditor />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">
            {t("bonus.promotions")}
          </h3>
          {canEdit && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={15} /> {t("bonus.new_promo")}
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {promotions?.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetailId(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setDetailId(p.id);
              }}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-alt)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Badge tone={STATUS_TONE[p.status]}>
                  {t(STATUS_LABEL[p.status])}
                </Badge>
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-ink)]">
                    {p.name} · {p.rateBps / 100}%
                  </p>
                  <p className="text-[12px] text-[var(--color-ink-tertiary)]">
                    {formatDateTime(p.startsAt)} → {formatDateTime(p.endsAt)}
                  </p>
                  <p className="truncate text-[12px] text-[var(--color-ink-tertiary)]">
                    {stationNames(p, stations, t("bonus.scope_all_stations"))}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {canEdit && p.status !== "cancelled" && p.status !== "ended" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await apiCancelPromotion(p.id);
                      mutatePromotions();
                    }}
                  >
                    {t("bonus.stop")}
                  </Button>
                )}
                <ChevronRight size={15} className="text-[var(--color-ink-tertiary)]" />
              </div>
            </div>
          ))}
          {(!promotions || promotions.length === 0) && (
            <p className="py-4 text-center text-[13px] text-[var(--color-ink-tertiary)]">
              {t("bonus.no_promos")}
            </p>
          )}
        </div>
      </Card>

      <Drawer
        open={editingRate}
        onClose={() => setEditingRate(false)}
        title={t("bonus.change_title")}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">
              {t("bonus.new_rate")}
            </label>
            <input
              value={rateInput}
              onChange={(e) =>
                setRateInput(e.target.value.replace(/[^\d.]/g, ""))
              }
              className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px]"
            />
          </div>
          {rateImpact && <ImpactNote impact={rateImpact} />}
          <div>
            <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">
              {t("common.note_required")}
            </label>
            <textarea
              value={rateNote}
              onChange={(e) => setRateNote(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]"
            />
          </div>
          <Button
            className="w-full"
            disabled={!rateNote || !rateInput}
            onClick={handleSaveRate}
          >
            {t("common.confirm")}
          </Button>
        </div>
      </Drawer>

      <Drawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={t("bonus.new_promo")}
      >
        <PromotionForm
          onCreated={(created) => {
            setFormOpen(false);
            setJustCreated(created);
            setDetailId(created.id); // show what was just made: branches, period, who announced…
            mutatePromotions();
          }}
        />
      </Drawer>

      <Drawer
        open={!!detail}
        onClose={() => setDetailId(null)}
        title={t("bonus.detail_title")}
      >
        {detail && (
          <PromotionDetail
            promo={detail}
            stations={stations}
            baseRatePercent={baseRatePercent}
            canStop={canEdit && detail.status !== "cancelled" && detail.status !== "ended"}
            onStop={async () => {
              await apiCancelPromotion(detail.id);
              mutatePromotions();
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

/** "Fargona, Quva" / "all stations" — names of the branches an offer applies to. */
function stationNames(p: Promotion, stations: { id: string; name: string }[] | undefined, all: string): string {
  if (!p.stationIds || p.stationIds.length === 0) return all;
  const byId = new Map((stations ?? []).map((s) => [s.id, s.name]));
  return p.stationIds.map((id) => byId.get(id) ?? "…").join(", ");
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11.5px] font-medium uppercase tracking-wide text-[var(--color-ink-tertiary)]">{label}</p>
      <div className="mt-0.5 text-[13.5px] text-[var(--color-ink)]">{children}</div>
    </div>
  );
}

/** Everything about one offer: status, rate, period, the branches it covers, the reason, who made it, the announcement. */
function PromotionDetail({
  promo,
  stations,
  baseRatePercent,
  canStop,
  onStop,
}: {
  promo: Promotion;
  stations: { id: string; name: string; address: string }[] | undefined;
  baseRatePercent: number | null;
  canStop: boolean;
  onStop: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [stopping, setStopping] = useState(false);
  const covered = promo.stationIds && promo.stationIds.length > 0 ? promo.stationIds : null;
  const days = Math.max(1, Math.ceil((new Date(promo.endsAt).getTime() - new Date(promo.startsAt).getTime()) / 86_400_000));
  const n = promo.notification;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[promo.status]}>{t(STATUS_LABEL[promo.status])}</Badge>
        <h3 className="text-[17px] font-bold text-[var(--color-ink)]">{promo.name}</h3>
      </div>

      <div className="rounded-xl bg-[var(--color-primary-soft)] px-4 py-3">
        <p className="tnum text-[28px] font-bold leading-tight text-[var(--color-primary)]">{promo.rateBps / 100}%</p>
        {baseRatePercent !== null && (
          <p className="text-[12.5px] text-[var(--color-ink-secondary)]">{t("bonus.detail_vs_base", { base: baseRatePercent })}</p>
        )}
      </div>

      <DetailRow label={t("bonus.detail_period")}>
        <p className="tnum">
          {formatDateTime(promo.startsAt)} → {formatDateTime(promo.endsAt)}
        </p>
        <p className="text-[12px] text-[var(--color-ink-tertiary)]">{t("bonus.detail_days", { n: days })}</p>
      </DetailRow>

      <DetailRow label={t("bonus.f_stations")}>
        {covered ? (
          <ul className="space-y-1">
            {covered.map((id) => {
              const s = stations?.find((x) => x.id === id);
              return (
                <li key={id}>
                  <span className="font-medium">{s?.name ?? "…"}</span>
                  {s?.address ? <span className="block text-[12px] text-[var(--color-ink-tertiary)]">{s.address}</span> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          t("bonus.scope_all_stations")
        )}
      </DetailRow>

      <DetailRow label={t("bonus.f_reason")}>
        <p className="whitespace-pre-line">{promo.reason}</p>
      </DetailRow>

      <DetailRow label={t("bonus.notify_title")}>
        {n ? (
          <>
            <p>
              {n.status === "sent"
                ? t("bonus.detail_sent", { at: formatDateTime(n.sentAt ?? n.sendAt), n: n.recipientCount })
                : n.status === "cancelled"
                  ? t("bonus.detail_notify_cancelled")
                  : n.status === "sending"
                    ? t("bonus.detail_sending")
                    : t("bonus.detail_will_send", { at: formatDateTime(n.sendAt) })}
            </p>
          </>
        ) : (
          t("bonus.detail_no_notify")
        )}
      </DetailRow>

      <DetailRow label={t("bonus.detail_created")}>
        <p>
          {promo.createdByName ?? "—"} · {formatDateTime(promo.createdAt)}
        </p>
        {promo.cancelledAt && (
          <p className="text-[12.5px] text-[var(--color-danger)]">
            {t("bonus.detail_stopped", { who: promo.cancelledByName ?? "—", at: formatDateTime(promo.cancelledAt) })}
          </p>
        )}
      </DetailRow>

      {canStop && (
        <Button
          variant="danger"
          className="w-full"
          loading={stopping}
          onClick={async () => {
            setStopping(true);
            try {
              await onStop();
            } finally {
              setStopping(false);
            }
          }}
        >
          {t("bonus.stop")}
        </Button>
      )}
    </div>
  );
}

function PromotionForm({ onCreated }: { onCreated: (promo: Promotion) => void }) {
  const { t } = useI18n();
  const { data: stations } = useStations();
  const { data: settings } = useBonusSettings();
  const [name, setName] = useState("");
  const [rate, setRate] = useState("2");
  const [scope, setScope] = useState<"all" | string[]>("all");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const [notifyOn, setNotifyOn] = useState(true);
  const [notifyMode, setNotifyMode] = useState<SendTimeMode>("start");
  const [notifyAt, setNotifyAt] = useState("");
  const [impact, setImpact] = useState<ImpactPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stationIds = scope === "all" ? null : scope;

  useEffect(() => {
    if (!rate) return;
    const timer = setTimeout(
      async () =>
        setImpact(
          await apiImpactPreview(Math.round(Number(rate) * 100), stationIds),
        ),
      300,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, scope]);

  const rateNum = Number(rate);
  const notifyValid = !notifyOn || notifyMode !== "custom" || !!notifyAt;
  const stationKey = stationIds ? [...stationIds].sort().join(",") : "all";
  const { data: audience } = useSWR(notifyOn ? ["promo-audience", stationKey] : null, () => apiPromoAudience(stationIds));
  const warnHigh = rateNum > 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !startsAt || !endsAt || !reason || !notifyValid) return;
    setSubmitting(true);
    try {
      const created = await apiCreatePromotion({
        name,
        rateBps: Math.round(rateNum * 100),
        stationIds,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        reason,
        notifyAt: notifyOn ? resolveSendAt(notifyMode, notifyAt, startsAt) : null,
      });
      onCreated(created);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">
          {t("stations.f_name")}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px]"
        />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">
          {t("bonus.f_rate")}
        </label>
        <input
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px]"
        />
        {warnHigh && (
          <p className="mt-1 text-[12px] font-medium text-[var(--color-amber-strong)]">
            {t("bonus.high_rate")}
          </p>
        )}
        {rateNum === 0 && (
          <p className="mt-1 text-[12px] text-[var(--color-ink-tertiary)]">
            {t("bonus.zero_rate")}
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">
          {t("bonus.f_stations")}
        </label>
        <select
          value={scope === "all" ? "all" : "custom"}
          onChange={(e) => setScope(e.target.value === "all" ? "all" : [])}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-[13px]"
        >
          <option value="all">{t("bonus.scope_all")}</option>
          <option value="custom">{t("bonus.scope_pick")}</option>
        </select>
        {scope !== "all" && (
          <div className="mt-2 space-y-1">
            {stations?.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={Array.isArray(scope) && scope.includes(s.id)}
                  onChange={(e) => {
                    const current = Array.isArray(scope) ? scope : [];
                    setScope(
                      e.target.checked
                        ? [...current, s.id]
                        : current.filter((id) => id !== s.id),
                    );
                  }}
                />
                {s.name}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">
            {t("bonus.f_starts")}
          </label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--color-border)] px-2 text-[13px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">
            {t("bonus.f_ends")}
          </label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--color-border)] px-2 text-[13px]"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-ink-secondary)]">
          {t("bonus.f_reason")}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]"
        />
      </div>

      <div className="rounded-xl border border-[var(--color-border)] p-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={notifyOn}
            aria-label={t("bonus.notify_title")}
            onClick={() => setNotifyOn((v) => !v)}
            className={cn(
              "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
              notifyOn ? "bg-[var(--color-success)]" : "bg-[var(--color-border-strong)]",
            )}
          >
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", notifyOn ? "left-[22px]" : "left-0.5")} />
          </button>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--color-ink)]">{t("bonus.notify_title")}</p>
            <p className="text-[11.5px] text-[var(--color-ink-tertiary)]">
              {!notifyOn ? t("bonus.notify_off_hint") : stationIds ? t("bonus.notify_hint_stations") : t("bonus.notify_hint_all")}
            </p>
            {notifyOn && audience && (
              <p className="mt-1 text-[12px] font-medium text-[var(--color-primary)]">{t("bonus.notify_audience", { n: audience.count })}</p>
            )}
          </div>
        </div>
        {notifyOn && (
          <div className="mt-3">
            <SendTimePicker
              modes={["start", "now", "custom"]}
              mode={notifyMode}
              onModeChange={setNotifyMode}
              customAt={notifyAt}
              onCustomAtChange={setNotifyAt}
            />
          </div>
        )}
      </div>

      {impact && <ImpactNote impact={impact} />}

      <p className="text-[11px] text-[var(--color-ink-tertiary)]">
        {t("bonus.station_priority")}
      </p>
      {settings && (
        <p className="text-[11px] text-[var(--color-ink-tertiary)]">
          {t("bonus.current_base", { v: settings.baseRateBps / 100 })}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        loading={submitting}
        disabled={!name || !startsAt || !endsAt || !reason || !notifyValid}
      >
        {t("common.create")}
      </Button>
    </form>
  );
}
