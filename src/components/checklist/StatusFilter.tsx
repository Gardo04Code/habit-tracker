import clsx from "clsx";
import type { HabitStatus } from "../../types/habit";
import type { StatusFilterValue } from "../../hooks/useDailyChecklist";
import { getStatusColorVar, getStatusLabel } from "../../utils/habitStatus";

interface StatusFilterProps {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
  counts: Record<HabitStatus, number>;
}

const STATUS_ORDER: HabitStatus[] = ["pending", "completed", "partial", "not_completed", "not_applicable"];

export function StatusFilter({ value, onChange, counts }: StatusFilterProps) {
  const total = STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={clsx(
          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          value === "all"
            ? "border-primary bg-primary-muted text-primary"
            : "border-border bg-surface text-text-secondary hover:bg-surface-muted",
        )}
      >
        Todos · {total}
      </button>
      {STATUS_ORDER.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={clsx(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            value === status
              ? "border-primary bg-primary-muted text-primary"
              : "border-border bg-surface text-text-secondary hover:bg-surface-muted",
          )}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: getStatusColorVar(status) }}
            aria-hidden="true"
          />
          {getStatusLabel(status)} · {counts[status]}
        </button>
      ))}
    </div>
  );
}
