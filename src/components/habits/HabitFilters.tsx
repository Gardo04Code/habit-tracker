import { Search } from "lucide-react";
import { mockCategories } from "../../data/mockCategories";
import { Select } from "../ui/Select";

interface HabitFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
}

export function HabitFilters({ search, onSearchChange, categoryId, onCategoryChange }: HabitFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="habit-search" className="text-sm font-medium text-text-primary">
          Buscar
        </label>
        <div className="relative mt-1.5">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <input
            id="habit-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar hábito por nombre"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
      </div>
      <div className="sm:w-56">
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
    </div>
  );
}
