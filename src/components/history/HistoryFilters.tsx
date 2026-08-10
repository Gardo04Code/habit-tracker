import { CalendarRange, Filter, Table2 } from "lucide-react";
import clsx from "clsx";
import type { HabitStatus } from "../../types/habit";
import type { HistoryCategoryOption, HistoryHabitOption, HistoryView } from "../../hooks/useHistoryLogs";
import type { StatusFilterValue } from "../../hooks/useDailyChecklist";
import { getStatusLabel } from "../../utils/habitStatus";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

interface HistoryFiltersProps {
  dateFrom: string;
  dateTo: string;
  habitId: string;
  categoryId: string;
  status: StatusFilterValue;
  view: HistoryView;
  habitOptions: HistoryHabitOption[];
  categoryOptions: HistoryCategoryOption[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onHabitChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: StatusFilterValue) => void;
  onViewChange: (value: HistoryView) => void;
}

const STATUS_OPTIONS: HabitStatus[] = ["pending", "completed", "partial", "not_completed", "not_applicable"];

export function HistoryFilters({
  dateFrom,
  dateTo,
  habitId,
  categoryId,
  status,
  view,
  habitOptions,
  categoryOptions,
  onDateFromChange,
  onDateToChange,
  onHabitChange,
  onCategoryChange,
  onStatusChange,
  onViewChange,
}: HistoryFiltersProps) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Filter size={15} className="text-primary" aria-hidden="true" />
          Filtros
        </h2>

        <div className="flex gap-1 self-start rounded-lg bg-surface-muted p-1" role="group" aria-label="Cambiar vista">
          <button
            type="button"
            onClick={() => onViewChange("table")}
            className={clsx(
              "shadow-elevation-1 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "table" ? "bg-surface text-text-primary" : "text-text-secondary shadow-none",
            )}
          >
            <Table2 size={16} aria-hidden="true" />
            Tabla
          </button>
          <button
            type="button"
            onClick={() => onViewChange("calendar")}
            className={clsx(
              "shadow-elevation-1 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "calendar" ? "bg-surface text-text-primary" : "text-text-secondary shadow-none",
            )}
          >
            <CalendarRange size={16} aria-hidden="true" />
            Calendario
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input label="Desde" type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
        <Input label="Hasta" type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
        <Select
          label="Hábito"
          value={habitId}
          onChange={(event) => onHabitChange(event.target.value)}
          options={[{ value: "all", label: "Todos los hábitos" }, ...habitOptions.map((habit) => ({ value: habit.id, label: habit.name }))]}
        />
        <Select
          label="Categoría"
          value={categoryId}
          onChange={(event) => onCategoryChange(event.target.value)}
          options={[{ value: "all", label: "Todas las categorías" }, ...categoryOptions.map((category) => ({ value: category.id, label: category.name }))]}
        />
        <Select
          label="Estado"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as StatusFilterValue)}
          options={[
            { value: "all", label: "Todos los estados" },
            ...STATUS_OPTIONS.map((option) => ({ value: option, label: getStatusLabel(option) })),
          ]}
        />
      </div>
    </Card>
  );
}
