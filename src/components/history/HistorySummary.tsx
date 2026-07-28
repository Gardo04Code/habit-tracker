import { CalendarCheck2, CheckCircle2, TrendingUp, Trophy } from "lucide-react";
import type { useHistoryLogs } from "../../hooks/useHistoryLogs";
import { KpiCard } from "../ui/KpiCard";

interface HistorySummaryProps {
  summary: ReturnType<typeof useHistoryLogs>["summary"];
  comparison: ReturnType<typeof useHistoryLogs>["comparison"];
}

export function HistorySummary({ summary, comparison }: HistorySummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={<TrendingUp size={18} aria-hidden="true" />}
        label="Cumplimiento"
        value={`${summary.percentage}%`}
        delta={comparison.percentageDelta}
        trend={comparison.trend}
        tone="primary"
        index={0}
      />
      <KpiCard
        icon={<CheckCircle2 size={18} aria-hidden="true" />}
        label="Días completos"
        value={String(summary.completed)}
        delta={comparison.completedDelta}
        deltaLabel=" vs. periodo anterior"
        trend={comparison.trend}
        tone="success"
        index={1}
      />
      <KpiCard
        icon={<CalendarCheck2 size={18} aria-hidden="true" />}
        label="Días parciales"
        value={String(summary.partial)}
        delta={comparison.partialDelta}
        deltaLabel=" vs. periodo anterior"
        trend={comparison.trend}
        tone="warning"
        index={2}
      />
      <KpiCard
        icon={<Trophy size={18} aria-hidden="true" />}
        label="Metas superadas"
        value={String(summary.goalsExceeded)}
        delta={comparison.goalsExceededDelta}
        deltaLabel=" vs. periodo anterior"
        trend={comparison.trend}
        tone="info"
        index={3}
      />
    </div>
  );
}
