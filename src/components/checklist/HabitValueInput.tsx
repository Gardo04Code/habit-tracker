import clsx from "clsx";
import type { Habit, HabitStatus } from "../../types/habit";

interface HabitValueInputProps {
  habit: Habit;
  status: HabitStatus;
  value?: number;
  recordedTime?: string;
  disabled: boolean;
  onBooleanChange: (status: "completed" | "not_completed") => void;
  onValueChange: (value: number) => void;
  onTimeChange: (time: string) => void;
}

export function HabitValueInput({
  habit,
  status,
  value,
  recordedTime,
  disabled,
  onBooleanChange,
  onValueChange,
  onTimeChange,
}: HabitValueInputProps) {
  const inputId = `habit-value-${habit.id}`;

  if (habit.goalType === "boolean") {
    return (
      <div className="flex gap-2" role="group" aria-label={`Registrar ${habit.name}`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onBooleanChange("completed")}
          className={clsx(
            "h-9 flex-1 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            status === "completed"
              ? "border-success bg-success-muted text-success"
              : "border-border bg-surface text-text-secondary hover:bg-surface-muted",
          )}
        >
          Sí
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onBooleanChange("not_completed")}
          className={clsx(
            "h-9 flex-1 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            status === "not_completed"
              ? "border-danger bg-danger-muted text-danger"
              : "border-border bg-surface text-text-secondary hover:bg-surface-muted",
          )}
        >
          No
        </button>
      </div>
    );
  }

  if (habit.goalType === "deadline") {
    return (
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
          Hora
        </label>
        <input
          id={inputId}
          type="time"
          disabled={disabled}
          value={recordedTime ?? ""}
          onChange={(event) => onTimeChange(event.target.value)}
          className={clsx(
            "h-9 flex-1 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
        {habit.targetUnit ?? "valor"}
      </label>
      <input
        id={inputId}
        type="number"
        min={0}
        disabled={disabled}
        value={value ?? ""}
        onChange={(event) => onValueChange(Number(event.target.value))}
        placeholder={habit.targetValue ? `Meta: ${habit.targetValue}` : undefined}
        className={clsx(
          "h-9 flex-1 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary",
          "placeholder:text-text-disabled",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      />
    </div>
  );
}
