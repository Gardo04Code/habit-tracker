import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, MinusCircle, Target, Timer, Trophy } from "lucide-react";
import type { ChecklistEntry } from "../../hooks/useDailyChecklist";
import { mockDashboard } from "../../data/mockDashboard";
import { getInsights, estimateTodaySuccessProbability } from "../../utils/insightsEngine";
import { pickBestEntryOfDay } from "../../utils/checklistMotivation";
import { getHabitAccent } from "../../utils/habitAccent";
import { Card } from "../ui/Card";
import { CircularProgress } from "../ui/CircularProgress";
import { HabitIcon3D } from "../ui/HabitIcon3D";
import { InsightAvatar } from "../dashboard/InsightAvatar";

interface AIAssistantPanelProps {
  entries: ChecklistEntry[];
  date: string;
}

export function AIAssistantPanel({ entries, date }: AIAssistantPanelProps) {
  const completed = entries.filter((entry) => entry.status === "completed").length;
  const pending = entries.filter((entry) => entry.status === "pending").length;
  const skipped = entries.filter((entry) => entry.status === "not_applicable").length;
  const total = entries.length;
  const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const timeInvestedMinutes = entries.reduce((sum, entry) => {
    if (entry.habit.goalType === "duration" && entry.value) return sum + entry.value;
    return sum;
  }, 0);

  const successProbability = useMemo(() => estimateTodaySuccessProbability(date), [date]);
  const topInsight = useMemo(() => getInsights()[0], []);
  const bestEntry = useMemo(() => pickBestEntryOfDay(entries), [entries]);

  const weekBars = mockDashboard.weeklyProgress;
  const maxRate = Math.max(...weekBars.map((point) => point.completionRate), 1);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="text-sm font-semibold text-text-primary">Resumen del día</h2>
        <div className="mt-3 flex items-center gap-4">
          <CircularProgress percentage={completionPercentage} size={64} strokeWidth={6} color="var(--color-primary)">
            <span className="text-sm font-bold text-text-primary">{total}</span>
          </CircularProgress>
          <ul className="flex-1 text-sm">
            <li className="flex items-center justify-between gap-2 py-1">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <CheckCircle2 size={13} className="text-success" aria-hidden="true" />
                Completados
              </span>
              <span className="font-semibold text-success">{completed}</span>
            </li>
            <li className="flex items-center justify-between gap-2 py-1">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <Circle size={13} className="text-text-disabled" aria-hidden="true" />
                Pendientes
              </span>
              <span className="font-semibold text-text-primary">{pending}</span>
            </li>
            <li className="flex items-center justify-between gap-2 py-1">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <MinusCircle size={13} className="text-text-disabled" aria-hidden="true" />
                Omitidos
              </span>
              <span className="font-semibold text-text-primary">{skipped}</span>
            </li>
          </ul>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-text-secondary">
            <Timer size={12} aria-hidden="true" />
            {timeInvestedMinutes} min invertidos
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-text-secondary">
            <Target size={12} aria-hidden="true" />
            {successProbability}% prob. de éxito
          </span>
        </div>
      </Card>

      {topInsight && (
        <Card className="flex items-start gap-3">
          <InsightAvatar size={32} />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary">Consejo de tu IA</h2>
            <p className="mt-1 text-sm text-text-secondary">{topInsight.title}.</p>
          </div>
        </Card>
      )}

      {bestEntry && (
        <Card className="flex items-center gap-3">
          <HabitIcon3D iconName={bestEntry.icon} size={40} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-secondary">Mejor hábito de hoy</p>
            <p className="text-sm font-semibold text-text-primary">{bestEntry.habitName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: getHabitAccent(bestEntry.icon).base }}>
              {bestEntry.goalExceeded && <Trophy size={11} aria-hidden="true" />}
              {bestEntry.goalExceeded ? "¡Superaste tu meta!" : `${bestEntry.percentage}% completado`}
            </p>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Rendimiento semanal</h2>
          <Link to="/statistics" className="text-xs font-medium text-primary hover:underline">
            Ver estadísticas
          </Link>
        </div>
        <div className="mt-3 flex items-end gap-2">
          {weekBars.map((point) => (
            <div key={point.date} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-12 w-full items-end justify-center">
                <div
                  className="w-2.5 rounded-t-md bg-primary/80"
                  style={{ height: `${Math.max(10, (point.completionRate / maxRate) * 100)}%` }}
                  title={`${point.label}: ${point.completionRate}%`}
                />
              </div>
              <span className="text-[10px] capitalize text-text-disabled">{point.label.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
