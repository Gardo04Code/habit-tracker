import type { StatisticsPeriod } from "../../hooks/useStatistics";
import { statisticsHabits } from "../../hooks/useStatistics";
import { mockCategories } from "../../data/mockCategories";
import { Select } from "../ui/Select";

interface StatisticsFiltersProps {
  period: StatisticsPeriod;
  habitId: string;
  categoryId: string;
  onPeriodChange: (value: StatisticsPeriod) => void;
  onHabitChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
];

export function StatisticsFilters({
  period,
  habitId,
  categoryId,
  onPeriodChange,
  onHabitChange,
  onCategoryChange,
}: StatisticsFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-3">
      <Select
        label="Periodo"
        value={String(period)}
        onChange={(event) => onPeriodChange(Number(event.target.value) as StatisticsPeriod)}
        options={PERIOD_OPTIONS}
      />
      <Select
        label="Hábito"
        value={habitId}
        onChange={(event) => onHabitChange(event.target.value)}
        options={[
          { value: "all", label: "Todos los hábitos" },
          ...statisticsHabits.map((habit) => ({ value: habit.id, label: habit.name })),
        ]}
      />
      <Select
        label="Categoría"
        value={categoryId}
        onChange={(event) => onCategoryChange(event.target.value)}
        options={[
          { value: "all", label: "Todas las categorías" },
          ...mockCategories.map((category) => ({ value: category.id, label: category.name })),
        ]}
      />
    </div>
  );
}
