import { CalendarDays, Flame, Sparkles, ThumbsDown, ThumbsUp, TrendingUp, Trophy } from "lucide-react";
import type { useStatistics } from "../../hooks/useStatistics";
import { KpiCard } from "../ui/KpiCard";

interface StatisticsKpisProps {
  kpis: ReturnType<typeof useStatistics>["kpis"];
  trend: number[];
}

export function StatisticsKpis({ kpis, trend }: StatisticsKpisProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={<CalendarDays size={18} aria-hidden="true" />}
        label="Cumpl. diario"
        value={`${kpis.daily}%`}
        trend={trend}
        tone="primary"
        index={0}
      />
      <KpiCard
        icon={<TrendingUp size={18} aria-hidden="true" />}
        label="Cumpl. semanal"
        value={`${kpis.weekly}%`}
        trend={trend}
        tone="info"
        index={1}
      />
      <KpiCard
        icon={<Sparkles size={18} aria-hidden="true" />}
        label="Cumpl. mensual"
        value={`${kpis.monthly}%`}
        trend={trend}
        tone="success"
        index={2}
      />
      <KpiCard
        icon={<Trophy size={18} aria-hidden="true" />}
        label="Mejor día"
        value={kpis.bestWeekday ? kpis.bestWeekday.weekday : "—"}
        sublabel={kpis.bestWeekday ? `${kpis.bestWeekday.rate}% promedio` : "Sin datos"}
        trend={trend}
        tone="warning"
        index={3}
      />
      <KpiCard
        icon={<ThumbsDown size={18} aria-hidden="true" />}
        label="Día más débil"
        value={kpis.worstWeekday ? kpis.worstWeekday.weekday : "—"}
        sublabel={kpis.worstWeekday ? `${kpis.worstWeekday.rate}% promedio` : "Sin datos"}
        trend={trend}
        tone="danger"
        index={4}
      />
      <KpiCard
        icon={<ThumbsUp size={18} aria-hidden="true" />}
        label="Racha actual"
        value={`${kpis.currentStreak} días`}
        trend={trend}
        tone="primary"
        index={5}
      />
      <KpiCard
        icon={<Flame size={18} aria-hidden="true" />}
        label="Mejor racha"
        value={`${kpis.bestStreak} días`}
        trend={trend}
        tone="info"
        index={6}
      />
    </div>
  );
}
