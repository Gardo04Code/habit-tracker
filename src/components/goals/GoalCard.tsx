import { CalendarClock, CheckCircle2, Pencil, RotateCcw, Target, Trash2, Trophy, XCircle } from "lucide-react";
import type { Goal, GoalStatus } from "../../types/goal";
import type { Habit } from "../../types/habit";
import { calculatePercentage, isGoalExceeded } from "../../utils/calculateProgress";
import { formatShortDate } from "../../utils/formatDate";
import { getHabitIcon } from "../../utils/habitIcons";
import { Card } from "../ui/Card";
import { Badge, type BadgeTone } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { IconButton } from "../ui/IconButton";

interface GoalCardProps {
  goal: Goal;
  habit?: Habit;
  onEdit: () => void;
  onMarkCompleted?: () => void;
  onMarkExpired?: () => void;
  onReactivate?: () => void;
  onDelete: () => void;
}

const STATUS_META: Record<GoalStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Activa", tone: "primary" },
  completed: { label: "Cumplida", tone: "success" },
  expired: { label: "Vencida", tone: "danger" },
};

export function GoalCard({ goal, habit, onEdit, onMarkCompleted, onMarkExpired, onReactivate, onDelete }: GoalCardProps) {
  const HabitIcon = habit ? getHabitIcon(habit.icon) : Target;
  const percentage = calculatePercentage(goal.currentValue, goal.targetValue);
  const exceeded = isGoalExceeded(goal.currentValue, goal.targetValue);
  const statusMeta = STATUS_META[goal.status];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: habit?.color ?? "var(--color-purple)" }}
            aria-hidden="true"
          >
            {/* eslint-disable-next-line react-hooks/static-components -- getHabitIcon resolves a stable reference from a static icon map, it never defines a new component type. */}
            <HabitIcon size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">{goal.title}</p>
            <p className="text-xs text-text-secondary">{habit ? habit.name : "Meta general"}</p>
          </div>
        </div>
        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
      </div>

      {goal.description && <p className="text-xs text-text-secondary">{goal.description}</p>}

      <ProgressBar
        percentage={percentage}
        variant="purple"
        label={`${goal.currentValue} de ${goal.targetValue} ${goal.unit}`}
      />

      {exceeded && (
        <Badge tone="purple" className="w-fit">
          <Trophy size={12} aria-hidden="true" />
          Meta superada
        </Badge>
      )}

      <p className="flex items-center gap-1.5 text-xs text-text-secondary">
        <CalendarClock size={14} aria-hidden="true" />
        Fecha límite: {formatShortDate(goal.endDate)}
      </p>

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <IconButton icon={<Pencil size={16} />} label="Editar meta" variant="secondary" onClick={onEdit} />
        {onMarkCompleted && (
          <IconButton icon={<CheckCircle2 size={16} />} label="Marcar como cumplida" variant="secondary" onClick={onMarkCompleted} />
        )}
        {onMarkExpired && (
          <IconButton icon={<XCircle size={16} />} label="Marcar como vencida" variant="secondary" onClick={onMarkExpired} />
        )}
        {onReactivate && (
          <IconButton icon={<RotateCcw size={16} />} label="Reactivar meta" variant="secondary" onClick={onReactivate} />
        )}
        <IconButton icon={<Trash2 size={16} />} label="Eliminar meta" variant="danger" onClick={onDelete} className="ml-auto" />
      </div>
    </Card>
  );
}
