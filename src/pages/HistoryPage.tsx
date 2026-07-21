import { useHistoryLogs } from "../hooks/useHistoryLogs";
import { SectionHeader } from "../components/ui/SectionHeader";
import { HistoryFilters } from "../components/history/HistoryFilters";
import { HistorySummary } from "../components/history/HistorySummary";
import { HistoryTable } from "../components/history/HistoryTable";
import { HistoryCalendar } from "../components/history/HistoryCalendar";

export function HistoryPage() {
  const {
    dateFrom,
    dateTo,
    habitId,
    categoryId,
    status,
    view,
    setDateFrom,
    setDateTo,
    setHabitId,
    setCategoryId,
    setStatus,
    setView,
    entries,
    summary,
  } = useHistoryLogs();

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Historial" description="Consulta tus registros anteriores por fecha, hábito o estado." />

      <HistoryFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        habitId={habitId}
        categoryId={categoryId}
        status={status}
        view={view}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onHabitChange={setHabitId}
        onCategoryChange={setCategoryId}
        onStatusChange={setStatus}
        onViewChange={setView}
      />

      <HistorySummary summary={summary} />

      {view === "table" ? (
        <HistoryTable entries={entries} />
      ) : (
        <HistoryCalendar habitId={habitId} categoryId={categoryId} />
      )}
    </div>
  );
}
