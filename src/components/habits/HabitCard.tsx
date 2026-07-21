import { Archive, Pause, Pencil, Play, RotateCcw, Trash2 } from "lucide-react";
import type { Habit } from "../../types/habit";
import { getCategoryById } from "../../data/mockCategories";
import { getHabitIcon } from "../../utils/habitIcons";
import { formatFrequency, formatGoal } from "../../utils/formatFrequency";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { IconButton } from "../ui/IconButton";

interface HabitCardProps {
  habit: Habit;
  recentCompletionRate: number;
  onEdit: () => void;
  onPause?: () => void;
  onReactivate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onHardDelete?: () => void;
}

export function HabitCard({
  habit,
  recentCompletionRate,
  onEdit,
  onPause,
  onReactivate,
  onArchive,
  onDelete,
  onRestore,
  onHardDelete,
}: HabitCardProps) {
  const Icon = getHabitIcon(habit.icon);
  const categories = habit.categoryIds.map(getCategoryById).filter(Boolean);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: habit.color }}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line react-hooks/static-components -- getHabitIcon resolves a stable reference from a static icon map, it never defines a new component type. */}
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">{habit.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <Badge key={category!.id} tone="neutral">
                {category!.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-text-secondary">
        {formatGoal(habit)} · {formatFrequency(habit)}
      </p>

      <ProgressBar
        percentage={recentCompletionRate}
        variant={recentCompletionRate >= 70 ? "success" : recentCompletionRate >= 40 ? "warning" : "danger"}
        label="Cumplimiento últimos 14 días"
      />

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <IconButton icon={<Pencil size={16} />} label="Editar hábito" variant="secondary" onClick={onEdit} />
        {onPause && <IconButton icon={<Pause size={16} />} label="Pausar hábito" variant="secondary" onClick={onPause} />}
        {onReactivate && (
          <IconButton icon={<Play size={16} />} label="Reactivar hábito" variant="secondary" onClick={onReactivate} />
        )}
        {onArchive && (
          <IconButton icon={<Archive size={16} />} label="Archivar hábito" variant="secondary" onClick={onArchive} />
        )}
        {onRestore && (
          <IconButton icon={<RotateCcw size={16} />} label="Restaurar hábito" variant="secondary" onClick={onRestore} />
        )}
        {onDelete && (
          <IconButton icon={<Trash2 size={16} />} label="Eliminar hábito" variant="danger" onClick={onDelete} className="ml-auto" />
        )}
        {onHardDelete && (
          <IconButton
            icon={<Trash2 size={16} />}
            label="Eliminar definitivamente"
            variant="danger"
            onClick={onHardDelete}
            className="ml-auto"
          />
        )}
      </div>
    </Card>
  );
}
