import { CheckCircle2 } from "lucide-react";
import type { ChecklistEntry } from "../../hooks/useDailyChecklist";
import { ProgressBar } from "../ui/ProgressBar";

interface ChecklistSummaryProps {
  entries: ChecklistEntry[];
}

export function ChecklistSummary({ entries }: ChecklistSummaryProps) {
  const total = entries.length;
  const completed = entries.filter((entry) => entry.status === "completed").length;
  const applicable = entries.filter((entry) => entry.status !== "not_applicable").length;
  const percentage = applicable > 0 ? Math.round((completed / applicable) * 100) : 0;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success-muted text-success">
        <CheckCircle2 size={20} aria-hidden="true" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">
          {completed} de {total} hábitos completados
        </p>
        <ProgressBar percentage={percentage} variant="success" showValue={false} className="mt-2" />
      </div>
      <span className="text-lg font-semibold text-text-primary">{percentage}%</span>
    </div>
  );
}
