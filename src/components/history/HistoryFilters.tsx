import { CalendarRange, Table2 } from "lucide-react";
import clsx from "clsx";
import type { HabitStatus } from "../../types/habit";
import type { HistoryView } from "../../hooks/useHistoryLogs";
import type { StatusFilterValue } from "../../hooks/useDailyChecklist";
import { browsableHabits } from "../../hooks/useHistoryLogs";
import { mockCategories } from "../../data/mockCategories";
import { getStatusLabel } from "../../utils/habitStatus";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

interface HistoryFiltersProps {
  dateFrom: string;
  dateTo: string;
  habitId: string;
  categoryId: string;
  status: StatusFilterValue;
  view: HistoryView;
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
  onDateFromChange,
  onDateToChange,
  onHabitChange,
  onCategoryChange,
  onStatusChange,
  onViewChange,
}: HistoryFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Desde" type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
        <Input label="Hasta" type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
        <Select
          label="Hábito"
          value={habitId}
          onChange={(event) => onHabitChange(event.target.value)}
          options={[{ value: "all", label: "Todos los hábitos" }, ...browsableHabits.map((habit) => ({ value: habit.id, label: habit.name }))]}
        />
        <Select
          label="Categoría"
          value={categoryId}
          onChange={(event) => onCategoryChange(event.target.value)}
          options={[{ value: "all", label: "Todas las categorías" }, ...mockCategories.map((category) => ({ value: category.id, label: category.name }))]}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          label="Estado"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as StatusFilterValue)}
          options={[
            { value: "all", label: "Todos los estados" },
            ...STATUS_OPTIONS.map((option) => ({ value: option, label: getStatusLabel(option) })),
          ]}
          className="sm:w-56"
        />

        <div className="flex gap-1 self-start rounded-lg bg-surface-muted p-1" role="group" aria-label="Cambiar vista">
          <button
            type="button"
            onClick={() => onViewChange("table")}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "table" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary",
            )}
          >
            <Table2 size={16} aria-hidden="true" />
            Tabla
          </button>
          <button
            type="button"
            onClick={() => onViewChange("calendar")}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "calendar" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary",
            )}
          >
            <CalendarRange size={16} aria-hidden="true" />
            Calendario
          </button>
        </div>
      </div>
    </div>
  );
}
