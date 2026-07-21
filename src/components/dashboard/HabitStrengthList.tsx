import { Flame } from "lucide-react";
import { Link } from "react-router-dom";
import type { HabitStrengthEntry } from "../../types/dashboard";
import { ProgressBar } from "../ui/ProgressBar";

interface HabitStrengthListProps {
  entries: HabitStrengthEntry[];
  variant: "strong" | "weak";
}

export function HabitStrengthList({ entries, variant }: HabitStrengthListProps) {
  return (
    <ul className="flex flex-col gap-4">
      {entries.map((entry) => (
        <li key={entry.habitId}>
          <Link
            to="/habits"
            className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            >
              {entry.habitName.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-text-primary">{entry.habitName}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-text-secondary">
                  <Flame size={12} className="text-streak" aria-hidden="true" />
                  {entry.streak}
                </span>
              </div>
              <ProgressBar
                percentage={entry.completionRate}
                variant={variant === "strong" ? "success" : "warning"}
                showValue={false}
                className="mt-1.5"
              />
            </div>
            <span className="w-10 shrink-0 text-right text-sm font-medium text-text-primary">
              {entry.completionRate}%
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
