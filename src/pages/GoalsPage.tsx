import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Target } from "lucide-react";
import type { Goal } from "../types/goal";
import { useGoalsManager } from "../hooks/useGoalsManager";
import { getHabitById } from "../data/mockHabits";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { GoalGeneralHero } from "../components/goals/GoalGeneralHero";
import { GoalListRow } from "../components/goals/GoalListRow";
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

  const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
  const rowVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

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

      {generalGoals.length === 0 ? (
        <EmptyState
          icon={<Target size={20} aria-hidden="true" />}
          title="No tienes una meta general"
          description="Crea una meta sin hábito asociado para fijar un objetivo global del mes."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {generalGoals.map((goal) => (
            <GoalGeneralHero key={goal.id} goal={goal} sectionDescription="Objetivo global de constancia." />
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
          <Card padded={false} className="overflow-hidden" key={statusFilter} variants={listVariants} initial="hidden" animate="show">
            {visibleHabitGoals.map((goal) => (
              <motion.div key={goal.id} variants={rowVariants}>
                <GoalListRow goal={goal} habit={getHabitById(goal.habitId!)} {...actionsFor(goal)} />
              </motion.div>
            ))}
          </Card>
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
