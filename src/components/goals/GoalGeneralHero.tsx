import { CalendarClock, Info } from "lucide-react";
import type { Goal } from "../../types/goal";
import { calculatePercentage, clampDisplayPercentage, isGoalExceeded } from "../../utils/calculateProgress";
import { formatShortDate, daysBetween } from "../../utils/formatDate";
import { calculateDailyCompletionTrend } from "../../utils/habitStats";
import { TODAY } from "../../data/referenceDate";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { CircularProgress } from "../ui/CircularProgress";
import { Sparkline } from "../ui/Sparkline";

interface GoalGeneralHeroProps {
  goal: Goal;
  sectionDescription: string;
}

function motivationMessage(percentage: number, exceeded: boolean): string {
  if (exceeded) return "¡Superaste la meta! Un cierre de mes excelente. 🏆";
  if (percentage >= 90) return "Vas muy bien. ¡Sigue así! ✨";
  if (percentage >= 60) return "Vas por buen camino, mantén el ritmo.";
  return "Aún puedes lograrlo, enfócate en los próximos días.";
}

export function GoalGeneralHero({ goal, sectionDescription }: GoalGeneralHeroProps) {
  const percentage = calculatePercentage(goal.currentValue, goal.targetValue);
  const displayPercentage = clampDisplayPercentage(percentage);
  const exceeded = isGoalExceeded(goal.currentValue, goal.targetValue);
  const trendDays = Math.min(Math.max(daysBetween(goal.startDate, TODAY) + 1, 2), 30);
  const trend = calculateDailyCompletionTrend(trendDays);

  return (
    <Card className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.3fr_auto_1fr]">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Meta general</p>
        <div>
          <h3 className="text-xl font-bold text-text-primary">{goal.title}</h3>
          <p className="mt-0.5 text-sm text-text-secondary">{sectionDescription}</p>
        </div>
        <Badge tone={goal.status === "active" ? "primary" : goal.status === "completed" ? "success" : "danger"} className="w-fit">
          {goal.status === "active" ? "Activa" : goal.status === "completed" ? "Cumplida" : "Vencida"}
        </Badge>

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
