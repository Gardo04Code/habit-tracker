import { motion } from "framer-motion";
import { Repeat } from "lucide-react";
import { getHabitIcon } from "../../utils/habitIcons";
import { EmptyState } from "../ui/EmptyState";

interface HabitComparisonEntry {
  habitId: string;
  habitName: string;
  color: string;
  icon: string;
  completionRate: number;
}

interface HabitComparisonChartProps {
  data: HabitComparisonEntry[];
}

export function HabitComparisonChart({ data }: HabitComparisonChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Repeat size={20} aria-hidden="true" />}
        title="Selecciona todos los hábitos"
        description='La comparación entre hábitos solo está disponible cuando el filtro de hábito está en "Todos los hábitos".'
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((entry, index) => {
        const HabitIcon = getHabitIcon(entry.icon);
        return (
          <div key={entry.habitId} className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            >
              <HabitIcon size={15} />
            </span>
            <span className="w-32 shrink-0 truncate text-sm text-text-primary sm:w-40">{entry.habitName}</span>
            <span
              className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuenow={entry.completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={entry.habitName}
            >
              <motion.span
                className="block h-full rounded-full"
                style={{ backgroundColor: entry.color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, entry.completionRate)}%` }}
                transition={{ duration: 0.5, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
              />
            </span>
            <span className="w-10 shrink-0 text-right text-sm font-medium text-text-primary">
              {entry.completionRate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
