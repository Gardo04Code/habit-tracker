import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ListChecks } from "lucide-react";
import type { ChecklistEntry } from "../../hooks/useDailyChecklist";
import { StatusBadge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

interface TodaySummaryProps {
  entries: ChecklistEntry[];
}

export function TodaySummary({ entries }: TodaySummaryProps) {
  const navigate = useNavigate();

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks size={20} aria-hidden="true" />}
        title="No hay hábitos programados para hoy"
        description="Ninguno de tus hábitos activos aplica para el día de hoy."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border">
        {entries.map(({ habit, status }) => (
          <li key={habit.id} className="flex items-center justify-between gap-3 py-2.5">
            <Link
              to="/checklist"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: habit.color }}
                aria-hidden="true"
              />
              <span className="truncate text-sm font-medium text-text-primary">{habit.name}</span>
            </Link>
            <StatusBadge status={status} />
          </li>
        ))}
      </ul>
      <Button
        variant="secondary"
        size="sm"
        trailingIcon={<ArrowRight size={16} />}
        className="self-start"
        onClick={() => navigate("/checklist")}
      >
        Ir al checklist completo
      </Button>
    </div>
  );
}
