import { CalendarClock, Flag, Pause, Pencil, RotateCcw, Target, Trash2, Undo2 } from "lucide-react";
import type { Goal, GoalStatus } from "../../types/goal";
import type { Habit } from "../../types/habit";
import { calculatePercentage, clampDisplayPercentage, isGoalExceeded } from "../../utils/calculateProgress";
import { formatShortDate } from "../../utils/formatDate";
import { getHabitIcon } from "../../utils/habitIcons";
import { Badge, type BadgeTone } from "../ui/Badge";
import { IconButton } from "../ui/IconButton";
import { OverflowMenu, type OverflowMenuItem } from "../ui/OverflowMenu";

interface GoalListRowProps {
  goal: Goal;
  habit?: Habit;
  onEdit: () => void;
  onPause?: () => void;
  onReactivate?: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  isSaving?: boolean;
}

const STATUS_META: Record<GoalStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Activa", tone: "primary" },
  completed: { label: "Cumplida", tone: "success" },
  expired: { label: "Vencida", tone: "danger" },
};

const LIFECYCLE_META = {
  paused: { label: "Pausada", tone: "warning" as BadgeTone },
  deleted: { label: "En papelera", tone: "neutral" as BadgeTone },
};

const PROGRESS_SOURCE_LABEL: Record<string, string> = {
  habit_logs: "Automático",
  manual: "Manual",
  calculated: "Calculado",
};

export function GoalListRow({ goal, habit, onEdit, onPause, onReactivate, onDelete, onRestore, isSaving }: GoalListRowProps) {
  const HabitIcon = habit ? getHabitIcon(habit.icon) : Target;
  const percentage = calculatePercentage(goal.currentValue, goal.targetValue);
  const displayPercentage = clampDisplayPercentage(percentage);
  const exceeded = isGoalExceeded(goal.currentValue, goal.targetValue);
  const statusMeta = STATUS_META[goal.status];
  const lifecycleMeta = goal.lifecycleStatus && goal.lifecycleStatus !== "active" ? LIFECYCLE_META[goal.lifecycleStatus] : undefined;
  const isInTrash = goal.lifecycleStatus === "deleted";

  const menuItems: OverflowMenuItem[] = isInTrash
    ? [{ label: "Restaurar meta", icon: <Undo2 size={16} />, onClick: onRestore ?? (() => {}) }]
    : [
        ...(onPause ? [{ label: "Pausar meta", icon: <Pause size={16} />, onClick: onPause }] : []),
        ...(onReactivate ? [{ label: "Reactivar meta", icon: <RotateCcw size={16} />, onClick: onReactivate }] : []),
        { label: "Eliminar meta", icon: <Trash2 size={16} />, onClick: onDelete, tone: "danger" as const },
      ];

  return (
    <div className={`flex flex-col gap-3 border-b border-border p-4 last:border-0 lg:flex-row lg:items-center lg:gap-4 ${isSaving ? "opacity-60" : ""}`}>
      <div className="flex min-w-0 items-center gap-3 lg:w-80 lg:shrink-0">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: habit?.color ?? "var(--color-primary)" }}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line react-hooks/static-components -- getHabitIcon resolves a stable reference from a static icon map, it never defines a new component type. */}
          <HabitIcon size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">{goal.title}</p>
          <p className="truncate text-xs text-text-secondary">
            {habit ? habit.name : "Meta general"}
            {goal.progressSource && ` · ${PROGRESS_SOURCE_LABEL[goal.progressSource]}`}
          </p>
          {exceeded && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-primary">
              <Flag size={11} aria-hidden="true" />
              Meta superada
            </p>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="whitespace-nowrap text-xs text-text-secondary">
          {goal.currentValue} de {goal.targetValue} {goal.unit}
        </span>
        <span
          className="h-2 min-w-[60px] flex-1 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={displayPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={goal.title}
        >
          <span
            className={`block h-full rounded-full ${exceeded ? "bg-primary shadow-glow" : "bg-primary"}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </span>
        <span className="w-11 shrink-0 text-right text-sm font-semibold text-text-primary">{displayPercentage}%</span>
      </div>

      <div className="flex items-center justify-between gap-3 lg:w-auto lg:shrink-0 lg:justify-end">
        <span className="flex items-center gap-1.5 text-xs text-text-secondary lg:w-32">
          <CalendarClock size={13} aria-hidden="true" />
          <span>
            <span className="block text-[10px] tracking-wide text-text-disabled uppercase">Fecha límite</span>
            {formatShortDate(goal.endDate)}
          </span>
        </span>
        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
        {lifecycleMeta && <Badge tone={lifecycleMeta.tone}>{lifecycleMeta.label}</Badge>}
        <div className="flex items-center gap-1.5">
          <IconButton icon={<Pencil size={15} />} label="Editar meta" variant="secondary" onClick={onEdit} disabled={isInTrash} />
          <OverflowMenu items={menuItems} label={`Más acciones para ${goal.title}`} />
        </div>
      </div>
    </div>
  );
}
