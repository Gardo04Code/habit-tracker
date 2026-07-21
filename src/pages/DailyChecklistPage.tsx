import { ListChecks } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { HabitStatus } from "../types/habit";
import { useDailyChecklist } from "../hooks/useDailyChecklist";
import { TODAY } from "../data/referenceDate";
import { DateSelector } from "../components/ui/DateSelector";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { ChecklistSummary } from "../components/checklist/ChecklistSummary";
import { StatusFilter } from "../components/checklist/StatusFilter";
import { DailyHabitCard } from "../components/checklist/DailyHabitCard";

const STATUS_LIST: HabitStatus[] = ["pending", "completed", "partial", "not_completed", "not_applicable"];
const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function DailyChecklistPage() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const initialDate = dateParam && DATE_PARAM_PATTERN.test(dateParam) ? dateParam : TODAY;

  const {
    selectedDate,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    statusFilter,
    setStatusFilter,
    allEntries,
    filteredEntries,
    setBooleanStatus,
    setValue,
    setRecordedTime,
    markNotApplicable,
    setNote,
  } = useDailyChecklist(initialDate);

  const counts = STATUS_LIST.reduce(
    (acc, status) => {
      acc[status] = allEntries.filter((entry) => entry.status === status).length;
      return acc;
    },
    {} as Record<HabitStatus, number>,
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Checklist diario"
        description="Registra el avance de tus hábitos programados para la fecha seleccionada."
        action={<DateSelector date={selectedDate} onPrevious={goToPreviousDay} onNext={goToNextDay} onToday={goToToday} />}
      />

      {allEntries.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={22} aria-hidden="true" />}
          title="No hay hábitos programados para este día"
          description="Prueba con otra fecha o crea un nuevo hábito desde Mis hábitos."
        />
      ) : (
        <>
          <ChecklistSummary entries={allEntries} />
          <StatusFilter value={statusFilter} onChange={setStatusFilter} counts={counts} />

          {filteredEntries.length === 0 ? (
            <EmptyState
              icon={<ListChecks size={22} aria-hidden="true" />}
              title="No hay hábitos con este estado"
              description="Ajusta el filtro para ver el resto de tus hábitos del día."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredEntries.map((entry) => (
                <DailyHabitCard
                  key={entry.habit.id}
                  entry={entry}
                  onBooleanChange={(status) => setBooleanStatus(entry.habit, status)}
                  onValueChange={(value) => setValue(entry.habit, value)}
                  onTimeChange={(time) => setRecordedTime(entry.habit, time)}
                  onMarkNotApplicable={() => markNotApplicable(entry.habit)}
                  onSaveNote={(note) => setNote(entry.habit, note)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
