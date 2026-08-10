import { Activity, Archive, Clock3, Flame, Gauge, Pause, Pencil, Play, RotateCcw, Star, Trash2 } from "lucide-react";
import type { Habit } from "../../types/habit";
import { formatFrequency, formatGoal } from "../../utils/formatFrequency";
import { calculateBestStreak, calculateCurrentStreak } from "../../utils/streaks";
import { calculateAverageLoggedValue, calculateAverageRecordedTime, countCompletedSessions } from "../../utils/habitStats";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { IconButton } from "../ui/IconButton";
import { OverflowMenu, type OverflowMenuItem } from "../ui/OverflowMenu";
import { TiltCard } from "../ui/TiltCard";
import { HabitIcon3D } from "../ui/HabitIcon3D";

interface HabitCardProps {
  habit: Habit;
  recentCompletionRate: number;
  /** Todas las categorías propias (activas y en papelera) — una asociación
   * con una categoría eliminada debe seguir mostrando su nombre. */
  categories: { id: string; name: string }[];
  onEdit: () => void;
  onPause?: () => void;
  onReactivate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onHardDelete?: () => void;
}

const VALUE_GOAL_TYPES = ["quantity", "duration", "repetitions", "accumulated_days"];

function getStatDots(habit: Habit) {
  if (VALUE_GOAL_TYPES.includes(habit.goalType)) {
    const avg = calculateAverageLoggedValue(habit.id);
    return [
      { icon: Gauge, label: "Promedio", value: avg !== null ? `${avg} ${habit.targetUnit ?? ""}`.trim() : "—" },
      { icon: Star, label: "Mejor racha", value: `${calculateBestStreak(habit)} días` },
    ];
  }
  if (habit.goalType === "deadline") {
    const avgTime = calculateAverageRecordedTime(habit.id);
    return [
      { icon: Star, label: "Mejor racha", value: `${calculateBestStreak(habit)} días` },
      { icon: Clock3, label: "Promedio", value: avgTime ?? "—" },
    ];
  }
  return [
    { icon: Flame, label: "Racha actual", value: `${calculateCurrentStreak(habit)} días` },
    { icon: Activity, label: "Sesiones", value: `${countCompletedSessions(habit.id)}` },
  ];
}

export function HabitCard({
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
}: HabitCardProps) {
  const categories = habit.categoryIds
    .map((id) => allCategories.find((category) => category.id === id))
    .filter(Boolean);
  const stats = getStatDots(habit);
  const statusDotClass =
    habit.lifecycleStatus !== "active"
      ? "bg-text-disabled"
      : recentCompletionRate < 50
        ? "bg-warning shadow-glow"
        : "bg-success shadow-glow";

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
    <TiltCard maxTilt={5}>
      <Card interactive className="relative flex h-full flex-col gap-4">
        <span
          className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${statusDotClass}`}
          role="img"
          aria-label={habit.lifecycleStatus === "active" ? "Hábito activo" : "Hábito inactivo"}
        />

        <div className="flex items-start gap-3">
          <HabitIcon3D iconName={habit.icon} color={habit.color} size={44} />
          <div className="min-w-0 flex-1 pr-4">
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

        <div className="mt-auto flex items-center gap-4 border-t border-border pt-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex min-w-0 items-center gap-1.5">
              <stat.icon size={14} className="shrink-0 text-text-disabled" aria-hidden="true" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs font-semibold text-text-primary">{stat.value}</p>
                <p className="truncate text-[10px] text-text-disabled">{stat.label}</p>
              </div>
            </div>
          ))}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <IconButton icon={<Pencil size={16} />} label="Editar hábito" variant="secondary" onClick={onEdit} />
            {menuItems.length > 0 && <OverflowMenu items={menuItems} label={`Más acciones para ${habit.name}`} />}
          </div>
        </div>
      </Card>
    </TiltCard>
  );
}
