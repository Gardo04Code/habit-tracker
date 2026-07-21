import { CalendarCheck2, CheckCircle2, TrendingUp, Trophy } from "lucide-react";
import type { useHistoryLogs } from "../../hooks/useHistoryLogs";
import { MetricCard } from "../dashboard/MetricCard";

interface HistorySummaryProps {
  summary: ReturnType<typeof useHistoryLogs>["summary"];
}

export function HistorySummary({ summary }: HistorySummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={<TrendingUp size={18} aria-hidden="true" />}
        label="Cumplimiento del periodo"
        value={`${summary.percentage}%`}
        tone="primary"
      />
      <MetricCard
        icon={<CheckCircle2 size={18} aria-hidden="true" />}
        label="Días completos"
        value={String(summary.completed)}
        tone="success"
      />
      <MetricCard
        icon={<CalendarCheck2 size={18} aria-hidden="true" />}
        label="Días parciales"
        value={String(summary.partial)}
        tone="streak"
      />
      <MetricCard
        icon={<Trophy size={18} aria-hidden="true" />}
        label="Metas superadas"
        value={String(summary.goalsExceeded)}
        tone="purple"
      />
    </div>
  );
}
