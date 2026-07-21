import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { activeHabits } from "../../data/mockHabits";
import { getLogForHabitOnDate } from "../../data/mockHabitLogs";
import { TODAY } from "../../data/referenceDate";
import { StatusBadge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";

export function TodaySummary() {
  const navigate = useNavigate();
  const items = activeHabits.map((habit) => ({
    habit,
    log: getLogForHabitOnDate(habit.id, TODAY),
  }));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border">
        {items.map(({ habit, log }) => (
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
            <StatusBadge status={log?.status ?? "pending"} />
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
