import { useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";
import type { Goal } from "../types/goal";
import { useGoalsManager } from "../hooks/useGoalsManager";
import { getHabitById } from "../data/mockHabits";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { GoalCard } from "../components/goals/GoalCard";
import { GoalStatusTabs, type GoalStatusFilter } from "../components/goals/GoalStatusTabs";
import { GoalFormModal } from "../components/goals/GoalFormModal";

export function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal, markCompleted, markExpired, reactivate } = useGoalsManager();
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>("all");
  const [formGoal, setFormGoal] = useState<Goal | "new" | null>(null);

  const generalGoals = goals.filter((goal) => !goal.habitId);
  const habitGoals = goals.filter((goal) => goal.habitId);

  const counts = useMemo(() => {
    const base: Record<GoalStatusFilter, number> = { all: habitGoals.length, active: 0, completed: 0, expired: 0 };
    habitGoals.forEach((goal) => {
      base[goal.status] += 1;
    });
    return base;
  }, [habitGoals]);

  const visibleHabitGoals = habitGoals.filter((goal) => statusFilter === "all" || goal.status === statusFilter);

  function handleSubmit(draft: Parameters<typeof addGoal>[0]) {
    if (formGoal && formGoal !== "new") {
      updateGoal(formGoal.id, draft);
    } else {
      addGoal(draft);
    }
  }

  function actionsFor(goal: Goal) {
    return {
      onMarkCompleted: goal.status === "active" ? () => markCompleted(goal.id) : undefined,
      onMarkExpired: goal.status === "active" ? () => markExpired(goal.id) : undefined,
      onReactivate: goal.status !== "active" ? () => reactivate(goal.id) : undefined,
      onDelete: () => deleteGoal(goal.id),
      onEdit: () => setFormGoal(goal),
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

      <section className="flex flex-col gap-3">
        <SectionHeader title="Meta general" description="Objetivo global de constancia." />
        {generalGoals.length === 0 ? (
          <EmptyState
            icon={<Target size={20} aria-hidden="true" />}
            title="No tienes una meta general"
            description="Crea una meta sin hábito asociado para fijar un objetivo global del mes."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {generalGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} habit={undefined} {...actionsFor(goal)} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Metas por hábito" description="Objetivos asociados a un hábito específico." />
        <GoalStatusTabs value={statusFilter} onChange={setStatusFilter} counts={counts} />

        {visibleHabitGoals.length === 0 ? (
          <EmptyState
            icon={<Target size={20} aria-hidden="true" />}
            title="No hay metas en esta vista"
            description="Ajusta el filtro o crea una nueva meta asociada a un hábito."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleHabitGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} habit={getHabitById(goal.habitId!)} {...actionsFor(goal)} />
            ))}
          </div>
        )}
      </section>

      <GoalFormModal
        isOpen={formGoal !== null}
        goal={formGoal && formGoal !== "new" ? formGoal : undefined}
        onClose={() => setFormGoal(null)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
