import { CalendarDays, Flame, Sparkles, ThumbsDown, ThumbsUp, TrendingUp, Trophy } from "lucide-react";
import type { useStatistics } from "../../hooks/useStatistics";
import { MetricCard } from "../dashboard/MetricCard";

interface StatisticsKpisProps {
  kpis: ReturnType<typeof useStatistics>["kpis"];
}

export function StatisticsKpis({ kpis }: StatisticsKpisProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={<CalendarDays size={18} aria-hidden="true" />} label="Cumplimiento diario" value={`${kpis.daily}%`} tone="primary" />
      <MetricCard icon={<TrendingUp size={18} aria-hidden="true" />} label="Cumplimiento semanal" value={`${kpis.weekly}%`} tone="primary" />
      <MetricCard icon={<Sparkles size={18} aria-hidden="true" />} label="Cumplimiento mensual" value={`${kpis.monthly}%`} tone="success" />
      <MetricCard
        icon={<ThumbsUp size={18} aria-hidden="true" />}
        label="Mejor día"
        value={kpis.bestWeekday ? kpis.bestWeekday.weekday : "—"}
        helpText={kpis.bestWeekday ? `${kpis.bestWeekday.rate}% de cumplimiento` : "Sin datos suficientes"}
        tone="success"
      />
      <MetricCard
        icon={<ThumbsDown size={18} aria-hidden="true" />}
        label="Día más débil"
        value={kpis.worstWeekday ? kpis.worstWeekday.weekday : "—"}
        helpText={kpis.worstWeekday ? `${kpis.worstWeekday.rate}% de cumplimiento` : "Sin datos suficientes"}
        tone="purple"
      />
      <MetricCard icon={<Flame size={18} aria-hidden="true" />} label="Racha actual" value={`${kpis.currentStreak} días`} tone="streak" />
      <MetricCard icon={<Trophy size={18} aria-hidden="true" />} label="Mejor racha" value={`${kpis.bestStreak} días`} tone="streak" />
    </div>
  );
}
