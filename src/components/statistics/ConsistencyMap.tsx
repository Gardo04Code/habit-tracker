import { Flame, TrendingDown } from "lucide-react";
import type { ConsistencyDay } from "../../types/dashboard";
import { formatShortDate } from "../../utils/formatDate";
import { CircularProgress } from "../ui/CircularProgress";

interface ConsistencyMapProps {
  days: ConsistencyDay[];
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const WEEKDAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const TIERS = [
  { min: 80, label: "Excelente", range: "80% - 100%", className: "bg-success" },
  { min: 60, label: "Bueno", range: "60% - 79%", className: "bg-success/50" },
  { min: 30, label: "Regular", range: "30% - 59%", className: "bg-warning/50" },
  { min: 0, label: "Bajo", range: "0% - 29%", className: "bg-danger/50" },
];
const NO_DATA_TIER = { label: "Sin datos", className: "bg-surface-muted border border-border" };

function tierFor(day: ConsistencyDay) {
  if (!day.hasData) return NO_DATA_TIER;
  return TIERS.find((tier) => day.completionRate >= tier.min) ?? TIERS[TIERS.length - 1];
}

function weekRowLabel(offsetFromToday: number): string {
  return offsetFromToday === 0 ? "Esta semana" : `Semana -${offsetFromToday}`;
}

export function ConsistencyMap({ days }: ConsistencyMapProps) {
  const totalWeeks = Math.ceil(days.length / 7);
  const weeks = Array.from({ length: totalWeeks }, (_, index) => days.slice(index * 7, index * 7 + 7)).reverse();

  const daysWithData = days.filter((day) => day.hasData);
  const average =
    daysWithData.length > 0
      ? Math.round(daysWithData.reduce((sum, day) => sum + day.completionRate, 0) / daysWithData.length)
      : 0;

  const weekdayAverages = WEEKDAY_NAMES.map((name, weekdayIndex) => {
    const entries = daysWithData.filter((day) => {
      const jsDay = new Date(`${day.date}T00:00:00`).getDay();
      return (jsDay + 6) % 7 === weekdayIndex;
    });
    if (entries.length === 0) return { name, rate: null as number | null };
    const rate = Math.round(entries.reduce((sum, day) => sum + day.completionRate, 0) / entries.length);
    return { name, rate };
  });
  const withRates = weekdayAverages.filter((entry): entry is { name: string; rate: number } => entry.rate !== null);
  const best = withRates.length > 0 ? withRates.reduce((max, entry) => (entry.rate > max.rate ? entry : max)) : null;
  const worst = withRates.length > 0 ? withRates.reduce((min, entry) => (entry.rate < min.rate ? entry : min)) : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="overflow-x-auto">
          <div className="min-w-[420px]">
            <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5">
              <span />
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="text-center text-xs font-medium text-text-secondary">
                  {label}
                </span>
              ))}
            </div>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-[80px_repeat(7,1fr)] items-center gap-1.5">
                  <span className="truncate text-xs text-text-secondary">{weekRowLabel(weekIndex)}</span>
                  {week.map((day) => {
                    const tier = tierFor(day);
                    return (
                      <span
                        key={day.date}
                        title={
                          day.hasData
                            ? `${formatShortDate(day.date)}: ${day.completionRate}% de cumplimiento`
                            : `${formatShortDate(day.date)}: sin datos`
                        }
                        className={`aspect-square rounded-md ${tier.className}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
          {TIERS.map((tier) => (
            <span key={tier.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${tier.className}`} aria-hidden="true" />
              {tier.label} {tier.range}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${NO_DATA_TIER.className}`} aria-hidden="true" />
            {NO_DATA_TIER.label}
          </span>
        </div>
      </div>

      <div className="flex flex-row gap-3 lg:w-48 lg:flex-col">
        <div className="shadow-elevation-1 flex flex-1 flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4">
          <CircularProgress percentage={average} size={72} strokeWidth={6} color="var(--color-primary)">
            <span className="text-lg font-bold text-text-primary">{average}%</span>
          </CircularProgress>
          <p className="text-center text-xs text-text-secondary">Consistencia promedio</p>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="shadow-elevation-1 flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-muted text-success" aria-hidden="true">
              <Flame size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary">Mejor día</p>
              <p className="truncate text-sm font-semibold text-text-primary">{best ? best.name : "—"}</p>
              {best && <p className="text-xs text-text-disabled">{best.rate}% promedio</p>}
            </div>
          </div>
          <div className="shadow-elevation-1 flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger-muted text-danger" aria-hidden="true">
              <TrendingDown size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary">Peor día</p>
              <p className="truncate text-sm font-semibold text-text-primary">{worst ? worst.name : "—"}</p>
              {worst && <p className="text-xs text-text-disabled">{worst.rate}% promedio</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
