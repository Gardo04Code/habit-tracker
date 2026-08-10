import { Archive, Pause, Pencil, Play, RotateCcw, Trash2 } from "lucide-react";
import type { Habit } from "../../types/habit";
import { formatFrequency } from "../../utils/formatFrequency";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { IconButton } from "../ui/IconButton";
import { OverflowMenu, type OverflowMenuItem } from "../ui/OverflowMenu";
import { HabitIcon3D } from "../ui/HabitIcon3D";

interface HabitListRowProps {
  habit: Habit;
  recentCompletionRate: number;
  categories: { id: string; name: string }[];
  onEdit: () => void;
  onPause?: () => void;
  onReactivate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onHardDelete?: () => void;
}

export function HabitListRow({
  habit,
  recentCompletionRate,
  categories: allCategories,
  onEdit,
  onPause,
  onReactivate,
  onArchive,
  onDelete,
  onRestore,
  onHardDelete,
}: HabitListRowProps) {
  const categories = habit.categoryIds
    .map((id) => allCategories.find((category) => category.id === id))
    .filter(Boolean);
  const statusDotClass =
    habit.lifecycleStatus !== "active" ? "bg-text-disabled" : recentCompletionRate < 50 ? "bg-warning" : "bg-success";

  const menuItems: OverflowMenuItem[] = [
    ...(onPause ? [{ label: "Pausar hábito", icon: <Pause size={16} />, onClick: onPause }] : []),
    ...(onReactivate ? [{ label: "Reactivar hábito", icon: <Play size={16} />, onClick: onReactivate }] : []),
    ...(onArchive ? [{ label: "Archivar hábito", icon: <Archive size={16} />, onClick: onArchive }] : []),
    ...(onRestore ? [{ label: "Restaurar hábito", icon: <RotateCcw size={16} />, onClick: onRestore }] : []),
    ...(onDelete
      ? [{ label: "Eliminar hábito", icon: <Trash2 size={16} />, onClick: onDelete, tone: "danger" as const }]
      : []),
    ...(onHardDelete
      ? [
          {
            label: "Eliminar definitivamente",
            icon: <Trash2 size={16} />,
            onClick: onHardDelete,
            tone: "danger" as const,
          },
        ]
      : []),
  ];

  return (
    <Card interactive className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass}`}
        role="img"
        aria-label={habit.lifecycleStatus === "active" ? "Hábito activo" : "Hábito inactivo"}
      />
      <HabitIcon3D iconName={habit.icon} color={habit.color} size={38} />

      <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
        <p className="truncate text-sm font-semibold text-text-primary">{habit.name}</p>
        <p className="truncate text-xs text-text-secondary">{formatFrequency(habit)}</p>
      </div>

      <div className="hidden shrink-0 gap-1.5 lg:flex">
        {categories.map((category) => (
          <Badge key={category!.id} tone="neutral">
            {category!.name}
          </Badge>
        ))}
      </div>

      <div className="min-w-[140px] flex-1">
        <ProgressBar
          percentage={recentCompletionRate}
          variant={recentCompletionRate >= 70 ? "success" : recentCompletionRate >= 40 ? "warning" : "danger"}
          showValue
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <IconButton icon={<Pencil size={16} />} label="Editar hábito" variant="secondary" onClick={onEdit} />
        {menuItems.length > 0 && <OverflowMenu items={menuItems} label={`Más acciones para ${habit.name}`} />}
      </div>
    </Card>
  );
}
