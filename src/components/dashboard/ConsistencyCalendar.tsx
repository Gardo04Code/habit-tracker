import type { ConsistencyDay } from "../../types/dashboard";
import { formatShortDate } from "../../utils/formatDate";

interface ConsistencyCalendarProps {
  days: ConsistencyDay[];
}

function levelForRate(rate: number): number {
  if (rate === 0) return 0;
  if (rate < 50) return 1;
  if (rate < 80) return 2;
  if (rate < 100) return 3;
  return 4;
}

const LEVEL_CLASSES = [
  "bg-surface-muted",
  "bg-danger/30",
  "bg-warning/40",
  "bg-success/50",
  "bg-success",
];

export function ConsistencyCalendar({ days }: ConsistencyCalendarProps) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <span
            key={day.date}
            title={`${formatShortDate(day.date)}: ${day.completionRate}% de cumplimiento`}
            className={`aspect-square rounded-sm ${LEVEL_CLASSES[levelForRate(day.completionRate)]}`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-text-secondary">
        <span>Menos</span>
        {LEVEL_CLASSES.map((className) => (
          <span key={className} className={`h-2.5 w-2.5 rounded-sm ${className}`} aria-hidden="true" />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}
