import { Upload } from "lucide-react";
import type { StatisticsCategoryOption, StatisticsHabitOption, StatisticsPeriod } from "../../hooks/useStatistics";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

interface StatisticsFiltersProps {
  period: StatisticsPeriod;
  habitId: string;
  categoryId: string;
  habitOptions: StatisticsHabitOption[];
  categoryOptions: StatisticsCategoryOption[];
  onPeriodChange: (value: StatisticsPeriod) => void;
  onHabitChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onExport: () => void;
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
  habitOptions,
  categoryOptions,
  onPeriodChange,
  onHabitChange,
  onCategoryChange,
  onExport,
}: StatisticsFiltersProps) {
  return (
    <Card className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
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
          ...habitOptions.map((habit) => ({ value: habit.id, label: habit.name })),
        ]}
      />
      <Select
        label="Categoría"
        value={categoryId}
        onChange={(event) => onCategoryChange(event.target.value)}
        options={[
          { value: "all", label: "Todas las categorías" },
          ...categoryOptions.map((category) => ({ value: category.id, label: category.name })),
        ]}
      />
      <Button variant="secondary" leadingIcon={<Upload size={16} />} onClick={onExport} className="w-full xl:w-auto">
        Exportar
      </Button>
    </Card>
  );
}
