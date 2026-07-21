import { useState } from "react";
import { Lock, MinusCircle, NotebookPen } from "lucide-react";
import clsx from "clsx";
import type { ChecklistEntry } from "../../hooks/useDailyChecklist";
import { getCategoryById } from "../../data/mockCategories";
import { calculatePercentage } from "../../utils/calculateProgress";
import { formatFrequency, formatGoal } from "../../utils/formatFrequency";
import { isValueBasedGoal } from "../../utils/deriveHabitStatus";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { StatusBadge } from "../ui/StatusBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { IconButton } from "../ui/IconButton";
import { HabitValueInput } from "./HabitValueInput";
import { HabitNoteModal } from "./HabitNoteModal";

interface DailyHabitCardProps {
  entry: ChecklistEntry;
  onBooleanChange: (status: "completed" | "not_completed") => void;
  onValueChange: (value: number) => void;
  onTimeChange: (time: string) => void;
  onMarkNotApplicable: () => void;
  onSaveNote: (note: string) => void;
}

export function DailyHabitCard({
  entry,
  onBooleanChange,
  onValueChange,
  onTimeChange,
  onMarkNotApplicable,
  onSaveNote,
}: DailyHabitCardProps) {
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const { habit, status, value, recordedTime, note, isReadOnly } = entry;

  const categories = habit.categoryIds.map(getCategoryById).filter(Boolean);
  const showProgress = isValueBasedGoal(habit.goalType) && habit.targetValue !== undefined;
  const percentage = showProgress ? calculatePercentage(value ?? 0, habit.targetValue ?? 1) : 0;

  return (
    <Card className={clsx("flex flex-col gap-3", isReadOnly && "bg-surface-muted/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: habit.color }}
            aria-hidden="true"
          >
            {habit.name.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">{habit.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {categories.map((category) => (
                <Badge key={category!.id} tone="neutral">
                  {category!.name}
                </Badge>
              ))}
              <span className="text-xs text-text-secondary">
                {formatGoal(habit)} · {formatFrequency(habit)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isReadOnly && (
            <span title="Registro de solo lectura (más de 7 días o fecha futura)" className="text-text-disabled">
              <Lock size={16} aria-hidden="true" />
            </span>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      {showProgress && (
        <ProgressBar
          percentage={percentage}
          variant={status === "not_completed" ? "danger" : "success"}
          label={`${value ?? 0} de ${habit.targetValue} ${habit.targetUnit ?? ""}`}
        />
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <HabitValueInput
            habit={habit}
            status={status}
            value={value}
            recordedTime={recordedTime}
            disabled={isReadOnly}
            onBooleanChange={onBooleanChange}
            onValueChange={onValueChange}
            onTimeChange={onTimeChange}
          />
        </div>
        <IconButton
          icon={<MinusCircle size={16} />}
          label="Marcar como no aplicable"
          variant="secondary"
          disabled={isReadOnly}
          onClick={onMarkNotApplicable}
        />
        <IconButton
          icon={<NotebookPen size={16} />}
          label={note ? "Editar nota" : "Agregar nota"}
          variant={note ? "primary" : "secondary"}
          onClick={() => setIsNoteOpen(true)}
        />
      </div>

      {note && <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-text-secondary">"{note}"</p>}

      <HabitNoteModal
        isOpen={isNoteOpen}
        habitName={habit.name}
        initialNote={note}
        onClose={() => setIsNoteOpen(false)}
        onSave={onSaveNote}
      />
    </Card>
  );
}
