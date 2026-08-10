import { useState } from "react";
import { ListChecks, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import type { HabitStatus } from "../types/habit";
import { useDailyChecklist } from "../hooks/useDailyChecklist";
import { TODAY } from "../data/referenceDate";
import { mockUser } from "../data/mockUser";
import { isSupabaseDataSource } from "../lib/dataSource";
import { toDateOnly } from "../utils/formatDate";
import { calculateBestAggregateStreak, calculateCurrentAggregateStreak } from "../utils/streakTimeline";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusFilter } from "../components/checklist/StatusFilter";
import { HabitMissionCard } from "../components/checklist/HabitMissionCard";
import { MotivationHeader } from "../components/checklist/MotivationHeader";
import { AIAssistantPanel } from "../components/checklist/AIAssistantPanel";

const STATUS_LIST: HabitStatus[] = ["pending", "completed", "partial", "not_completed", "not_applicable"];
const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export function DailyChecklistPage() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  // TODAY (src/data/referenceDate.ts) es una fecha fija de la era mock
  // ("2026-07-21"), usada deliberadamente para que el histórico simulado
  // sea coherente. En modo Supabase no tiene sentido: el checklist debe
  // abrir en la fecha real de hoy, no en esa fecha fija del pasado.
  const defaultDate = isSupabaseDataSource ? toDateOnly(new Date()) : TODAY;
  const initialDate = dateParam && DATE_PARAM_PATTERN.test(dateParam) ? dateParam : defaultDate;
  const [isPanelOpen, setIsPanelOpen] = useState(false);

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
    resetEntry,
    setNote,
    loading,
    error,
    actionError,
    isSaving,
  } = useDailyChecklist(initialDate);

  const counts = STATUS_LIST.reduce(
    (acc, status) => {
      acc[status] = allEntries.filter((entry) => entry.status === status).length;
      return acc;
    },
    {} as Record<HabitStatus, number>,
  );

  const completedCount = counts.completed;
  const totalCount = allEntries.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentStreak = calculateCurrentAggregateStreak();
  const personalRecord = calculateBestAggregateStreak();

  return (
    <div className="flex flex-col gap-5">
      <MotivationHeader
        userName={mockUser.name}
        date={selectedDate}
        onPrevious={goToPreviousDay}
        onNext={goToNextDay}
        onToday={goToToday}
        completionPercentage={completionPercentage}
        completedCount={completedCount}
        totalCount={totalCount}
        currentStreak={currentStreak}
        personalRecord={personalRecord}
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : allEntries.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={22} aria-hidden="true" />}
          title="No hay hábitos programados para este día"
          description="Prueba con otra fecha o crea un nuevo hábito desde Mis hábitos."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Tu checklist de hoy</h2>
                <p className="text-sm text-text-secondary">Marca tus hábitos conforme los completes.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPanelOpen((current) => !current)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-strong hover:bg-surface-muted xl:hidden"
              >
                <SlidersHorizontal size={13} aria-hidden="true" />
                Asistente IA
              </button>
            </div>

            <StatusFilter value={statusFilter} onChange={setStatusFilter} counts={counts} />

            {filteredEntries.length === 0 ? (
              <EmptyState
                icon={<ListChecks size={22} aria-hidden="true" />}
                title="No hay hábitos con este estado"
                description="Ajusta el filtro para ver el resto de tus hábitos del día."
              />
            ) : (
              <motion.div className="flex flex-col gap-3" variants={listVariants} initial="hidden" animate="show">
                {filteredEntries.map((entry) => (
                  <motion.div key={entry.habit.id} variants={itemVariants}>
                    <HabitMissionCard
                      entry={entry}
                      onBooleanChange={(status) => setBooleanStatus(entry.habit, status)}
                      onValueChange={(value) => setValue(entry.habit, value)}
                      onTimeChange={(time) => setRecordedTime(entry.habit, time)}
                      onMarkNotApplicable={() => markNotApplicable(entry.habit)}
                      onReset={() => resetEntry(entry.habit)}
                      onSaveNote={(note) => setNote(entry.habit, note)}
                      isSaving={isSaving(entry.habit.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          <div className="hidden xl:block">
            <AIAssistantPanel entries={allEntries} date={selectedDate} />
          </div>

          <AnimatePresence initial={false}>
            {isPanelOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden xl:hidden"
              >
                <AIAssistantPanel entries={allEntries} date={selectedDate} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
