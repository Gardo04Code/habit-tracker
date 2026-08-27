import { CalendarClock, Info, Pause, Pencil, RotateCcw, Trash2, Undo2 } from "lucide-react";
import type { Goal } from "../../types/goal";
import { calculatePercentage, clampDisplayPercentage, isGoalExceeded } from "../../utils/calculateProgress";
import { formatShortDate, daysBetween } from "../../utils/formatDate";
import { calculateDailyCompletionTrend } from "../../utils/habitStats";
import { TODAY } from "../../data/referenceDate";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { CircularProgress } from "../ui/CircularProgress";
import { Sparkline } from "../ui/Sparkline";
import { IconButton } from "../ui/IconButton";
import { OverflowMenu, type OverflowMenuItem } from "../ui/OverflowMenu";

interface GoalGeneralHeroProps {
  goal: Goal;
  sectionDescription: string;
  onEdit?: () => void;
  onPause?: () => void;
  onReactivate?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  isSaving?: boolean;
}

function motivationMessage(percentage: number, exceeded: boolean): string {
  if (exceeded) return "¡Superaste la meta! Un cierre de mes excelente. 🏆";
  if (percentage >= 90) return "Vas muy bien. ¡Sigue así! ✨";
  if (percentage >= 60) return "Vas por buen camino, mantén el ritmo.";
  return "Aún puedes lograrlo, enfócate en los próximos días.";
}

export function GoalGeneralHero({
  goal,
  sectionDescription,
  onEdit,
  onPause,
  onReactivate,
  onDelete,
  onRestore,
  isSaving,
}: GoalGeneralHeroProps) {
  const percentage = calculatePercentage(goal.currentValue, goal.targetValue);
  const displayPercentage = clampDisplayPercentage(percentage);
  const exceeded = isGoalExceeded(goal.currentValue, goal.targetValue);
  const trendDays = Math.min(Math.max(daysBetween(goal.startDate, TODAY) + 1, 2), 30);
  const trend = calculateDailyCompletionTrend(trendDays);
  const isInTrash = goal.lifecycleStatus === "deleted";

  const menuItems: OverflowMenuItem[] = isInTrash
    ? [{ label: "Restaurar meta", icon: <Undo2 size={16} />, onClick: onRestore ?? (() => {}) }]
    : [
        ...(onPause && goal.lifecycleStatus !== "paused"
          ? [{ label: "Pausar meta", icon: <Pause size={16} />, onClick: onPause }]
          : []),
        ...(onReactivate && goal.lifecycleStatus === "paused"
          ? [{ label: "Reactivar meta", icon: <RotateCcw size={16} />, onClick: onReactivate }]
          : []),
        ...(onDelete ? [{ label: "Eliminar meta", icon: <Trash2 size={16} />, onClick: onDelete, tone: "danger" as const }] : []),
      ];

  return (
    <Card className={`grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.3fr_auto_1fr] ${isSaving ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">Meta general</p>
          {(onEdit || menuItems.length > 0) && (
            <div className="flex items-center gap-1">
              {onEdit && <IconButton icon={<Pencil size={14} />} label="Editar meta" variant="secondary" onClick={onEdit} disabled={isInTrash} />}
              {menuItems.length > 0 && <OverflowMenu items={menuItems} label={`Más acciones para ${goal.title}`} />}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-text-primary">{goal.title}</h3>
          <p className="mt-0.5 text-sm text-text-secondary">{sectionDescription}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* BUG-PROD-007: goal.status (logro: active/completed/expired) y
              goal.lifecycleStatus (ciclo de vida: active/paused/deleted) son
              ejes independientes (20260731004632_goal_progress_source.sql) —
              mostrar el badge de logro "Activa" a la vez que "Pausada"/"En
              papelera" es engañoso porque comparten la misma palabra para
              dos cosas distintas. "Cumplida"/"Vencida" sí son información
              real independiente del lifecycle y siempre se muestran. */}
          {!(goal.status === "active" && goal.lifecycleStatus !== "active") && (
            <Badge tone={goal.status === "active" ? "primary" : goal.status === "completed" ? "success" : "danger"} className="w-fit">
              {goal.status === "active" ? "Activa" : goal.status === "completed" ? "Cumplida" : "Vencida"}
            </Badge>
          )}
          {goal.lifecycleStatus === "paused" && <Badge tone="warning">Pausada</Badge>}
          {goal.lifecycleStatus === "deleted" && <Badge tone="neutral">En papelera</Badge>}
          {goal.progressSource && (
            <Badge tone="neutral">{goal.progressSource === "habit_logs" ? "Progreso automático" : "Progreso manual"}</Badge>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-6 border-t border-border pt-4">
          <div className="flex items-start gap-2">
            <CalendarClock size={16} className="mt-0.5 shrink-0 text-text-secondary" aria-hidden="true" />
            <div>
              <p className="text-[11px] tracking-wide text-text-disabled uppercase">Fecha límite</p>
              <p className="text-sm font-medium text-text-primary">{formatShortDate(goal.endDate)}</p>
            </div>
          </div>
          {goal.description && (
            <div className="flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0 text-text-secondary" aria-hidden="true" />
              <div>
                <p className="text-[11px] tracking-wide text-text-disabled uppercase">Objetivo</p>
                <p className="text-sm font-medium text-text-primary">{goal.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="justify-self-center">
        <CircularProgress percentage={percentage} size={168} strokeWidth={10} glow="var(--color-primary)">
          <div className="flex flex-col items-center">
            <span className="text-4xl font-bold text-text-primary">
              {displayPercentage}
              <span className="text-xl">%</span>
            </span>
            <span className="mt-1 text-xs text-text-secondary">
              {goal.currentValue} de {goal.targetValue} {goal.unit}
            </span>
          </div>
        </CircularProgress>
      </div>

      <div className="shadow-elevation-1 relative flex flex-col gap-2 rounded-2xl border border-border bg-surface-elevated p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">Progreso general</p>
          <Badge tone="primary">{displayPercentage}%</Badge>
        </div>
        <p className="text-lg font-bold text-text-primary">
          {goal.currentValue} de {goal.targetValue} {goal.unit}
        </p>
        <Sparkline data={trend} width={240} height={56} color="var(--color-primary)" className="w-full" />
        <p className="text-xs text-text-secondary">{motivationMessage(percentage, exceeded)}</p>
      </div>
    </Card>
  );
}
