import { useState } from "react";
import { Check, Clock3, Lock, MinusCircle, NotebookPen, RotateCcw, X as XIcon } from "lucide-react";
import type { ChecklistEntry } from "../../hooks/useDailyChecklist";
import type { HabitStatus } from "../../types/habit";
import { getCategoryById } from "../../data/mockCategories";
import { formatGoal } from "../../utils/formatFrequency";
import { isValueBasedGoal } from "../../utils/deriveHabitStatus";
import { getStatusLabel } from "../../utils/habitStatus";
import { Card } from "../ui/Card";
import { OverflowMenu, type OverflowMenuItem } from "../ui/OverflowMenu";
import { HabitIcon3D } from "../ui/HabitIcon3D";
import { HabitProgress } from "./HabitProgress";
import { QuickCounter } from "./QuickCounter";
import { QuickBooleanSelector } from "./QuickBooleanSelector";
import { QuickTimeTracker } from "./QuickTimeTracker";
import { QuickActionButton } from "./QuickActionButton";
import { HabitQuickNote } from "./HabitQuickNote";
import { CompletionAnimation } from "./CompletionAnimation";

interface HabitMissionCardProps {
  entry: ChecklistEntry;
  onBooleanChange: (status: "completed" | "not_completed") => void;
  onValueChange: (value: number) => void;
  onTimeChange: (time: string) => void;
  onMarkNotApplicable: () => void;
  onReset: () => void;
  onSaveNote: (note: string) => void;
}

function StatusDot({ status }: { status: HabitStatus }) {
  const base = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full";
  if (status === "completed") {
    return (
      <span className={`${base} bg-success text-white`} role="img" aria-label={getStatusLabel(status)}>
        <Check size={14} strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className={`${base} bg-warning-muted text-warning`} role="img" aria-label={getStatusLabel(status)}>
        <Clock3 size={12} aria-hidden="true" />
      </span>
    );
  }
  if (status === "not_completed") {
    return (
      <span className={`${base} bg-danger-muted text-danger`} role="img" aria-label={getStatusLabel(status)}>
        <XIcon size={12} aria-hidden="true" />
      </span>
    );
  }
  if (status === "not_applicable") {
    return (
      <span className={`${base} bg-surface-muted text-text-disabled`} role="img" aria-label={getStatusLabel(status)}>
        <MinusCircle size={12} aria-hidden="true" />
      </span>
    );
  }
  return <span className="h-6 w-6 shrink-0 rounded-full border-2 border-border-strong" role="img" aria-label={getStatusLabel(status)} />;
}

function DeadlinePicker({
  recordedTime,
  disabled,
  onChange,
}: {
  recordedTime?: string;
  disabled?: boolean;
  onChange: (time: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="time"
        disabled={disabled}
        value={recordedTime ?? ""}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Hora registrada"
        className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
      />
      <QuickActionButton
        icon={<Clock3 size={13} />}
        label="Ahora"
        tone="neutral"
        disabled={disabled}
        onClick={() => onChange(new Date().toTimeString().slice(0, 5))}
      />
    </div>
  );
}

export function HabitMissionCard({
  entry,
  onBooleanChange,
  onValueChange,
  onTimeChange,
  onMarkNotApplicable,
  onReset,
  onSaveNote,
}: HabitMissionCardProps) {
  const { habit, status, value, recordedTime, note, isReadOnly } = entry;
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(status);

  // Ajusta el estado durante el render (patrón recomendado por React para
  // "detectar cambios en una prop"), en vez de un useEffect con setState.
  if (status !== previousStatus) {
    if (status === "completed" && previousStatus !== "completed") {
      setShowCelebration(true);
    }
    setPreviousStatus(status);
  }

  const category = getCategoryById(habit.categoryIds[0]);
  const isDuration = habit.goalType === "duration";
  const showProgress = isValueBasedGoal(habit.goalType) && !isDuration && habit.targetValue !== undefined;

  const menuItems: OverflowMenuItem[] = [
    {
      label: note ? "Editar nota" : "Nota rápida",
      icon: <NotebookPen size={16} />,
      onClick: () => setIsNoteOpen((current) => !current),
    },
    ...(status !== "not_applicable"
      ? [{ label: "Omitir hoy", icon: <MinusCircle size={16} />, onClick: onMarkNotApplicable }]
      : []),
    { label: "Reiniciar", icon: <RotateCcw size={16} />, onClick: onReset, tone: "danger" as const },
  ];

  return (
    <Card interactive className="relative flex flex-col gap-3 overflow-hidden">
      {showCelebration && <CompletionAnimation onFinished={() => setShowCelebration(false)} />}

      <div className="flex items-center gap-3">
        <StatusDot status={status} />
        <HabitIcon3D iconName={habit.icon} size={44} celebrate={showCelebration} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-text-primary">{habit.name}</p>
            {isReadOnly && <Lock size={13} className="shrink-0 text-text-disabled" aria-label="Solo lectura" />}
          </div>
          <p className="truncate text-xs text-text-secondary">
            Meta: {formatGoal(habit)}
            {category && ` · ${category.name}`}
          </p>
        </div>

        {habit.goalType === "boolean" && (
          <QuickBooleanSelector
            isCompleted={status === "completed"}
            disabled={isReadOnly}
            onToggle={() => onBooleanChange(status === "completed" ? "not_completed" : "completed")}
          />
        )}
        <OverflowMenu items={menuItems} label={`Más acciones para ${habit.name}`} />
      </div>

      {(habit.goalType === "quantity" || habit.goalType === "repetitions" || habit.goalType === "accumulated_days") && (
        <QuickCounter value={value ?? 0} disabled={isReadOnly} onChange={onValueChange} />
      )}

      {habit.goalType === "deadline" && (
        <DeadlinePicker recordedTime={recordedTime} disabled={isReadOnly} onChange={onTimeChange} />
      )}

      {isDuration && (
        <QuickTimeTracker
          value={value ?? 0}
          target={habit.targetValue ?? 0}
          unit={habit.targetUnit}
          disabled={isReadOnly}
          onFinish={onValueChange}
        />
      )}

      {showProgress && (
        <HabitProgress
          value={value ?? 0}
          target={habit.targetValue ?? 0}
          unit={habit.targetUnit}
          variant={status === "not_completed" ? "danger" : "success"}
        />
      )}

      <HabitQuickNote
        habitName={habit.name}
        note={note}
        isOpen={isNoteOpen}
        disabled={isReadOnly}
        onSave={onSaveNote}
        onClose={() => setIsNoteOpen(false)}
      />
    </Card>
  );
}
