import { Crown } from "lucide-react";
import { calculatePercentage, isGoalExceeded } from "../../utils/calculateProgress";
import { ProgressBar, type ProgressVariant } from "../ui/ProgressBar";

interface HabitProgressProps {
  value: number;
  target: number;
  unit?: string;
  variant?: ProgressVariant;
}

export function HabitProgress({ value, target, unit, variant = "success" }: HabitProgressProps) {
  const percentage = calculatePercentage(value, target);
  const exceeded = isGoalExceeded(value, target);

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <ProgressBar percentage={percentage} variant={variant} showValue={false} />
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs font-medium text-text-primary">
        {value} / {target} {unit ?? ""}
      </span>
      {exceeded && <Crown size={14} className="shrink-0 text-warning" aria-hidden="true" />}
    </div>
  );
}
