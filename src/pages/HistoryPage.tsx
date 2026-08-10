import { History as HistoryIcon, Upload } from "lucide-react";
import { useHistoryLogs } from "../hooks/useHistoryLogs";
import { downloadHistoryCsv } from "../utils/exportHistory";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
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
    page,
    totalPages,
    pageSize,
    setDateFrom,
    setDateTo,
    setHabitId,
    setCategoryId,
    setStatus,
    setView,
    setPage,
    entries,
    paginatedEntries,
    allEntries,
    summary,
    comparison,
    habitOptions,
    categoryOptions,
    loading,
    error,
  } = useHistoryLogs();

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={<HistoryIcon size={20} aria-hidden="true" />}
        title="Historial"
        description="Consulta tus registros anteriores por fecha, hábito o estado."
        action={
          <Button
            variant="secondary"
            leadingIcon={<Upload size={16} />}
            disabled={entries.length === 0}
            onClick={() => downloadHistoryCsv(entries, dateFrom, dateTo)}
          >
            Exportar
          </Button>
        }
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <HistoryFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        habitId={habitId}
        categoryId={categoryId}
        status={status}
        view={view}
        habitOptions={habitOptions}
        categoryOptions={categoryOptions}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onHabitChange={setHabitId}
        onCategoryChange={setCategoryId}
        onStatusChange={setStatus}
        onViewChange={setView}
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <>
          <HistorySummary summary={summary} comparison={comparison} />

          {view === "table" ? (
            <HistoryTable
              entries={paginatedEntries}
              totalEntries={entries.length}
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          ) : (
            <HistoryCalendar entries={allEntries} habitId={habitId} categoryId={categoryId} />
          )}
        </>
      )}
    </div>
  );
}
