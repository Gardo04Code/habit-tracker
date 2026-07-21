import { useMemo, useState } from "react";
import { Plus, Repeat } from "lucide-react";
import type { Habit, HabitLifecycleStatus } from "../types/habit";
import { useHabitsManager } from "../hooks/useHabitsManager";
import { calculateRecentCompletionRate } from "../utils/recentCompletion";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { HabitStatusTabs } from "../components/habits/HabitStatusTabs";
import { HabitFilters } from "../components/habits/HabitFilters";
import { HabitCard } from "../components/habits/HabitCard";
import { HabitFormModal } from "../components/habits/HabitFormModal";
import { DeleteHabitModal, type DeleteHabitOption } from "../components/habits/DeleteHabitModal";

export function HabitsPage() {
  const {
    habits,
    addHabit,
    updateHabit,
    isNameTaken,
    pauseHabit,
    reactivateHabit,
    archiveHabit,
    softDeleteHabit,
    restoreHabit,
    hardDeleteHabit,
  } = useHabitsManager();

  const [activeTab, setActiveTab] = useState<HabitLifecycleStatus>("active");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [formHabit, setFormHabit] = useState<Habit | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);

  const counts = useMemo(
    () => ({
      active: habits.filter((h) => h.lifecycleStatus === "active").length,
      paused: habits.filter((h) => h.lifecycleStatus === "paused").length,
      archived: habits.filter((h) => h.lifecycleStatus === "archived").length,
      deleted: habits.filter((h) => h.lifecycleStatus === "deleted").length,
    }),
    [habits],
  );

  const visibleHabits = habits.filter((habit) => {
    if (habit.lifecycleStatus !== activeTab) return false;
    if (search.trim() && !habit.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (categoryId !== "all" && !habit.categoryIds.includes(categoryId)) return false;
    return true;
  });

  function handleFormSubmit(draft: Parameters<typeof addHabit>[0]) {
    if (formHabit && formHabit !== "new") {
      updateHabit(formHabit.id, draft);
    } else {
      addHabit(draft);
    }
  }

  function handleDeleteConfirm(option: DeleteHabitOption) {
    if (!deleteTarget) return;
    if (option === "archive") archiveHabit(deleteTarget.id);
    if (option === "delete_habit") softDeleteHabit(deleteTarget.id);
    if (option === "delete_habit_and_logs") hardDeleteHabit(deleteTarget.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Mis hábitos"
        description="Crea, edita y administra el ciclo de vida de tus hábitos."
        action={
          <Button leadingIcon={<Plus size={16} />} onClick={() => setFormHabit("new")}>
            Crear hábito
          </Button>
        }
      />

      <HabitFilters search={search} onSearchChange={setSearch} categoryId={categoryId} onCategoryChange={setCategoryId} />
      <HabitStatusTabs value={activeTab} onChange={setActiveTab} counts={counts} />

      {visibleHabits.length === 0 ? (
        <EmptyState
          icon={<Repeat size={22} aria-hidden="true" />}
          title="No hay hábitos en esta vista"
          description="Ajusta los filtros o crea un nuevo hábito para empezar a darle seguimiento."
          action={
            activeTab === "active" ? (
              <Button size="sm" leadingIcon={<Plus size={16} />} onClick={() => setFormHabit("new")}>
                Crear hábito
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              recentCompletionRate={calculateRecentCompletionRate(habit.id)}
              onEdit={() => setFormHabit(habit)}
              onPause={activeTab === "active" ? () => pauseHabit(habit.id) : undefined}
              onReactivate={activeTab === "paused" || activeTab === "archived" ? () => reactivateHabit(habit.id) : undefined}
              onArchive={activeTab === "active" || activeTab === "paused" ? () => archiveHabit(habit.id) : undefined}
              onDelete={activeTab !== "deleted" ? () => setDeleteTarget(habit) : undefined}
              onRestore={activeTab === "deleted" ? () => restoreHabit(habit.id) : undefined}
              onHardDelete={activeTab === "deleted" ? () => hardDeleteHabit(habit.id) : undefined}
            />
          ))}
        </div>
      )}

      <HabitFormModal
        isOpen={formHabit !== null}
        habit={formHabit && formHabit !== "new" ? formHabit : undefined}
        isNameTaken={isNameTaken}
        onClose={() => setFormHabit(null)}
        onSubmit={handleFormSubmit}
      />

      <DeleteHabitModal
        isOpen={deleteTarget !== null}
        habitName={deleteTarget?.name ?? ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
