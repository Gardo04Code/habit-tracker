import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Target } from "lucide-react";
import type { Goal } from "../types/goal";
import { useGoals } from "../hooks/useGoals";
import { useHabits } from "../hooks/useHabits";
import { AppError } from "../lib/errors";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Tabs } from "../components/ui/Tabs";
import { GoalGeneralHero } from "../components/goals/GoalGeneralHero";
import { GoalListRow } from "../components/goals/GoalListRow";
import { GoalStatusTabs, type GoalStatusFilter } from "../components/goals/GoalStatusTabs";
import { GoalFormModal, type GoalFormSubmission, type GoalHabitOption } from "../components/goals/GoalFormModal";

type LifecycleFilter = "active" | "paused" | "deleted";

const LIFECYCLE_TABS = [
  { value: "active", label: "Activas" },
  { value: "paused", label: "Pausadas" },
  { value: "deleted", label: "Papelera" },
];

function errorMessage(caught: unknown): string {
  if (caught instanceof AppError) return caught.friendlyMessage;
  return caught instanceof Error ? caught.message : "Ocurrió un error inesperado. Intenta de nuevo.";
}

export function GoalsPage() {
  const {
    activeGoals,
    pausedGoals,
    deletedGoals,
    loading,
    error,
    createGoal,
    updateGoal,
    updateManualGoalProgress,
    pauseGoal,
    reactivateGoal,
    softDeleteGoal,
    restoreGoal,
  } = useGoals();
  // useHabits() ya alterna mock/Supabase — ni esta página ni GoalFormModal
  // importan mocks de hábitos directamente.
  const { habits } = useHabits();

  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("active");
  const [formGoal, setFormGoal] = useState<Goal | "new" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const habitOptions: GoalHabitOption[] = useMemo(
    () =>
      habits
        .filter((habit) => habit.lifecycleStatus === "active")
        .map((habit) => ({ id: habit.id, name: habit.name, goalType: habit.goalType })),
    [habits],
  );

  function habitFor(goal: Goal) {
    return goal.habitId ? habits.find((habit) => habit.id === goal.habitId) : undefined;
  }

  const lifecycleGoals =
    lifecycleFilter === "active" ? activeGoals : lifecycleFilter === "paused" ? pausedGoals : deletedGoals;

  const generalGoals = lifecycleGoals.filter((goal) => !goal.habitId);
  const habitGoals = lifecycleGoals.filter((goal) => goal.habitId);

  const counts = useMemo(() => {
    const base: Record<GoalStatusFilter, number> = { all: habitGoals.length, active: 0, completed: 0, expired: 0 };
    habitGoals.forEach((goal) => {
      base[goal.status] += 1;
    });
    return base;
  }, [habitGoals]);

  const lifecycleCounts = { active: activeGoals.length, paused: pausedGoals.length, deleted: deletedGoals.length };

  const visibleHabitGoals = habitGoals.filter((goal) => statusFilter === "all" || goal.status === statusFilter);

  const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
  const rowVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

  async function handleSubmit(draft: GoalFormSubmission) {
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (formGoal && formGoal !== "new") {
        await updateGoal(formGoal.id, {
          title: draft.title,
          description: draft.description,
          targetValue: draft.targetValue,
          unit: draft.unit,
          startDate: draft.startDate,
          endDate: draft.endDate,
          habitId: draft.progressSource === "habit_logs" ? draft.habitId : undefined,
        });
        if (draft.progressSource === "manual" && draft.currentValue !== undefined) {
          await updateManualGoalProgress(formGoal.id, draft.currentValue);
        }
      } else {
        await createGoal({
          title: draft.title,
          description: draft.description,
          targetValue: draft.targetValue,
          unit: draft.unit,
          startDate: draft.startDate,
          endDate: draft.endDate,
          progressSource: draft.progressSource,
          habitId: draft.habitId,
          currentValue: draft.currentValue,
        });
      }
      setFormGoal(null);
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runAction(id: string, action: (id: string) => Promise<Goal>) {
    setSavingId(id);
    setActionError(null);
    try {
      await action(id);
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setSavingId(null);
    }
  }

  function actionsFor(goal: Goal) {
    return {
      onPause: goal.lifecycleStatus !== "paused" ? () => runAction(goal.id, pauseGoal) : undefined,
      onReactivate: goal.lifecycleStatus === "paused" ? () => runAction(goal.id, reactivateGoal) : undefined,
      onDelete: () => runAction(goal.id, softDeleteGoal),
      onRestore: () => runAction(goal.id, restoreGoal),
      onEdit: () => setFormGoal(goal),
      isSaving: savingId === goal.id,
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Metas"
        description="Define objetivos medibles generales o por hábito y sigue tu progreso."
        action={
          <Button leadingIcon={<Plus size={16} />} onClick={() => setFormGoal("new")}>
            Crear meta
          </Button>
        }
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <Tabs
        value={lifecycleFilter}
        onChange={(value) => setLifecycleFilter(value as LifecycleFilter)}
        items={LIFECYCLE_TABS.map((tab) => ({ ...tab, count: lifecycleCounts[tab.value as LifecycleFilter] }))}
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <>
          {generalGoals.length === 0 ? (
            <EmptyState
              icon={<Target size={20} aria-hidden="true" />}
              title={lifecycleFilter === "active" ? "No tienes una meta general" : "No hay metas generales aquí"}
              description={
                lifecycleFilter === "active"
                  ? "Crea una meta sin hábito asociado para fijar un objetivo global del mes."
                  : "Ajusta el filtro para ver otras metas."
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {generalGoals.map((goal) => (
                <GoalGeneralHero
                  key={goal.id}
                  goal={goal}
                  sectionDescription="Objetivo global de constancia."
                  {...actionsFor(goal)}
                />
              ))}
            </div>
          )}

          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeader title="Metas por hábito" description="Objetivos asociados a un hábito específico." />
              <GoalStatusTabs value={statusFilter} onChange={setStatusFilter} counts={counts} />
            </div>

            {visibleHabitGoals.length === 0 ? (
              <EmptyState
                icon={<Target size={20} aria-hidden="true" />}
                title="No hay metas en esta vista"
                description="Ajusta el filtro o crea una nueva meta asociada a un hábito."
              />
            ) : (
              <Card padded={false} className="overflow-hidden" key={`${lifecycleFilter}-${statusFilter}`} variants={listVariants} initial="hidden" animate="show">
                {visibleHabitGoals.map((goal) => (
                  <motion.div key={goal.id} variants={rowVariants}>
                    <GoalListRow goal={goal} habit={habitFor(goal)} {...actionsFor(goal)} />
                  </motion.div>
                ))}
              </Card>
            )}
          </section>
        </>
      )}

      <GoalFormModal
        isOpen={formGoal !== null}
        goal={formGoal && formGoal !== "new" ? formGoal : undefined}
        habitOptions={habitOptions}
        onClose={() => setFormGoal(null)}
        onSubmit={handleSubmit}
        isSaving={isSubmitting}
      />
    </div>
  );
}
